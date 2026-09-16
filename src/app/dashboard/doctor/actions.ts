// src/app/dashboard/doctor/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { encryptAndCompressBuffer, decryptAndDecompressBuffer } from '@/lib/secureStorage';

// Initialize Supabase client with service role priority for private bucket operations/decryption
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase URL or Key missing in actions.ts environment!');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// ==========================================
// SUBSCRIPTION & TRIAL HELPER ACTIONS
// ==========================================

// Ensure legacy or null trial accounts fallback to 30 days from creation
export async function ensureTrialEndDate(user: { id: string; createdAt: Date; subStatus: string; trialEndsAt: Date | null }) {
  if (user.subStatus === 'TRIAL' && !user.trialEndsAt) {
    const fallbackTrialEnd = new Date(user.createdAt);
    fallbackTrialEnd.setDate(fallbackTrialEnd.getDate() + 30);
    return await prisma.user.update({
      where: { id: user.id },
      data: { trialEndsAt: fallbackTrialEnd },
    });
  }
  return user;
}

// Calculate exact subscription end date based on plan type (must be async because of 'use server')
export async function calculateSubscriptionEndDate(
  planType: 'MONTHLY' | 'HALFYEAR' | 'YEARLY' | 'LIFETIME',
  baseDate: Date = new Date()
): Promise<Date | null> {
  const targetDate = new Date(baseDate);

  switch (planType) {
    case 'MONTHLY':
      targetDate.setDate(targetDate.getDate() + 30);
      return targetDate;
    case 'HALFYEAR':
      targetDate.setMonth(targetDate.getMonth() + 6);
      return targetDate;
    case 'YEARLY':
      targetDate.setDate(targetDate.getDate() + 365);
      return targetDate;
    case 'LIFETIME':
      return null; // Always active / no expiration
    default:
      targetDate.setDate(targetDate.getDate() + 30);
      return targetDate;
  }
}

// Automatically activate or stack subscription expiration dates
export async function activateSubscriptionAutomatically(userId: string, planType: 'MONTHLY' | 'HALFYEAR' | 'YEARLY' | 'LIFETIME') {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { subEndsAt: true, subStatus: true },
    });

    // If user already has an active future subscription, stack/extend from it. Otherwise start from now.
    const baseDate =
      currentUser?.subEndsAt && currentUser.subEndsAt > new Date()
        ? currentUser.subEndsAt
        : new Date();

    const newSubEndsAt = await calculateSubscriptionEndDate(planType, baseDate);

    await prisma.user.update({
      where: { id: userId },
      data: {
        subStatus: 'ACTIVE',
        subEndsAt: newSubEndsAt,
      },
    });

    revalidatePath('/dashboard/doctor');
    return { success: true };
  } catch (error) {
    console.error('Failed to activate subscription:', error);
    return { success: false, error: 'Subscription activation failed.' };
  }
}

// ==========================================
// SERVER ACTIONS
// ==========================================

// 0. Register/Signup a new Doctor with explicit Trial status initialization
export async function registerDoctorAction(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string; // Ensure you hash this in production

    if (!email || !name || !password) {
      return { success: false, error: 'All fields are required.' };
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // Calculate exact 30-day trial expiration date
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    // Create user with explicit schema fields for trial management
    await prisma.user.create({
      data: {
        name,
        email,
        password,
        role: 'DOCTOR',
        subStatus: 'TRIAL',
        trialEndsAt: trialEndsAt, // Explicitly saved now
        createdAt: new Date(),
      },
    });

    // Set user session cookie so they land straight into the dashboard
    const cookieStore = await cookies();
    cookieStore.set('userEmail', email, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    return { success: true };
  } catch (error) {
    console.error('Failed to register doctor:', error);
    return { success: false, error: 'Registration failed.' };
  }
}

// 1. Book a new appointment (Status: SCHEDULED)
export async function bookAppointmentAction(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const age = parseInt(formData.get('age') as string);
    const gender = formData.get('gender') as string;
    const doctorId = formData.get('doctorId') as string;
    const consultationFee = parseFloat(formData.get('consultationFee') as string) || 1000;

    // Find or create patient by phone number uniqueness
    let patient = await prisma.patient.findUnique({ where: { phone } });

    if (!patient) {
      const count = await prisma.patient.count();
      const customId = `P-${101 + count}`;
      patient = await prisma.patient.create({
        data: { name, phone, age, gender, customId },
      });
    }

    // Create the Visit record as SCHEDULED
    await prisma.visit.create({
      data: {
        patientId: patient.id,
        doctorId: doctorId || null,
        consultationFee,
        feePaid: 0,
        dues: consultationFee,
        status: 'SCHEDULED',
      },
    });

    revalidatePath('/dashboard/doctor/appointments');
    revalidatePath('/dashboard/doctor');
    return { success: true };
  } catch (error) {
    console.error('Failed to book appointment:', error);
    return { success: false, error: 'Failed to create appointment.' };
  }
}

// 2. Record Vitals & Check-in: Saves vitals/symptoms and moves status from SCHEDULED to WAITING (Live Queue)
export async function recordVitalsAndCheckInAction(visitId: string, formData: FormData) {
  try {
    const bloodPressure = formData.get('bloodPressure') as string;
    const weight = formData.get('weight') as string;
    const height = formData.get('height') as string;
    const temperature = formData.get('temperature') as string;
    const pulse = formData.get('pulse') as string;
    const symptoms = formData.get('symptoms') as string;

    await prisma.visit.update({
      where: { id: visitId },
      data: {
        bloodPressure,
        weight,
        height,
        temperature,
        pulse,
        symptoms,
        status: 'WAITING',
      },
    });

    revalidatePath('/dashboard/doctor/appointments');
    revalidatePath('/dashboard/doctor');
    return { success: true };
  } catch (error) {
    console.error('Failed to record vitals and check-in:', error);
    return { success: false, error: 'Failed to check-in patient.' };
  }
}

// 3. Save prescription, diagnosis, tests, test reports, and update financials
export async function savePrescriptionAction(data: {
  visitId: string;
  diagnosis: string;
  medicines: string;
  advice: string;
  tests?: string;
  testReports?: string;
  feePaid?: number;
}) {
  try {
    await prisma.prescription.upsert({
      where: { visitId: data.visitId },
      update: {
        medicines: data.medicines,
        advice: data.advice,
        tests: data.tests,
        testReports: data.testReports,
      },
      create: {
        visitId: data.visitId,
        medicines: data.medicines,
        advice: data.advice,
        tests: data.tests,
        testReports: data.testReports,
      },
    });

    let visitUpdateData: any = {
      status: 'COMPLETED',
      diagnosis: data.diagnosis
    };

    if (data.feePaid !== undefined) {
      const visit = await prisma.visit.findUnique({ where: { id: data.visitId } });
      if (visit) {
        const consultationFee = visit.consultationFee;
        const newDues = Math.max(0, consultationFee - data.feePaid);

        visitUpdateData.feePaid = data.feePaid;
        visitUpdateData.dues = newDues;
      }
    }

    await prisma.visit.update({
      where: { id: data.visitId },
      data: visitUpdateData,
    });

    revalidatePath('/dashboard/doctor');
    return { success: true };
  } catch (error) {
    console.error('Failed to save prescription and financials:', error);
    return { success: false, error: 'Database update failed.' };
  }
}

// 4. Fetch only unique patients and history belonging to the logged-in doctor
export async function getAllPatientsHistoryAction() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('userEmail')?.value;
    if (!userEmail) return { success: false, patients: [] };

    let activeDoctor = await prisma.user.findUnique({
      where: { email: userEmail },
    });
    if (!activeDoctor || activeDoctor.role !== 'DOCTOR') {
      return { success: false, patients: [] };
    }

    // Auto-fix null trial dates for existing legacy accounts
    activeDoctor = await ensureTrialEndDate(activeDoctor);

    const patients = await prisma.patient.findMany({
      where: {
        visits: {
          some: {
            doctorId: activeDoctor.id,
          },
        },
      },
      include: {
        visits: {
          where: {
            doctorId: activeDoctor.id,
          },
          include: {
            prescription: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return { success: true, patients };
  } catch (error) {
    console.error('Failed to fetch patient histories:', error);
    return { success: false, patients: [] };
  }
}

// 5. Merge duplicate patient profiles (e.g. fix duplicate entries or name/phone typos)
export async function mergePatientsAction(targetPatientId: string, sourcePatientId: string) {
  try {
    if (targetPatientId === sourcePatientId) {
      return { success: false, error: 'Cannot merge a patient into themselves.' };
    }

    // Reassign all visits from the source (duplicate) profile to the primary target profile
    await prisma.visit.updateMany({
      where: { patientId: sourcePatientId },
      data: { patientId: targetPatientId },
    });

    // Delete the empty duplicate patient profile record
    await prisma.patient.delete({
      where: { id: sourcePatientId },
    });

    revalidatePath('/dashboard/doctor');
    revalidatePath('/dashboard/doctor/patients');
    return { success: true };
  } catch (error) {
    console.error('Failed to merge patients:', error);
    return { success: false, error: 'Failed to merge patient records.' };
  }
}

// 6. Generate Cloud Storage Signed URL for direct client-side uploads (Prevents Next.js 1MB Limit Errors)
export async function getPresignedUploadUrlAction(fileName: string, fileType: string) {
  try {
    if (!supabaseUrl) {
      throw new Error('Supabase URL is missing from environment variables.');
    }

    const uniqueFileName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
    const bucketName = 'medical-reports';

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUploadUrl(uniqueFileName);

    if (error || !data) {
      console.error('Storage sign error:', error);
      return { success: false, error: error?.message || 'Failed to generate upload URL.' };
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uniqueFileName);

    return {
      success: true,
      signedUrl: data.signedUrl,
      filePath: publicUrlData.publicUrl,
    };
  } catch (error: any) {
    console.error('Presigned URL generation error:', error);
    return { success: false, error: error.message || 'Failed to initialize file upload.' };
  }
}

// 7. Fetch allowed doctors for the appointment dropdown based on current user role
export async function getAvailableDoctorsAction() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('userEmail')?.value;

    if (!userEmail) {
      return { success: false, doctors: [] };
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!currentUser) {
      return { success: false, doctors: [] };
    }

    // If a DOCTOR is logged in, they can only select themselves
    if (currentUser.role === 'DOCTOR') {
      return {
        success: true,
        doctors: [{ id: currentUser.id, name: currentUser.name }]
      };
    }

    // If a RECEPTIONIST or ADMIN is logged in, fetch all doctors
    if (currentUser.role === 'RECEPTIONIST' || currentUser.role === 'ADMIN') {
      const doctors = await prisma.user.findMany({
        where: { role: 'DOCTOR' },
        select: { id: true, name: true },
      });
      return { success: true, doctors };
    }

    return { success: true, doctors: [] };
  } catch (error) {
    console.error('Failed to fetch available doctors:', error);
    return { success: false, doctors: [] };
  }
}

// 8. Securely compress, encrypt, and upload medical records to Supabase
export async function uploadSecureMedicalRecordAction(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    const patientId = formData.get('patientId') as string;
    const recordType = formData.get('recordType') as string; // 'PRESCRIPTION' or 'REPORT'

    if (!file || !patientId) {
      return { success: false, error: 'Missing file or patient reference.' };
    }

    // Safety check: Verify the parent patient record actually exists first
    const patientExists = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patientExists) {
      return {
        success: false,
        error: 'The selected patient record does not exist or was removed. Please refresh.'
      };
    }

    if (!supabaseUrl) {
      throw new Error('Supabase URL is missing from environment variables.');
    }

    // 1. Convert the uploaded file to a Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 2. Compress and encrypt the buffer using AES-256-GCM
    const { encryptedData, iv, authTag } = encryptAndCompressBuffer(fileBuffer);

    // 3. Package the encrypted components into a single JSON payload buffer
    const encryptedPayload = JSON.stringify({ encryptedData, iv, authTag });
    const payloadBuffer = Buffer.from(encryptedPayload, 'utf-8');

    // 4. Define a unique file path in your secure bucket
    const uniqueFileName = `${patientId}/${Date.now()}-${file.name}.enc`;
    const bucketName = 'medical-reports';

    // 5. Upload the encrypted payload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(uniqueFileName, payloadBuffer, {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // 6. Save the file reference path and details to Prisma safely
    const record = await prisma.medicalRecord.create({
      data: {
        patientId,
        recordType: recordType || 'REPORT',
        fileName: file.name,
        filePath: uniqueFileName,
      },
    });

    revalidatePath('/dashboard/doctor');
    return { success: true, recordId: record.id };
  } catch (error: any) {
    console.error('Secure upload execution error:', error);
    return { success: false, error: error.message || 'Failed to securely upload file.' };
  }
}

// 9. Securely fetch, decrypt, and return a medical report by record ID
export async function getSecureMedicalRecordAction(recordId: string) {
  try {
    const record = await prisma.medicalRecord.findUnique({
      where: { id: recordId },
    });

    if (!record || !record.filePath) {
      return { success: false, error: 'Record not found.' };
    }

    const bucketName = 'medical-reports';

    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(record.filePath);

    if (error || !data) {
      console.error('Download error:', error);
      return { success: false, error: 'Failed to retrieve file from storage.' };
    }

    const textContent = await data.text();
    const { encryptedData, iv, authTag } = JSON.parse(textContent);
    const decryptedBuffer = decryptAndDecompressBuffer(encryptedData, iv, authTag);

    return {
      success: true,
      fileName: record.fileName,
      fileData: decryptedBuffer.toString('base64'),
    };
  } catch (error: any) {
    console.error('Decryption execution error:', error);
    return { success: false, error: 'Failed to securely decrypt file.' };
  }
}

// 10. Save or update monthly chamber rent for the logged-in doctor
export async function saveChamberRentAction(formData: FormData) {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('userEmail')?.value;
    if (!userEmail) return { success: false, error: 'Unauthorized' };

    const doctor = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!doctor || doctor.role !== 'DOCTOR') {
      return { success: false, error: 'Doctor profile not found.' };
    }

    const month = formData.get('month') as string; // Format: "YYYY-MM"
    const rentAmount = parseFloat(formData.get('rentAmount') as string) || 0;
    const utilitiesAmount = parseFloat(formData.get('utilitiesAmount') as string) || 0;
    const staffSalaryShare = parseFloat(formData.get('staffSalaryShare') as string) || 0;
    const notes = formData.get('notes') as string;
    const isPaid = formData.get('isPaid') === 'true';

    await prisma.chamberRent.upsert({
      where: {
        doctorId_month: {
          doctorId: doctor.id,
          month,
        },
      },
      update: {
        rentAmount,
        utilitiesAmount,
        staffSalaryShare,
        totalAmount: rentAmount + utilitiesAmount + staffSalaryShare,
        notes,
        isPaid,
      },
      create: {
        doctorId: doctor.id,
        month,
        rentAmount,
        utilitiesAmount,
        staffSalaryShare,
        totalAmount: rentAmount + utilitiesAmount + staffSalaryShare,
        notes,
        isPaid,
      },
    });

    revalidatePath('/dashboard/doctor');
    return { success: true };
  } catch (error) {
    console.error('Failed to save chamber rent:', error);
    return { success: false, error: 'Failed to save chamber rent record.' };
  }
}

// 11. Fetch all chamber rent records for the logged-in doctor
export async function getChamberRentHistoryAction() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('userEmail')?.value;
    if (!userEmail) return { success: false, rents: [] };

    const doctor = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!doctor || doctor.role !== 'DOCTOR') {
      return { success: false, rents: [] };
    }

    const rents = await prisma.chamberRent.findMany({
      where: { doctorId: doctor.id },
      orderBy: { month: 'desc' },
    });

    return { success: true, rents };
  } catch (error) {
    console.error('Failed to fetch chamber rents:', error);
    return { success: false, rents: [] };
  }
}

// 12. Decrypt or read a file directly from a storage path (handles both encrypted payloads and raw files/PDFs)
export async function getDecryptedReportByPathAction(filePath: string) {
  try {
    const cleanPath = filePath
      .replace(/^https?:\/\/.*\/storage\/v1\/object\/public\/medical-reports\//, '')
      .replace(/^medical-reports\//, '');

    const bucketName = 'medical-reports';
    console.log('=== DEBUG STORAGE DOWNLOAD ===', { supabaseUrl, bucketName, originalPath: filePath, cleanPath });

    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(cleanPath);

    if (error || !data) {
      console.error('=== SUPABASE DOWNLOAD ERROR ===', error);
      return { success: false, error: error?.message || 'Failed to retrieve file from bucket.' };
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try parsing as our custom encrypted JSON package
    try {
      const textContent = buffer.toString('utf-8');
      const parsed = JSON.parse(textContent);

      if (parsed.encryptedData && parsed.iv && parsed.authTag) {
        const decryptedBuffer = decryptAndDecompressBuffer(parsed.encryptedData, parsed.iv, parsed.authTag);
        return {
          success: true,
          fileName: cleanPath.split('/').pop() || 'report.pdf',
          fileData: decryptedBuffer.toString('base64'),
        };
      }
    } catch (_e) {
      // Not an encrypted JSON object — fallback to raw binary (e.g. standard uploaded PDFs or images)
    }

    return {
      success: true,
      fileName: cleanPath.split('/').pop() || 'report.pdf',
      fileData: buffer.toString('base64'),
    };
  } catch (error: any) {
    console.error('Path decryption execution error:', error);
    return { success: false, error: 'Failed to open report from path.' };
  }
}
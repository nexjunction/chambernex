// src/app/dashboard/receptionist/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function registerPatientAction(formData: FormData) {
  // 1. Identify the logged-in receptionist via session cookie
  const cookieStore = await cookies();
  const userEmail = cookieStore.get('userEmail')?.value;

  if (!userEmail) {
    return { success: false, error: 'Unauthorized. Please log in again.' };
  }

  const receptionist = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!receptionist || receptionist.role !== 'RECEPTIONIST') {
    return { success: false, error: 'Unauthorized user role.' };
  }

  const name = (formData.get('name') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim();
  const emergencyPhone = (formData.get('emergencyPhone') as string)?.trim();
  const sex = formData.get('sex') as string;
  const doctorId = (formData.get('doctorId') as string)?.trim();
  const ageStr = formData.get('age') as string;
  const consultationFeeStr = formData.get('consultationFee') as string;
  const feePaidStr = formData.get('feePaid') as string;

  const bloodPressure = (formData.get('bloodPressure') as string)?.trim();
  const weight = (formData.get('weight') as string)?.trim();
  const height = (formData.get('height') as string)?.trim();
  const temperature = (formData.get('temperature') as string)?.trim();
  const pulse = (formData.get('pulse') as string)?.trim();

  // --- VALIDATIONS ---
  if (!name || name.length < 2) {
    return { success: false, error: 'Please enter a valid full name (at least 2 characters).' };
  }

  const phoneRegex = /^\+?[0-9]{10,15}$/;
  if (!phone || !phoneRegex.test(phone)) {
    return { success: false, error: 'Phone number must contain numbers only (10 to 15 digits).' };
  }

  if (emergencyPhone && !phoneRegex.test(emergencyPhone)) {
    return { success: false, error: 'Emergency contact must contain numbers only (10 to 15 digits).' };
  }

  const numericOnlyRegex = /^[0-9]+(\.[0-9]+)?$/;

  if (!numericOnlyRegex.test(ageStr)) {
    return { success: false, error: 'Age must contain numbers only.' };
  }
  const age = Number(ageStr);
  if (age < 0 || age > 120) {
    return { success: false, error: 'Please enter a realistic age between 0 and 120.' };
  }

  if (!numericOnlyRegex.test(consultationFeeStr)) {
    return { success: false, error: 'Consultation fee must contain numbers only.' };
  }
  const consultationFee = Number(consultationFeeStr);

  if (!numericOnlyRegex.test(feePaidStr)) {
    return { success: false, error: 'Amount collected must contain numbers only.' };
  }
  const feePaid = Number(feePaidStr);

  if (feePaid > consultationFee) {
    return { success: false, error: 'Fee paid cannot exceed the total consultation fee.' };
  }

  // Vitals are optional on phone booking, but validated if provided
  const bpRegex = /^[0-9]{2,3}\/[0-9]{2,3}$/;
  if (bloodPressure && !bpRegex.test(bloodPressure)) {
    return { success: false, error: 'Invalid Blood Pressure format (e.g., 120/80).' };
  }

  const weightRegex = /^[0-9]+(\.[0-9]+)?\s*(kg|lbs)?$/i;
  if (weight && !weightRegex.test(weight)) {
    return { success: false, error: 'Invalid Weight format (e.g., 68 kg).' };
  }

  const heightRegex = /^([0-9]+\s*(ft|in|cm|\'|\"))+(\s*[0-9]+\s*(in)?)?$/i;
  if (height && !heightRegex.test(height)) {
    return { success: false, error: 'Invalid Height format (e.g., 5 ft 7 in).' };
  }

  const tempRegex = /^[0-9]+(\.[0-9]+)?\s*(°?[f|c])?$/i;
  if (temperature && !tempRegex.test(temperature)) {
    return { success: false, error: 'Invalid Temperature format (e.g., 98.6°F).' };
  }

  const pulseRegex = /^[0-9]+\s*(bpm)?$/i;
  if (pulse && !pulseRegex.test(pulse)) {
    return { success: false, error: 'Invalid Pulse format (e.g., 72 bpm).' };
  }

  try {
    // 2. Verify Doctor Connection and Subscription Status (Security Check)
    if (doctorId) {
      const connection = await prisma.staffConnection.findFirst({
        where: {
          receptionistId: receptionist.id,
          doctorId: doctorId,
          status: 'APPROVED',
        },
        include: {
          doctor: {
            select: {
              id: true,
              subStatus: true,
              trialEndsAt: true,
              subEndsAt: true,
            },
          },
        },
      });

      if (!connection) {
        return { success: false, error: 'You are not connected and approved to assign patients to this doctor.' };
      }

      // --- SUBSCRIPTION & TRIAL EXPIRATION GUARD ---
      const targetDoctor = connection.doctor;
      if (targetDoctor) {
        const now = new Date();
        let isExpired = false;

        if (targetDoctor.subStatus === 'EXPIRED') {
          isExpired = true;
        } else if (targetDoctor.subStatus === 'TRIAL') {
          if (!targetDoctor.trialEndsAt || new Date(targetDoctor.trialEndsAt) < now) {
            isExpired = true;
          }
        } else if (targetDoctor.subStatus === 'ACTIVE') {
          if (targetDoctor.subEndsAt && new Date(targetDoctor.subEndsAt) < now) {
            isExpired = true;
          }
        }

        if (isExpired) {
          return {
            success: false,
            error: "Cannot book appointment. This doctor's subscription or trial has expired."
          };
        }
      }
    }

    // 3. Check if patient already exists or safely create with sequential customId
    let patient = await prisma.patient.findFirst({
      where: { phone },
    });

    if (!patient) {
      const lastPatient = await prisma.patient.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      let nextNum = 101;
      if (lastPatient && lastPatient.customId) {
        const numPart = parseInt(lastPatient.customId.replace('P-', ''));
        if (!isNaN(numPart)) nextNum = numPart + 1;
      }
      const customId = `P-${nextNum}`;

      patient = await prisma.patient.create({
        data: {
          customId,
          name,
          phone,
          emergencyPhone: emergencyPhone || null,
          gender: sex,
          age,
        },
      });
    } else {
      // Keep existing patient info updated if needed
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: {
          name,
          emergencyPhone: emergencyPhone || patient.emergencyPhone,
          gender: sex,
          age,
        },
      });
    }

    // Determine initial status: if vitals are provided right away, set to "WAITING", otherwise "SCHEDULED"
    const hasVitals = bloodPressure || weight || height || temperature || pulse;
    const visitStatus = hasVitals ? 'WAITING' : 'SCHEDULED';

    // 4. Create the visit entry tied to this patient (Only valid schema fields included)
    await prisma.visit.create({
      data: {
        patientId: patient.id,
        doctorId: doctorId || null,
        status: visitStatus,
        bloodPressure: bloodPressure || null,
        weight: weight || null,
        height: height || null,
        temperature: temperature || null,
        pulse: pulse || null,
        consultationFee,
        feePaid,
        dues: Math.max(0, consultationFee - feePaid),
        symptoms: '',
        diagnosis: '',
      },
    });

    revalidatePath('/dashboard/doctor');
    revalidatePath('/dashboard/receptionist');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to register patient/appointment:', error);
    return { success: false, error: error.message || 'Database error occurred during appointment booking.' };
  }
}
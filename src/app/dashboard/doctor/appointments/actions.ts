// src/app/dashboard/doctor/appointments/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// Book a new appointment (Status: SCHEDULED)
export async function bookAppointmentAction(formData: FormData) {
  try {
    const rawName = (formData.get('name') as string)?.trim();
    const rawPhone = (formData.get('phone') as string)?.trim();
    const age = parseInt(formData.get('age') as string) || 0;
    const gender = formData.get('gender') as string;
    const doctorId = (formData.get('doctorId') as string)?.trim();
    const consultationFee = parseFloat(formData.get('consultationFee') as string) || 1000;

    if (!rawName || rawName.length < 2) {
      return { success: false, error: 'Valid name is required.' };
    }
    if (!rawPhone || !/^\+?[0-9]{10,15}$/.test(rawPhone)) {
      return { success: false, error: 'Valid phone number is required.' };
    }

    // Find or create patient by phone number uniqueness
    let patient = await prisma.patient.findUnique({ where: { phone: rawPhone } });

    if (!patient) {
      // Safely generate sequential customId to avoid duplication clashes
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
          name: rawName,
          phone: rawPhone,
          age,
          gender,
          customId,
        },
      });
    } else {
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: { name: rawName, age, gender },
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
  } catch (error: any) {
    console.error('Failed to book appointment:', error);
    return { success: false, error: error.message || 'Failed to create appointment.' };
  }
}

// Save vitals input from the card and transition status from SCHEDULED to WAITING
export async function recordVitalsAndCheckInAction(visitId: string, formData: FormData) {
  try {
    const bloodPressure = (formData.get('bloodPressure') as string)?.trim() || null;
    const weight = (formData.get('weight') as string)?.trim() || null;
    const height = (formData.get('height') as string)?.trim() || null;
    const temperature = (formData.get('temperature') as string)?.trim() || null;
    const pulse = (formData.get('pulse') as string)?.trim() || null;

    await prisma.visit.update({
      where: { id: visitId },
      data: {
        bloodPressure,
        weight,
        height,
        temperature,
        pulse,
        status: 'WAITING', // Moves them into the active doctor queue
      },
    });

    revalidatePath('/dashboard/doctor/appointments');
    revalidatePath('/dashboard/doctor');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to record vitals and check-in:', error);
    return { success: false, error: error.message || 'Failed to check-in patient.' };
  }
}

// Simple check-in action if triggered without vitals
export async function checkInAppointmentAction(visitId: string) {
  try {
    await prisma.visit.update({
      where: { id: visitId },
      data: { status: 'WAITING' },
    });

    revalidatePath('/dashboard/doctor/appointments');
    revalidatePath('/dashboard/doctor');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to check-in:', error);
    return { success: false, error: error.message || 'Failed to check-in patient.' };
  }
}

// Helper utility used inside the appointments page to list doctors
export async function getAvailableDoctorsAction() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('userEmail')?.value;

    if (!userEmail) {
      return { success: false, error: 'Unauthorized', doctors: [] };
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return { success: false, error: 'User not found', doctors: [] };

    let doctors = [];
    if (user.role === 'DOCTOR') {
      doctors = [user];
    } else if (user.role === 'ADMIN') {
      doctors = await prisma.user.findMany({ where: { role: 'DOCTOR' } });
    } else {
      // For receptionists, query approved staff connections
      const connections = await prisma.staffConnection.findMany({
        where: { receptionistId: user.id, status: 'APPROVED' },
        include: { doctor: true },
      });
      doctors = connections.map(c => c.doctor);
    }

    return { success: true, doctors };
  } catch (error) {
    console.error('Error fetching available doctors:', error);
    return { success: false, error: 'Failed to fetch doctors', doctors: [] };
  }
}
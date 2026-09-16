// src/app/dashboard/doctor/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DoctorConsoleClient from './DoctorConsoleClient';

export default async function DoctorDashboardPage() {
  // 1. Identify the logged-in doctor via session cookie
  const cookieStore = await cookies();
  const userEmail = cookieStore.get('userEmail')?.value;

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-[#0b132b] text-white flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold text-red-400 mb-2">⚠️ Unauthorized Session</h2>
          <p className="text-sm text-slate-400">Please log in to your doctor account.</p>
        </div>
      </div>
    );
  }

  const activeDoctor = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!activeDoctor || activeDoctor.role !== 'DOCTOR') {
    return (
      <div className="min-h-screen bg-[#0b132b] text-white flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold text-red-400 mb-2">⚠️ Doctor Profile Not Found</h2>
          <p className="text-sm text-slate-400">The logged-in user is not authorized as a doctor.</p>
        </div>
      </div>
    );
  }

  // --- 30-DAY TRIAL & SUBSCRIPTION CHECK ---
  const now = new Date();

  // 1. Check if their subscription status is active
  const hasActiveSubscription = activeDoctor.subStatus === 'ACTIVE';

  // 2. Check if they are within their trial period using trialEndsAt or falling back to 30 days from createdAt
  const trialExpiry = activeDoctor.trialEndsAt
    ? new Date(activeDoctor.trialEndsAt)
    : new Date(new Date(activeDoctor.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);

  const isWithinTrial = now <= trialExpiry;

  // Only redirect to subscription if their trial has ENDED AND they haven't paid/activated
  if (!isWithinTrial && !hasActiveSubscription) {
    redirect('/subscription');
  }
  // ------------------------------------------

  // 2. Fetch strictly visits assigned specifically to this doctor profile
  const visitsFromDb = await prisma.visit.findMany({
    where: {
      doctorId: activeDoctor.id,
    },
    include: {
      patient: true,
      prescription: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // 3. Fetch chamber rent records for this doctor
  const chamberRentsFromDb = await prisma.chamberRent.findMany({
    where: {
      doctorId: activeDoctor.id,
    },
    orderBy: {
      month: 'desc',
    },
  });

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  let dailyEarnings = 0;
  let monthlyEarnings = 0;
  let yearlyEarnings = 0;
  let totalDues = 0;

  const formattedVisits = visitsFromDb.map((visit) => {
    const visitDate = new Date(visit.createdAt);
    const paidAmount = Number(visit.feePaid) || 0;
    totalDues += Number(visit.dues) || 0;

    // Fixed daily check using explicit year, month, and date parts
    if (
      visitDate.getFullYear() === currentYear &&
      visitDate.getMonth() === currentMonth &&
      visitDate.getDate() === currentDate
    ) {
      dailyEarnings += paidAmount;
    }

    if (visitDate.getMonth() === currentMonth && visitDate.getFullYear() === currentYear) {
      monthlyEarnings += paidAmount;
    }

    if (visitDate.getFullYear() === currentYear) {
      yearlyEarnings += paidAmount;
    }

    return {
      id: visit.id,
      patientId: visit.patient.id,
      name: visit.patient?.name ?? 'Unknown Patient',
      customId: visit.patient?.customId ?? 'P-000',
      phone: visit.patient?.phone ?? '',
      emergencyPhone: visit.patient?.emergencyPhone ?? '',
      age: visit.patient?.age ?? 0,
      gender: visit.patient?.gender ?? 'Unspecified',
      status: visit.status,
      diagnosis: visit.diagnosis ?? visit.prescription?.diagnosis ?? '',
      medicines: visit.prescription?.medicines ?? '',
      advice: visit.prescription?.advice ?? '',
      tests: visit.prescription?.tests ?? '',
      testReports: visit.prescription?.testReports ?? '',
      feePaid: paidAmount,
      consultationFee: Number(visit.consultationFee) || 1000,
      dues: Number(visit.dues) || 0,
      createdAt: visitDate.toLocaleDateString(),
      symptoms: visit.symptoms ?? 'None reported',
      vitals: {
        weight: visit.weight ?? 'N/A',
        height: visit.height ?? 'N/A',
        bloodPressure: visit.bloodPressure ?? 'N/A',
        temperature: visit.temperature ?? 'N/A',
        pulse: visit.pulse ?? 'N/A',
      },
    };
  });

  const analytics = {
    daily: dailyEarnings,
    monthly: monthlyEarnings,
    yearly: yearlyEarnings,
    totalCollected: monthlyEarnings,
    totalDues: totalDues,
  };

  const doctorInfo = {
    name: activeDoctor.name,
    email: activeDoctor.email,
  };

  const initialChamberRents = chamberRentsFromDb.map((r) => ({
    id: r.id,
    month: r.month,
    rentAmount: r.rentAmount,
    utilitiesAmount: r.utilitiesAmount,
    staffSalaryShare: r.staffSalaryShare,
    totalAmount: r.totalAmount,
    notes: r.notes ?? '',
    isPaid: r.isPaid,
  }));

  return (
    <DoctorConsoleClient
      initialPatients={formattedVisits}
      analytics={analytics}
      doctorInfo={doctorInfo}
      initialChamberRents={initialChamberRents}
    />
  );
}
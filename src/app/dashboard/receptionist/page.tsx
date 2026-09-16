// src/app/dashboard/receptionist/page.tsx
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import ReceptionistConsoleClient from './ReceptionistConsoleClient';

export default async function ReceptionistPage() {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get('userEmail')?.value;

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-[#0b132b] text-white p-8 flex items-center justify-center">
        Unauthorized. Please log in again.
      </div>
    );
  }

  const receptionist = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!receptionist || receptionist.role !== 'RECEPTIONIST') {
    return (
      <div className="min-h-screen bg-[#0b132b] text-white p-8 flex items-center justify-center">
        Unauthorized user role.
      </div>
    );
  }

  // Fetch only the doctors connected and approved with this specific receptionist using prisma
  const connections = await prisma.staffConnection.findMany({
    where: {
      receptionistId: receptionist.id,
      status: 'APPROVED',
    },
    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          degrees: true,
          position: true,
          subStatus: true,
          trialEndsAt: true,
          subEndsAt: true,
        },
      },
    },
  });

  // Extract the doctor objects from the connections relation
  const doctors = connections.map((conn) => conn.doctor).filter(Boolean);

  return <ReceptionistConsoleClient doctors={doctors} />;
}
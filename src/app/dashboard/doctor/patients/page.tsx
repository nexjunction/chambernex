// src/app/dashboard/doctor/patients/page.tsx
export const dynamic = 'force-dynamic';
import { getAllPatientsHistoryAction } from '../actions';
import PatientsDirectoryClient from '../PatientsDirectoryClient';

export default async function PatientsPage() {
  const res = await getAllPatientsHistoryAction();

  // Ensure safe fallback if res or res.patients is undefined/null
  const initialPatients = res?.patients || [];

  return <PatientsDirectoryClient initialPatients={initialPatients} />;
}
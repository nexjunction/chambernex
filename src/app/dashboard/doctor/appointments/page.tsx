// src/app/dashboard/doctor/appointments/page.tsx
import { prisma } from '@/lib/prisma';
import { recordVitalsAndCheckInAction, bookAppointmentAction, getAvailableDoctorsAction } from '../actions';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function AppointmentsPage() {
  // Read the theme cookie set by SidebarWrapper to render matching styles instantly server-side
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('app-theme')?.value;
  const isDarkMode = themeCookie !== 'light'; // Default to dark if not explicitly light

  // Fetch scheduled appointments using your Prisma schema
  const appointments = await prisma.visit.findMany({
    where: { status: 'SCHEDULED' },
    include: { patient: true, doctor: true },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch securely filtered doctors based on the currently logged-in user role
  const doctorResult = await getAvailableDoctorsAction();
  const doctors = doctorResult.success ? doctorResult.doctors : [];

  return (
    <div className={`p-6 space-y-6 max-w-7xl mx-auto transition-colors duration-300 ${
      isDarkMode ? 'text-slate-100' : 'text-slate-900'
    }`}>
      <div>
        <h1 className="text-2xl font-bold">Appointments Schedule & Vitals Check-in</h1>
        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Pre-booked clinic appointments awaiting arrival and vitals entry.
        </p>
      </div>

      {/* Booking Form Card */}
      <div className={`border rounded-2xl p-6 shadow-lg transition-colors ${
        isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${
          isDarkMode ? 'text-slate-400' : 'text-slate-700'
        }`}>
          Book New Appointment
        </h2>
        <form action={bookAppointmentAction} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            name="name"
            placeholder="Patient Name"
            required
            className={`border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 ${
              isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
          <input
            type="text"
            name="phone"
            placeholder="Phone Number (Unique)"
            required
            className={`border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 ${
              isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
          <input
            type="number"
            name="age"
            placeholder="Age"
            required
            className={`border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 ${
              isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
          <select
            name="gender"
            className={`border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 ${
              isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <select
            name="doctorId"
            required
            className={`border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 ${
              isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="">Select Doctor (Required) *</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>Dr. {doc.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-5 py-2.5 rounded-xl transition shadow-lg cursor-pointer"
          >
            + Add to Schedule
          </button>
        </form>
      </div>

      {/* Scheduled Queue Cards with Vitals Input */}
      <div className={`border rounded-2xl p-6 shadow-lg transition-colors ${
        isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${
          isDarkMode ? 'text-slate-400' : 'text-slate-700'
        }`}>
          Today's Scheduled Appointments (Pending Vitals Check-in)
        </h2>

        <div className="space-y-4">
          {appointments.length === 0 ? (
            <p className={`text-xs text-center py-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              No scheduled appointments waiting for check-in.
            </p>
          ) : (
            appointments.map((appt) => (
              <div key={appt.id} className={`border p-4 rounded-xl space-y-4 transition-colors ${
                isDarkMode ? 'bg-[#131b2e] border-slate-700/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {appt.patient.name}
                      </h3>
                      <span className="text-xs text-blue-400 font-mono">ID: {appt.patient.customId || 'N/A'}</span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {appt.patient.gender}, {appt.patient.age} yrs • Ph: {appt.patient.phone} {appt.doctor ? `• Dr. ${appt.doctor.name}` : ''}
                    </p>
                  </div>
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-medium">
                    SCHEDULED
                  </span>
                </div>

                {/* Vitals Form submitted on visit date */}
                <form action={recordVitalsAndCheckInAction.bind(null, appt.id)} className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 pt-2 border-t ${
                  isDarkMode ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <input
                    type="text"
                    name="bloodPressure"
                    placeholder="BP (e.g. 120/80)"
                    className={`border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#1c2541] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <input
                    type="text"
                    name="weight"
                    placeholder="Weight (kg)"
                    className={`border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#1c2541] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <input
                    type="text"
                    name="height"
                    placeholder="Height"
                    className={`border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#1c2541] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <input
                    type="text"
                    name="temperature"
                    placeholder="Temp (°F)"
                    className={`border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#1c2541] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <input
                    type="text"
                    name="pulse"
                    placeholder="Pulse (bpm)"
                    className={`border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#1c2541] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition shadow-md col-span-full sm:col-span-1 md:col-span-1 cursor-pointer"
                  >
                    Save Vitals & Queue ⚡
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
// src/app/dashboard/doctor/PrescriptionPrint.tsx
'use client';

interface PatientVisit {
  id: string;
  patientId: string;
  name: string;
  customId: string;
  phone: string;
  emergencyPhone: string;
  age: number;
  gender: string;
  status: 'PENDING' | 'COMPLETED';
  diagnosis: string;
  medicines: string;
  advice: string;
  attachments: string;
  feePaid: number;
  consultationFee: number;
  dues: number;
  createdAt: string;
  vitals: {
    weight: string;
    height: string;
    bloodPressure: string;
    temperature: string;
    pulse: string;
  };
}

interface PrescriptionPrintProps {
  patient: PatientVisit;
  doctorName?: string;
  doctorSpecialty?: string;
  clinicName?: string;
}

export default function PrescriptionPrint({
  patient,
  doctorName = 'Dr. Jeriko Costa',
  doctorSpecialty = 'Cardiology & Internal Medicine',
  clinicName = 'NerveCare Health Center',
}: PrescriptionPrintProps) {
  const currentDate = patient?.createdAt
    ? new Date(patient.createdAt).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  return (
    <div className="printable-prescription hidden print:block print:w-full print:p-8 print:bg-white print:text-black print:font-sans">
      {/* Header / Doctor Metadata */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{doctorName}</h1>
          <p className="text-sm text-slate-700 font-medium">{doctorSpecialty}</p>
          <p className="text-xs text-slate-500 mt-1">MBBS, FCPS (Cardiology), MD</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-extrabold text-blue-900 uppercase tracking-wider">{clinicName}</h2>
          <p className="text-xs text-slate-600">House 12, Road 5, Dhanmondi, Dhaka</p>
          <p className="text-xs text-slate-600">Emergency: +880 1700-000000</p>
        </div>
      </div>

      {/* Patient Vitals Bar */}
      <div className="grid grid-cols-5 gap-2 border border-slate-300 rounded-md p-3 text-xs mb-6 bg-slate-50">
        <div>
          <span className="text-slate-500 block">Patient Name</span>
          <span className="font-bold text-slate-900">{patient?.name || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 block">ID / Age / Sex</span>
          <span className="font-bold text-slate-900">
            {patient?.customId || 'N/A'} | {patient?.age ?? 'N/A'}y | {patient?.gender || 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Blood Pressure</span>
          <span className="font-bold text-slate-900">{patient?.vitals?.bloodPressure || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Pulse / Temp</span>
          <span className="font-bold text-slate-900">
            {patient?.vitals?.pulse || 'N/A'} | {patient?.vitals?.temperature || 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Date</span>
          <span className="font-bold text-slate-900">{currentDate}</span>
        </div>
      </div>

      {/* Prescription Content (Rx Body) */}
      <div className="min-h-[500px] flex flex-col justify-between">
        <div className="space-y-6">
          {/* Diagnosis */}
          {patient?.diagnosis && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Diagnosis</h3>
              <p className="text-sm font-semibold text-slate-800">{patient.diagnosis}</p>
            </div>
          )}

          {/* Rx Symbol & Medicines */}
          <div>
            <div className="text-3xl font-serif font-bold text-slate-900 mb-2">Rx</div>
            <div className="pl-4 whitespace-pre-line text-sm font-mono leading-relaxed text-slate-900 border-l-2 border-slate-200">
              {patient?.medicines || 'No medications prescribed.'}
            </div>
          </div>

          {/* Special Advice */}
          {patient?.advice && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Advice / Instructions</h3>
              <p className="text-xs text-slate-800 italic">{patient.advice}</p>
            </div>
          )}
        </div>

        {/* Doctor Signature Footer */}
        <div className="flex justify-between items-end pt-12 mt-8 border-t border-slate-300">
          <div className="text-[10px] text-slate-400">
            <p>Generated via NerveCare Electronic Medical Record (EMR)</p>
            <p>Valid without physical stamp if digitally verified.</p>
          </div>
          <div className="text-center w-48">
            <div className="border-b border-slate-800 mb-1 h-12 flex items-end justify-center">
              {/* Optional digital signature graphic anchor */}
            </div>
            <p className="text-xs font-bold text-slate-900">{doctorName}</p>
            <p className="text-[10px] text-slate-500">Authorized Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}
// src/app/dashboard/doctor/DoctorConsoleClient.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { savePrescriptionAction, getPresignedUploadUrlAction, saveChamberRentAction } from './actions';

interface PatientVisit {
  id: string;
  patientId: string;
  name: string;
  customId: string;
  phone: string;
  emergencyPhone: string;
  age: number;
  gender: string;
  status: 'SCHEDULED' | 'WAITING' | 'COMPLETED';
  diagnosis: string;
  medicines: string;
  advice: string;
  tests: string;
  testReports: string;
  feePaid: number;
  consultationFee: number;
  dues: number;
  createdAt: string;
  symptoms: string;
  vitals: {
    weight: string;
    height: string;
    bloodPressure: string;
    temperature: string;
    pulse: string;
  };
}

interface Analytics {
  daily: number;
  monthly: number;
  yearly: number;
  totalCollected: number;
  totalDues: number;
}

interface DoctorInfo {
  name: string;
  email: string;
}

interface ChamberRentItem {
  id: string;
  month: string; // "YYYY-MM"
  rentAmount: number;
  utilitiesAmount: number;
  staffSalaryShare: number;
  totalAmount: number;
  notes: string;
  isPaid: boolean;
}

export default function DoctorConsoleClient({
  initialPatients,
  analytics,
  doctorInfo,
  initialChamberRents = [],
}: {
  initialPatients: PatientVisit[];
  analytics: Analytics;
  doctorInfo: DoctorInfo;
  initialChamberRents?: ChamberRentItem[];
}) {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientVisit[]>(initialPatients);
  const [chamberRents, setChamberRents] = useState<ChamberRentItem[]>(initialChamberRents);

  // Synchronize local state whenever server-side props/router refresh updates initialPatients
  useEffect(() => {
    setPatients(initialPatients);
  }, [initialPatients]);

  useEffect(() => {
    setChamberRents(initialChamberRents);
  }, [initialChamberRents]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(initialPatients[0]?.id || '');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Navigation tab state: 'CONSULTATION' vs 'CHAMBER_EXPENSES'
  const [activeTab, setActiveTab] = useState<'CONSULTATION' | 'CHAMBER_EXPENSES'>('CONSULTATION');

  // Mobile View Toggle: 'QUEUE' vs 'WORKSPACE' for small screens
  const [mobileViewTab, setMobileViewTab] = useState<'QUEUE' | 'WORKSPACE'>('QUEUE');

  // Chamber rent input state for the current month
  const currentMonthString = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [rentMonth, setRentMonth] = useState(currentMonthString);
  const activeRentRecord = chamberRents.find((r) => r.month === rentMonth);

  const [rentAmount, setRentAmount] = useState<number>(activeRentRecord?.rentAmount || 15000);
  const [utilitiesAmount, setUtilitiesAmount] = useState<number>(activeRentRecord?.utilitiesAmount || 3000);
  const [staffSalaryShare, setStaffSalaryShare] = useState<number>(activeRentRecord?.staffSalaryShare || 5000);
  const [rentNotes, setRentNotes] = useState<string>(activeRentRecord?.notes || '');
  const [isRentPaid, setIsRentPaid] = useState<boolean>(activeRentRecord?.isPaid || false);
  const [isSavingRent, setIsSavingRent] = useState(false);

  // Update form values when selected month changes
  useEffect(() => {
    const record = chamberRents.find((r) => r.month === rentMonth);
    if (record) {
      setRentAmount(record.rentAmount);
      setUtilitiesAmount(record.utilitiesAmount);
      setStaffSalaryShare(record.staffSalaryShare);
      setRentNotes(record.notes || '');
      setIsRentPaid(record.isPaid);
    } else {
      setRentAmount(15000);
      setUtilitiesAmount(3000);
      setStaffSalaryShare(5000);
      setRentNotes('');
      setIsRentPaid(false);
    }
  }, [rentMonth, chamberRents]);

  const totalMonthlyExpenses = rentAmount + utilitiesAmount + staffSalaryShare;
  const netMonthlyProfit = analytics.monthly - totalMonthlyExpenses;

  // Sync with global SidebarWrapper theme changes via localStorage and window events
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'dark');
    }

    const handleThemeChange = () => {
      const current = localStorage.getItem('app-theme');
      if (current !== null) {
        setIsDarkMode(current === 'dark');
      }
    };

    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  // Workflow state: 'EXAMINING' (vitals review & checkup) vs 'WRITING_RX' (prescription pad)
  const [workflowStep, setWorkflowStep] = useState<'EXAMINING' | 'WRITING_RX'>('EXAMINING');

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.emergencyPhone.toLowerCase().includes(q) ||
        p.customId.toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

  const activePatient = patients.find((p) => p.id === selectedId) || filteredPatients[0] || patients[0];

  // Filter past visits for the same patient to build a medical history log
  const patientHistory = useMemo(() => {
    if (!activePatient) return [];
    return patients.filter(
      (p) => p.patientId === activePatient.patientId && p.id !== activePatient.id && p.status === 'COMPLETED'
    );
  }, [patients, activePatient]);

  const [diagnosis, setDiagnosis] = useState(activePatient?.diagnosis || '');
  const [medicines, setMedicines] = useState(activePatient?.medicines || '');
  const [advice, setAdvice] = useState(activePatient?.advice || '');
  const [tests, setTests] = useState(activePatient?.tests || '');
  const [feePaidInput, setFeePaidInput] = useState<number>(activePatient?.feePaid || 0);
  const [reports, setReports] = useState<string[]>(
    activePatient?.testReports ? activePatient.testReports.split(',').filter(Boolean) : []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Synchronize form state when activePatient or selectedId changes and reset to examining step
  useEffect(() => {
    if (activePatient) {
      setDiagnosis(activePatient.diagnosis || '');
      setMedicines(activePatient.medicines || '');
      setAdvice(activePatient.advice || '');
      setTests(activePatient.tests || '');
      setFeePaidInput(activePatient.feePaid || 0);
      setReports(
        activePatient.testReports ? activePatient.testReports.split(',').filter(Boolean) : []
      );
      setWorkflowStep('EXAMINING');
    }
  }, [selectedId, activePatient]);

  const handleSelectPatient = (p: PatientVisit) => {
    setSelectedId(p.id);
    // Automatically switch to workspace view on mobile when a patient is selected
    setMobileViewTab('WORKSPACE');
  };

  // DIRECT CLOUD UPLOAD VIA SIGNED URL (Bypasses Next.js 1MB Body Limit)
  const handleAddReport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const res = await getPresignedUploadUrlAction(file.name, file.type);

      if (!res.success || !res.signedUrl || !res.filePath) {
        throw new Error(res.error || 'Failed to initialize upload ticket.');
      }

      const uploadResponse = await fetch(res.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Cloud storage upload failed.');
      }

      setReports((prev) => [...prev, res.filePath as string]);
    } catch (error: any) {
      alert(error.message || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveReport = (index: number) => {
    setReports((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;

    setIsSaving(true);
    const attachmentString = reports.join(',');
    const computedDues = Math.max(0, activePatient.consultationFee - feePaidInput);

    const res = await savePrescriptionAction({
      visitId: activePatient.id,
      diagnosis,
      medicines,
      advice,
      tests,
      testReports: attachmentString,
      feePaid: feePaidInput,
    });

    if (res.success) {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === activePatient.id
            ? {
                ...p,
                status: 'COMPLETED',
                diagnosis,
                medicines,
                advice,
                tests,
                testReports: attachmentString,
                feePaid: feePaidInput,
                dues: computedDues,
              }
            : p
        )
      );
      alert('Prescription and payment status saved successfully!');
      router.refresh();
    } else {
      alert('Error saving prescription.');
    }
    setIsSaving(false);
  };

  const handleSaveChamberRent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRent(true);

    const formData = new FormData();
    formData.append('month', rentMonth);
    formData.append('rentAmount', rentAmount.toString());
    formData.append('utilitiesAmount', utilitiesAmount.toString());
    formData.append('staffSalaryShare', staffSalaryShare.toString());
    formData.append('notes', rentNotes);
    formData.append('isPaid', isRentPaid.toString());

    const res = await saveChamberRentAction(formData);
    if (res.success) {
      alert('Chamber expenses & rent record saved successfully!');
      router.refresh();
    } else {
      alert('Failed to save chamber rent record.');
    }
    setIsSavingRent(false);
  };

  const handleSignOut = () => {
    router.push('/login');
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isDarkMode ? 'bg-[#0b132b] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Header (Hidden on Print) */}
      <header
        className={`print:hidden border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md ${
          isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between w-full md:w-auto space-x-3">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 sm:p-2.5 rounded-xl text-white font-bold shadow-lg">🩺</div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-wide">Doctor Console</h1>
                <span className="text-[10px] sm:text-xs bg-blue-500/25 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                  {doctorInfo.name}
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Clinical Consultation & Practice Analytics
              </p>
            </div>
          </div>

          {/* Account Controls for Mobile Top Bar */}
          <div className="flex md:hidden items-center space-x-2">
            <Link
              href="/dashboard/account"
              className="bg-[#131b2e] text-slate-200 border border-slate-700 p-2 rounded-lg text-xs"
              title="Account"
            >
              👤
            </Link>
            <button
              onClick={handleSignOut}
              className="bg-red-600/20 text-red-400 border border-red-500/30 p-2 rounded-lg text-xs"
              title="Sign Out"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Real Dynamic Earnings Analytics Cards (Scrollable on small mobile screens) */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <div className={`border px-3 sm:px-4 py-2 rounded-2xl shadow-lg flex flex-col items-center min-w-[85px] sm:min-w-[90px] ${isDarkMode ? 'bg-[#131b2e] border-slate-700/80' : 'bg-white border-slate-200'}`}>
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Daily Earn</span>
            <span className="text-sm sm:text-base font-extrabold text-emerald-400">৳{analytics.daily}</span>
          </div>
          <div className={`border px-3 sm:px-4 py-2 rounded-2xl shadow-lg flex flex-col items-center min-w-[85px] sm:min-w-[90px] ${isDarkMode ? 'bg-[#131b2e] border-slate-700/80' : 'bg-white border-slate-200'}`}>
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Collected</span>
            <span className="text-sm sm:text-base font-extrabold text-blue-400">৳{analytics.totalCollected}</span>
          </div>
          <div className={`border px-3 sm:px-4 py-2 rounded-2xl shadow-lg flex flex-col items-center min-w-[85px] sm:min-w-[90px] ${isDarkMode ? 'bg-[#131b2e] border-slate-700/80' : 'bg-white border-slate-200'}`}>
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Market Dues</span>
            <span className="text-sm sm:text-base font-extrabold text-amber-400">৳{analytics.totalDues}</span>
          </div>
        </div>

        {/* Controls & Account Tab (Desktop) */}
        <div className="hidden md:flex items-center space-x-2">
          <Link
            href="/dashboard/account"
            className="bg-[#131b2e] hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition"
          >
            👤 Account
          </Link>

          <button
            onClick={handleSignOut}
            className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg text-xs font-medium transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Sub-Header Navigation Tabs */}
      <div className={`print:hidden border-b px-4 sm:px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 ${isDarkMode ? 'bg-[#1c2541]/60 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('CONSULTATION')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'CONSULTATION'
                ? 'bg-blue-600 text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            🩺 Consultations & Queue
          </button>
          <button
            onClick={() => setActiveTab('CHAMBER_EXPENSES')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'CHAMBER_EXPENSES'
                ? 'bg-blue-600 text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            🏢 Chamber Rent & Expenses
          </button>
        </div>

        {activeTab === 'CHAMBER_EXPENSES' && (
          <div className="text-xs text-slate-400 w-full sm:w-auto text-right">
            Net Monthly Profit: <span className={`font-bold ${netMonthlyProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>৳{netMonthlyProfit}</span>
          </div>
        )}
      </div>

      {/* Mobile Screen Switcher Bar (Only visible on Consultation tab for mobile & tablet screens < 1024px) */}
      {activeTab === 'CONSULTATION' && (
        <div className={`print:hidden flex lg:hidden border-b p-2 ${isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
          <button
            type="button"
            onClick={() => setMobileViewTab('QUEUE')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              mobileViewTab === 'QUEUE'
                ? 'bg-blue-600 text-white shadow'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-700'
            }`}
          >
            👥 Patient Queue ({filteredPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileViewTab('WORKSPACE')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              mobileViewTab === 'WORKSPACE'
                ? 'bg-blue-600 text-white shadow'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-700'
            }`}
          >
            📝 Active Workspace ({activePatient?.name || 'None'})
          </button>
        </div>
      )}

      {/* Main Container based on active tab */}
      {activeTab === 'CHAMBER_EXPENSES' ? (
        <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6">
          <div className={`border rounded-2xl p-4 sm:p-6 shadow-lg ${isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700 mb-6">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Chamber Rent & Expense Management</h2>
                <p className="text-xs text-slate-400 mt-0.5">Track monthly lease, utilities, and staff salary overheads for net profit analysis.</p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <label className="text-xs font-medium text-slate-400">Month:</label>
                <input
                  type="month"
                  value={rentMonth}
                  onChange={(e) => setRentMonth(e.target.value)}
                  className={`border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 ${isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>
            </div>

            <form onSubmit={handleSaveChamberRent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Chamber Rent (৳)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={rentAmount}
                    onChange={(e) => setRentAmount(Number(e.target.value))}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm transition focus:outline-none focus:border-blue-500 ${isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Utilities / Internet (৳)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={utilitiesAmount}
                    onChange={(e) => setUtilitiesAmount(Number(e.target.value))}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm transition focus:outline-none focus:border-blue-500 ${isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Staff Salary Share (৳)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={staffSalaryShare}
                    onChange={(e) => setStaffSalaryShare(Number(e.target.value))}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm transition focus:outline-none focus:border-blue-500 ${isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Expense Notes / Landlord Details</label>
                  <textarea
                    rows={3}
                    value={rentNotes}
                    onChange={(e) => setRentNotes(e.target.value)}
                    placeholder="e.g. Paid via bank transfer to landlord..."
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm transition focus:outline-none focus:border-blue-500 ${isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div className="flex flex-col justify-between space-y-4">
                  <div className="flex items-center space-x-3 bg-[#131b2e] border border-slate-700 p-4 rounded-xl">
                    <input
                      type="checkbox"
                      id="isPaidCheck"
                      checked={isRentPaid}
                      onChange={(e) => setIsRentPaid(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-700 focus:ring-blue-500"
                    />
                    <label htmlFor="isPaidCheck" className="text-sm font-medium text-slate-200 cursor-pointer">
                      Mark this month's rent & expenses as fully <span className="text-emerald-400 font-bold">PAID</span>
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Monthly Expenses</span>
                      <span className="text-lg font-extrabold text-amber-400">৳{totalMonthlyExpenses}</span>
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingRent}
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition shadow-lg disabled:opacity-50"
                    >
                      {isSavingRent ? 'Saving...' : 'Save Expenses'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Past Chamber Rent Records Table */}
          <div className={`border rounded-2xl p-4 sm:p-6 shadow-lg ${isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Expense History Log</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="pb-3 font-semibold">Month</th>
                    <th className="pb-3 font-semibold">Rent (৳)</th>
                    <th className="pb-3 font-semibold">Utilities (৳)</th>
                    <th className="pb-3 font-semibold">Staff (৳)</th>
                    <th className="pb-3 font-semibold">Total (৳)</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {chamberRents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-500 italic">No chamber expense records found.</td>
                    </tr>
                  ) : (
                    chamberRents.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/40">
                        <td className="py-3 font-medium text-slate-200">{r.month}</td>
                        <td className="py-3">৳{r.rentAmount}</td>
                        <td className="py-3">৳{r.utilitiesAmount}</td>
                        <td className="py-3">৳{r.staffSalaryShare}</td>
                        <td className="py-3 font-bold text-amber-400">৳{r.totalAmount}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${r.isPaid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                            {r.isPaid ? 'Paid' : 'Due'}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400 truncate max-w-[150px]">{r.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 p-4 sm:p-6 gap-6 max-w-7xl mx-auto w-full">
          {/* Left Sidebar: Queue & Search (Hidden on mobile if Workspace tab is active) */}
          <div
            className={`border rounded-2xl p-4 flex flex-col shadow-lg space-y-4 ${
              mobileViewTab === 'WORKSPACE' ? 'hidden lg:flex' : 'flex'
            } ${isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'}`}
          >
            <div>
              <h2 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Patient Queue & Search
              </h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, emergency..."
                className={`w-full border rounded-xl px-3 py-2 text-xs transition focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 max-h-[calc(100vh-250px)] lg:max-h-[calc(100vh-280px)] pr-1">
              {filteredPatients.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No matching patients found.</p>
              ) : (
                filteredPatients.map((p) => {
                  const isSelected = p.id === activePatient?.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPatient(p)}
                      className={`p-3 rounded-xl cursor-pointer transition border ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : isDarkMode
                          ? 'bg-[#131b2e] border-slate-800 hover:bg-slate-800 text-slate-300'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm">{p.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            p.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : p.status === 'WAITING'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {p.gender}, {p.age} yrs • ID: {p.customId}
                      </p>
                      <div className="flex justify-between items-center mt-1 text-[10px]">
                        <span className="text-slate-500">Ph: {p.phone}</span>
                        <span className={p.dues > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>
                          Dues: ৳{p.dues}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Area: Clinical Examination View vs. Prescription Pad (Hidden on mobile if Queue tab is active) */}
          <div
            className={`border rounded-2xl p-4 sm:p-6 shadow-lg flex flex-col justify-between lg:col-span-3 ${
              mobileViewTab === 'QUEUE' ? 'hidden lg:flex' : 'flex'
            } ${isDarkMode ? 'bg-[#1c2541] border-slate-800' : 'bg-white border-slate-200'}`}
          >
            {activePatient ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between">

                {/* STEP 1: PATIENT CHECKUP & VITALS REVIEW VIEW */}
                {workflowStep === 'EXAMINING' ? (
                  <div className="space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-6">
                      <div className="border border-slate-700 rounded-2xl p-4 sm:p-6 bg-[#131b2e] shadow-inner space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                          <div>
                            <h2 className="text-lg sm:text-xl font-bold text-white">{activePatient.name}</h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                              ID: <span className="text-blue-400 font-medium">{activePatient.customId}</span> | Age: {activePatient.age} yrs | Gender: {activePatient.gender} | Phone: {activePatient.phone}
                            </p>
                          </div>
                          <span className={`self-start sm:self-auto text-xs px-3 py-1 rounded-full font-semibold ${
                            activePatient.status === 'SCHEDULED'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            Status: {activePatient.status}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                            Recorded Vitals
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl text-center">
                              <span className="block text-[10px] text-slate-400 uppercase font-medium">Blood Pressure</span>
                              <span className="text-xs sm:text-sm font-bold text-slate-100">{activePatient.vitals.bloodPressure}</span>
                            </div>
                            <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl text-center">
                              <span className="block text-[10px] text-slate-400 uppercase font-medium">Temperature</span>
                              <span className="text-xs sm:text-sm font-bold text-slate-100">{activePatient.vitals.temperature}</span>
                            </div>
                            <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl text-center">
                              <span className="block text-[10px] text-slate-400 uppercase font-medium">Pulse Rate</span>
                              <span className="text-xs sm:text-sm font-bold text-slate-100">{activePatient.vitals.pulse}</span>
                            </div>
                            <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl text-center">
                              <span className="block text-[10px] text-slate-400 uppercase font-medium">Weight</span>
                              <span className="text-xs sm:text-sm font-bold text-slate-100">{activePatient.vitals.weight}</span>
                            </div>
                            <div className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl col-span-2 md:col-span-1 text-center">
                              <span className="block text-[10px] text-slate-400 uppercase font-medium">Fee Status</span>
                              <span className={`text-xs sm:text-sm font-bold ${activePatient.dues > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                ৳{activePatient.feePaid} Paid
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* HISTORICAL MEDICAL FILE ACCORDION */}
                        <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            📂 Patient History & Past Visits ({patientHistory.length})
                          </h3>
                          {patientHistory.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No prior completed visits found for this patient.</p>
                          ) : (
                            <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                              {patientHistory.map((hist) => (
                                <div key={hist.id} className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg text-xs space-y-1">
                                  <div className="flex flex-col sm:flex-row justify-between text-slate-300 font-medium gap-1">
                                    <span>Date: {hist.createdAt}</span>
                                    <span className="text-blue-400">Diagnosis: {hist.diagnosis || 'N/A'}</span>
                                  </div>
                                  <p className="text-slate-400 font-mono text-[11px] truncate">Rx: {hist.medicines}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-xs text-slate-400 leading-relaxed">
                          💡 <strong className="text-slate-300">Clinical Note:</strong> Review past records and vitals above. When ready for consultation, proceed to write the prescription.
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setMobileViewTab('QUEUE')}
                        className="lg:hidden w-full sm:w-auto bg-slate-800 text-slate-300 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-medium"
                      >
                        ← Back to Patient Queue
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorkflowStep('WRITING_RX')}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 ml-auto"
                      >
                        <span>Proceed to Write Prescription</span> →
                      </button>
                    </div>
                  </div>
                ) : (

                  /* STEP 2: PRESCRIPTION WRITING PAD & PRINTABLE TEMPLATE */
                  <div id="printable-prescription" className="space-y-6 bg-white text-slate-900 p-4 sm:p-6 rounded-xl print:p-0 print:bg-transparent print:text-black flex-1 flex flex-col justify-between">
                    <div className="space-y-6">

                      {/* Back Button to Checkup View (Hidden on Print) */}
                      <div className="print:hidden flex items-center justify-between pb-2 border-b border-slate-800">
                        <button
                          type="button"
                          onClick={() => setWorkflowStep('EXAMINING')}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                        >
                          ← Back to Patient Vitals & History
                        </button>
                        <span className="text-xs text-slate-400">Prescription Mode Active</span>
                      </div>

                      {/* Print Header */}
                      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className="text-2xl font-bold">{doctorInfo.name}</h2>
                            <p className="text-sm text-slate-600">Consulting Specialist & General Practice</p>
                          </div>
                          <div className="text-right text-xs text-slate-600">
                            <p><b>Date:</b> {activePatient.createdAt}</p>
                            <p><b>Visit ID:</b> {activePatient.customId}</p>
                          </div>
                        </div>
                      </div>

                      {/* Patient Header Banner */}
                      <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 print:border-black">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <h2 className="text-base sm:text-lg font-bold">{activePatient.name}</h2>
                          <p className="text-xs text-slate-600">
                            Age/Sex: {activePatient.age} / {activePatient.gender} | Phone: {activePatient.phone}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                          <span className="bg-white border border-slate-300 px-2 py-1 rounded">BP: {activePatient.vitals.bloodPressure}</span>
                          <span className="bg-white border border-slate-300 px-2 py-1 rounded">Temp: {activePatient.vitals.temperature}</span>
                          <span className="bg-white border border-slate-300 px-2 py-1 rounded">Pulse: {activePatient.vitals.pulse}</span>
                          <span className="bg-white border border-slate-300 px-2 py-1 rounded">Wt: {activePatient.vitals.weight}</span>
                        </div>
                      </div>

                      {/* Clinical Inputs Form */}
                      <form id="prescription-form" onSubmit={handleSave} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 print:font-bold print:text-black">
                            Diagnosis *
                          </label>
                          <input
                            type="text"
                            required
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            placeholder="e.g. Acute Bronchitis"
                            className="print:border-none print:bg-transparent print:p-0 w-full border rounded-xl px-4 py-2.5 text-sm transition focus:outline-none focus:border-blue-500 bg-[#131b2e] border-slate-700 text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 print:font-bold print:text-black">
                            Rx (Medicines & Dosage) *
                          </label>
                          <textarea
                            rows={4}
                            required
                            value={medicines}
                            onChange={(e) => setMedicines(e.target.value)}
                            placeholder="1. Tab. Napa Extra 500mg - 1+1+1 (After Meal) - 5 days..."
                            className="print:border-none print:bg-transparent print:p-0 w-full border rounded-xl px-4 py-2.5 text-sm font-mono transition focus:outline-none focus:border-blue-500 bg-[#131b2e] border-slate-700 text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 print:font-bold print:text-black">
                            Investigations & Tests Advised
                          </label>
                          <input
                            type="text"
                            value={tests}
                            onChange={(e) => setTests(e.target.value)}
                            placeholder="e.g. CBC, Chest X-Ray PA View"
                            className="print:border-none print:bg-transparent print:p-0 w-full border rounded-xl px-4 py-2.5 text-sm transition focus:outline-none focus:border-blue-500 bg-[#131b2e] border-slate-700 text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 print:font-bold print:text-black">
                            Advice & Special Notes
                          </label>
                          <textarea
                            rows={2}
                            value={advice}
                            onChange={(e) => setAdvice(e.target.value)}
                            placeholder="Drink plenty of water..."
                            className="print:border-none print:bg-transparent print:p-0 w-full border rounded-xl px-4 py-2.5 text-sm transition focus:outline-none focus:border-blue-500 bg-[#131b2e] border-slate-700 text-white"
                          />
                        </div>
                      </form>

                      {/* Financial Payment Adjustment Box */}
                      <div className="print:hidden border border-slate-700/80 bg-[#131b2e] rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consultation Financials & Dues Management</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 block mb-1">Total Fee (৳)</span>
                            <input
                              type="number"
                              disabled
                              value={activePatient.consultationFee}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-300 mb-1 font-medium">Amount Received (৳)</label>
                            <input
                              type="number"
                              value={feePaidInput}
                              onChange={(e) => setFeePaidInput(Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-1">Remaining Dues (৳)</span>
                            <div className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-amber-400 font-bold">
                              ৳{Math.max(0, activePatient.consultationFee - feePaidInput)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reports Section (Hidden on Print) */}
                      <div className="print:hidden pt-2 border-t border-slate-800">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Attached Test Reports / Follow-up Scans
                        </label>
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <input
                            type="file"
                            onChange={handleAddReport}
                            disabled={isUploading}
                            className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer disabled:opacity-50"
                          />
                          {isUploading && <span className="text-xs text-blue-400 animate-pulse">Uploading file directly to cloud...</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {reports.map((report, idx) => {
                            const displayLabel = report.split('/').pop() || report;
                            const fileUrl = report.startsWith('http') || report.startsWith('/') ? report : `/uploads/${report}`;
                            return (
                              <div key={idx} className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-200">
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline flex items-center gap-1 max-w-[200px] truncate"
                                  title={displayLabel}
                                >
                                  📄 {displayLabel} ↗
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveReport(idx)}
                                  className="text-red-400 hover:text-red-300 font-bold ml-1"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Print Footer Signature */}
                      <div className="hidden print:flex justify-between items-end pt-16 mt-8 border-t border-slate-400">
                        <p className="text-xs text-slate-600">System Generated Clinical Prescription</p>
                        <div className="text-center">
                          <p className="font-bold border-t border-black pt-1 px-8">{doctorInfo.name}</p>
                          <p className="text-xs text-slate-600">Signature</p>
                        </div>
                      </div>

                    </div>

                    {/* Action Bar (Save Prescription & Print) */}
                    <div className="print:hidden pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-5 py-2.5 rounded-xl text-xs transition border border-slate-700 flex items-center justify-center gap-2"
                      >
                        <span>🖨️ Print Prescription</span>
                      </button>

                      <button
                        type="submit"
                        form="prescription-form"
                        disabled={isSaving}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : '💾 Save Prescription & Complete Visit'}
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center text-slate-500">
                <span className="text-4xl mb-2">📋</span>
                <p className="text-sm font-medium">No patient selected from the queue.</p>
                <p className="text-xs mt-1">Select a patient on the left to examine vitals and write prescriptions.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
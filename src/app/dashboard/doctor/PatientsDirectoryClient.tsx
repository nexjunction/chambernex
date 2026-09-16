// src/app/dashboard/doctor/PatientsDirectoryClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { mergePatientsAction, getDecryptedReportByPathAction } from './actions';
import { useRouter } from 'next/navigation';

interface VisitRecord {
  id: string;
  createdAt: Date | string;
  diagnosis: string | null;
  status: string;
  consultationFee: number;
  feePaid: number;
  dues: number;
  prescription?: {
    medicines: string;
    advice?: string | null;
    tests?: string | null;
    testReports?: string | null;
  } | null;
}

interface PatientProfile {
  id: string;
  customId: string | null;
  name: string;
  phone: string;
  emergencyPhone: string | null;
  age: number;
  gender: string;
  address: string | null;
  visits: VisitRecord[];
}

export default function PatientsDirectoryClient({ initialPatients }: { initialPatients: PatientProfile[] }) {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientProfile[]>(initialPatients);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(initialPatients[0] || null);

  // Global Theme state synchronized with SidebarWrapper via 'app-theme' and custom events
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Mobile View Switcher state ('DIRECTORY_LIST' vs 'PATIENT_DETAILS' for small/tablet screens)
  const [mobileView, setMobileView] = useState<'DIRECTORY_LIST' | 'PATIENT_DETAILS'>('DIRECTORY_LIST');

  // Loading state for report viewing
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  useEffect(() => {
    const syncTheme = () => {
      const savedTheme = localStorage.getItem('app-theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    };

    // Load initial theme on mount
    syncTheme();

    // Listen for global theme updates triggered from sidebar or other components
    window.addEventListener('theme-change', syncTheme);
    window.addEventListener('storage', syncTheme);

    return () => {
      window.removeEventListener('theme-change', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  // Merging modal state
  const [isMergingModalOpen, setIsMergingModalOpen] = useState(false);
  const [targetMergeId, setTargetMergeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      (p.customId && p.customId.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelectPatient = (p: PatientProfile) => {
    setSelectedPatient(p);
    // Automatically switch to details view on mobile/tablet viewports (<1024px)
    setMobileView('PATIENT_DETAILS');
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !targetMergeId) return;

    if (!confirm(`Are you sure you want to merge records into ${selectedPatient.name}? This action cannot be undone.`)) {
      return;
    }

    setIsSubmitting(true);
    const res = await mergePatientsAction(selectedPatient.id, targetMergeId);
    if (res.success) {
      alert('Patient records successfully merged!');
      setIsMergingModalOpen(false);
      router.refresh();
      setPatients((prev) => prev.filter((p) => p.id !== targetMergeId));
    } else {
      alert(res.error || 'Failed to merge records.');
    }
    setIsSubmitting(false);
  };

  // Professional Standalone Prescription Print Layout
  const handlePrintPrescription = (visit: VisitRecord) => {
    const windowPrint = window.open('', '', 'left=0,top=0,width=900,height=1000,toolbar=0,scrollbars=0,status=0');
    if (!windowPrint) return;

    const visitDate = visit.createdAt ? new Date(visit.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

    windowPrint.document.write(`
      <html>
        <head>
          <title>Prescription - ${selectedPatient?.name}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; padding: 40px; margin: 0; }
            .rx-container { max-width: 800px; margin: auto; border: 1px solid #ddd; padding: 30px; border-radius: 12px; background: #fff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
            .clinic-info h1 { margin: 0; color: #2563eb; font-size: 24px; font-weight: bold; }
            .clinic-info p { margin: 4px 0 0; font-size: 12px; color: #555; }
            .doctor-info { text-align: right; }
            .doctor-info h3 { margin: 0; font-size: 16px; color: #1e293b; }
            .doctor-info p { margin: 2px 0 0; font-size: 11px; color: #64748b; }
            .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; font-size: 13px; margin-bottom: 25px; }
            .body-section { display: grid; grid-template-columns: 1fr 2.5fr; gap: 20px; min-height: 400px; }
            .left-sidebar { border-right: 1px solid #e2e8f0; padding-right: 15px; font-size: 12px; }
            .right-content { font-size: 14px; }
            .rx-symbol { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; font-family: serif; }
            .medicines { white-space: pre-wrap; line-height: 1.6; font-family: monospace; font-size: 13px; background: #fdfdfd; padding: 10px; border-left: 3px solid #2563eb; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; }
            .signature-line { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="rx-container">
            <div class="header">
              <div class="clinic-info">
                <h1>ChamberNex Medical</h1>
                <p>Professional Healthcare & Clinical Management</p>
              </div>
              <div class="doctor-info">
                <h3>Dr. Specialist Doctor</h3>
                <p>MBBS, FCPS (Medicine)</p>
                <p>Registration No: A-12345</p>
              </div>
            </div>

            <div class="patient-box">
              <div><strong>Patient Name:</strong> ${selectedPatient?.name}</div>
              <div><strong>Patient ID:</strong> ${selectedPatient?.customId || 'N/A'}</div>
              <div><strong>Date:</strong> ${visitDate}</div>
              <div><strong>Age:</strong> ${selectedPatient?.age} yrs | <strong>Gender:</strong> ${selectedPatient?.gender}</div>
              <div><strong>Phone:</strong> ${selectedPatient?.phone}</div>
              <div><strong>Diagnosis:</strong> ${visit.diagnosis || 'Not Specified'}</div>
            </div>

            <div class="body-section">
              <div class="left-sidebar">
                <p><strong>Vitals / Notes:</strong></p>
                <p>Status: ${visit.status}</p>
                ${visit.prescription?.tests ? `<p><strong>Advised Tests:</strong><br/>${visit.prescription.tests}</p>` : ''}
                ${visit.prescription?.testReports ? `<p><strong>Attached Report:</strong><br/>${visit.prescription.testReports}</p>` : ''}
              </div>
              <div class="right-content">
                <div class="rx-symbol">R<sub>x</sub></div>
                <div class="medicines">${visit.prescription?.medicines || 'No medicines prescribed.'}</div>

                ${visit.prescription?.advice ? `
                  <div style="margin-top: 20px;">
                    <strong>Advice / Instructions:</strong>
                    <p style="font-size: 13px; color: #334155; margin-top: 4px;">${visit.prescription.advice}</p>
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="footer">
              <div>
                <p>Consultation Fee: ৳${visit.consultationFee} (Paid: ৳${visit.feePaid})</p>
                <p style="color: #64748b; font-size: 10px;">This prescription is generated electronically via ChamberNex.live</p>
              </div>
              <div class="signature-line">Doctor's Signature</div>
            </div>
          </div>
        </body>
      </html>
    `);

    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 600);
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isDarkMode ? 'bg-[#0b132b] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Header */}
      <header
        className={`border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md ${
          isDarkMode ? 'bg-[#1c2541] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 sm:p-2.5 rounded-xl text-white font-bold shadow-lg">📁</div>
            <div>
              <h1 className="text-base sm:text-xl font-bold tracking-wide">Master Patient Records</h1>
              <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Lifetime history & profile resolver
              </p>
            </div>
          </div>
          {/* Quick back button mobile top alignment or responsive block */}
          <a
            href="/dashboard/doctor"
            className={`md:hidden border px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
            }`}
          >
            ← Queue
          </a>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <a
            href="/dashboard/doctor"
            className={`border px-4 py-2 rounded-xl text-sm font-medium transition ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
            }`}
          >
            ← Back to Live Queue Console
          </a>
        </div>
      </header>

      {/* Mobile/Tablet Screen Switcher Bar (<1024px) */}
      <div className={`flex lg:hidden border-b p-2 ${isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
        <button
          type="button"
          onClick={() => setMobileView('DIRECTORY_LIST')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
            mobileView === 'DIRECTORY_LIST'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-700'
          }`}
        >
          🔍 Patient Directory ({filteredPatients.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileView('PATIENT_DETAILS')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
            mobileView === 'PATIENT_DETAILS'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-700'
          }`}
        >
          📂 Selected Profile ({selectedPatient?.name.split(' ')[0] || 'None'})
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 p-4 sm:p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Left List Pane (Hidden on mobile if PATIENT_DETAILS tab is active) */}
        <div
          className={`border rounded-2xl p-4 flex flex-col shadow-lg space-y-4 ${
            mobileView === 'PATIENT_DETAILS' ? 'hidden lg:flex' : 'flex'
          } ${
            isDarkMode ? 'bg-[#1c2541] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div>
            <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Search Patient Database
            </h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or ID..."
              className={`w-full border rounded-xl px-3 py-2 text-xs transition focus:outline-none focus:border-blue-500 ${
                isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 max-h-[calc(100vh-270px)] lg:max-h-[calc(100vh-250px)] pr-1">
            {filteredPatients.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No patient records found.</p>
            ) : (
              filteredPatients.map((p) => {
                const isSelected = selectedPatient?.id === p.id;
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
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-600 border-slate-300'
                        }`}
                      >
                        {p.visits.length} visit{p.visits.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Ph: {p.phone} {p.customId ? `• ID: ${p.customId}` : ''}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane (Hidden on mobile if DIRECTORY_LIST tab is active) */}
        <div
          className={`border rounded-2xl p-4 sm:p-6 shadow-lg lg:col-span-2 flex flex-col justify-between ${
            mobileView === 'DIRECTORY_LIST' ? 'hidden lg:flex' : 'flex'
          } ${
            isDarkMode ? 'bg-[#1c2541] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {selectedPatient ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                {/* Mobile Back to List Button inside Details view */}
                <div className="flex lg:hidden pb-2 border-b border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setMobileView('DIRECTORY_LIST')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                  >
                    ← Back to Directory List
                  </button>
                </div>

                {/* Patient Summary Header */}
                <div
                  className={`border p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start gap-4 ${
                    isDarkMode ? 'border-slate-700 bg-[#131b2e]' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedPatient.name}</h2>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Patient ID: <span className="text-blue-400 font-medium">{selectedPatient.customId || 'N/A'}</span> | Age: {selectedPatient.age} yrs | Gender: {selectedPatient.gender}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Phone: <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{selectedPatient.phone}</span> {selectedPatient.emergencyPhone ? `| Emergency: ${selectedPatient.emergencyPhone}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsMergingModalOpen(true)}
                    className="w-full sm:w-auto bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs px-3.5 py-2 rounded-xl font-medium transition cursor-pointer text-center"
                  >
                    🔗 Merge Duplicate Profile
                  </button>
                </div>

                {/* Lifetime Visit & Medical History Timeline */}
                <div>
                  <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Complete Medical & Visit History ({selectedPatient.visits.length})
                  </h3>
                  <div className="space-y-4 max-h-[calc(100vh-420px)] lg:max-h-[calc(100vh-380px)] overflow-y-auto pr-2">
                    {selectedPatient.visits.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No visit history recorded yet.</p>
                    ) : (
                      selectedPatient.visits.map((visit, index) => (
                        <div
                          key={visit.id}
                          className={`border p-3.5 sm:p-4 rounded-xl space-y-3 ${
                            isDarkMode ? 'border-slate-700/80 bg-slate-900/50 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className={`flex flex-col sm:flex-row justify-between sm:items-center text-xs border-b pb-2 gap-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                            <span className="font-semibold text-blue-400">
                              Visit #{selectedPatient.visits.length - index} — {visit.createdAt ? new Date(visit.createdAt).toLocaleDateString() : 'Recent'}
                            </span>
                            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
                              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                                Diagnosis: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-900'}>{visit.diagnosis || 'Pending/Not Specified'}</strong>
                              </span>
                              <button
                                onClick={() => handlePrintPrescription(visit)}
                                className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] px-2.5 py-1 rounded-lg transition font-medium cursor-pointer"
                              >
                                🖨️ Print Rx
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2 text-xs">
                            {visit.prescription ? (
                              <>
                                <div
                                  className={`font-mono p-2.5 rounded-lg border ${
                                    isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-800'
                                  }`}
                                >
                                  <b>Rx:</b> <span className="whitespace-pre-wrap">{visit.prescription.medicines}</span>
                                </div>
                                {visit.prescription.tests && (
                                  <p><b>Tests:</b> {visit.prescription.tests}</p>
                                )}
                                {visit.prescription.testReports && (
                                  <div
                                    className={`p-3 rounded-xl border mt-2 flex items-center justify-between gap-3 ${
                                      isDarkMode ? 'bg-slate-800/60 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3 overflow-hidden">
                                      <div className="bg-blue-600/20 text-blue-400 p-2.5 rounded-lg text-lg">
                                        📎
                                      </div>
                                      <div className="truncate">
                                        <p className="text-xs font-semibold truncate">
                                          {visit.prescription.testReports.split('/').pop()?.split('?')[0] || 'Medical Report File'}
                                        </p>
                                        <p className="text-[10px] text-slate-400">Secure Vault Record</p>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      disabled={loadingReportId === visit.id}
                                      onClick={async () => {
                                        const val = visit.prescription?.testReports || '';
                                        setLoadingReportId(visit.id);
                                        try {
                                          const res = await getDecryptedReportByPathAction(val);
                                          if (res.success && res.fileData) {
                                            const byteCharacters = atob(res.fileData);
                                            const byteNumbers = new Array(byteCharacters.length);
                                            for (let i = 0; i < byteCharacters.length; i++) {
                                              byteNumbers[i] = byteCharacters.charCodeAt(i);
                                            }
                                            const byteArray = new Uint8Array(byteNumbers);

                                            // Detect file type and open cleanly
                                            const isImage = /\.(jpg|jpeg|png|webp)$/i.test(val);
                                            const mimeType = isImage ? 'image/jpeg' : 'application/pdf';

                                            const blob = new Blob([byteArray], { type: mimeType });
                                            const blobUrl = URL.createObjectURL(blob);
                                            window.open(blobUrl, '_blank', 'noopener,noreferrer');
                                          } else {
                                            alert(`Failed to load file: ${res.error || 'Unknown error'}`);
                                          }
                                        } catch (err: any) {
                                          alert(`Error opening file: ${err.message || 'Unknown error'}`);
                                        } finally {
                                          setLoadingReportId(null);
                                        }
                                      }}
                                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3.5 py-1.5 rounded-lg transition font-medium whitespace-nowrap shadow cursor-pointer disabled:opacity-50"
                                    >
                                      {loadingReportId === visit.id ? 'Opening...' : 'View File'}
                                    </button>
                                  </div>
                                )}
                                {visit.prescription.advice && (
                                  <p><b>Advice:</b> {visit.prescription.advice}</p>
                                )}
                              </>
                            ) : (
                              <p className="text-slate-500 italic">No prescription generated for this visit.</p>
                            )}
                          </div>

                          <div className={`flex flex-col sm:flex-row sm:justify-between text-[11px] pt-1 border-t gap-1 ${isDarkMode ? 'border-slate-800/60 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
                            <span>Status: {visit.status}</span>
                            <span>Fee: ৳{visit.consultationFee} (Paid: ৳{visit.feePaid})</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
              <span className="text-3xl mb-2">📁</span>
              <p className="text-xs">Select a patient from the directory list to inspect lifetime medical history.</p>
            </div>
          )}
        </div>
      </div>

      {/* MERGE DUPLICATE PATIENT MODAL */}
      {isMergingModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-[#1c2541] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Merge Duplicate Patient Profile</h3>
            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              If this person registered twice under a different name or phone number, choose the duplicate profile below to absorb all its visits into <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-900'}>{selectedPatient?.name}</strong>, then delete the duplicate profile.
            </p>

            <form onSubmit={handleMergeSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Select Duplicate Patient to Absorb
                </label>
                <select
                  required
                  value={targetMergeId}
                  onChange={(e) => setTargetMergeId(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                    isDarkMode ? 'bg-[#131b2e] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">-- Choose duplicate patient profile --</option>
                  {patients
                    .filter((p) => p.id !== selectedPatient?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.phone}) — {p.visits.length} visits
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMergingModalOpen(false)}
                  className={`text-xs px-4 py-2 rounded-xl transition cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !targetMergeId}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-5 py-2 rounded-xl font-medium transition shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Merging...' : 'Confirm & Merge Records'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
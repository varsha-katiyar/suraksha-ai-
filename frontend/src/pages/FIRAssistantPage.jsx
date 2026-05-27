import React, { useState } from 'react';
import { FileText, Download, CheckSquare, Square, ChevronDown, ChevronUp, Copy, Phone, ArrowRight, Printer } from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const INCIDENT_TYPES = [
  { id: 'accident', label: '💥 Road Accident', desc: 'Normal collision or crash' },
  { id: 'hit_and_run', label: '🚨 Hit & Run', desc: 'Vehicle fled the scene' },
  { id: 'theft', label: '🔐 Vehicle Theft', desc: 'Vehicle got stolen' },
  { id: 'fire', label: '🔥 Vehicle Fire', desc: 'Vehicle caught fire' },
];

const ROAD_TYPES = ['National Highway (NH)', 'State Highway (SH)', 'City Road', 'Village Road', 'Expressway'];

const ChecklistItem = ({ text, checked, onToggle }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/60 hover:bg-gray-800/60 transition-all cursor-pointer group" onClick={onToggle}>
    <div className={`w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${checked ? 'bg-green-500' : 'bg-gray-700 group-hover:bg-gray-600'}`}>
      {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
    <p className={`text-xs leading-relaxed transition-colors ${checked ? 'text-green-400 line-through' : 'text-gray-300'}`}>{text}</p>
  </div>
);

export default function FIRAssistantPage() {
  const [activeTab, setActiveTab] = useState('fir'); // fir | checklist
  const [step, setStep] = useState(1); // 1=form, 2=result
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [checkedDocs, setCheckedDocs] = useState({});
  const [checklistType, setChecklistType] = useState('accident');
  const [checklistData, setChecklistData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    victim_name: '',
    contact: '',
    address: '',
    accident_date: new Date().toISOString().split('T')[0],
    accident_time: new Date().toTimeString().slice(0, 5),
    location_description: '',
    road_type: '',
    vehicles: '',
    description: '',
    injuries: '0',
    fatalities: '0',
    hospital: '',
    witnesses: '',
    insurance_company: '',
    policy_number: '',
    incident_type: 'accident',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleGenerateFIR = async () => {
    if (!form.victim_name || !form.location_description || !form.description) {
      alert('Name, location, and description are required!');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      const res = await fetch(`${API}/api/fir/generate`, { method: 'POST', body: fd });
      const data = await res.json();
      setResult(data);
      setStep(2);
    } catch (e) {
      alert('FIR generation failed. Check the backend.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChecklist = async (type) => {
    setChecklistType(type);
    setCheckedDocs({});
    try {
      const res = await fetch(`${API}/api/fir/checklist/${type}`);
      const data = await res.json();
      setChecklistData(data);
    } catch (e) {}
  };

  const copyFIR = () => {
    if (!result?.fir_draft) return;
    navigator.clipboard.writeText(result.fir_draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printFIR = () => {
    const w = window.open('', '_blank');
    w.document.write(`<pre style="font-family:monospace;font-size:13px;padding:20px;">${result?.fir_draft || ''}</pre>`);
    w.document.close();
    w.print();
  };

  const checkedCount = Object.values(checkedDocs).filter(Boolean).length;
  const totalDocs = checklistData?.checklist?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">FIR & Insurance Assistant</h1>
            <p className="text-[11px] text-gray-500">Digital FIR draft + Document checklist — AI powered</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-900 rounded-xl border border-gray-800">
          {[
            { id: 'fir', label: '📋 FIR Draft Generator' },
            { id: 'checklist', label: '✅ Insurance Checklist' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════ FIR TAB ═══════════════ */}
        {activeTab === 'fir' && (
          <>
            {step === 1 && (
              <div className="space-y-5">
                {/* Incident Type */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Incident Type</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {INCIDENT_TYPES.map(t => (
                      <button key={t.id} onClick={() => set('incident_type', t.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          form.incident_type === t.id
                            ? 'border-amber-500/50 bg-amber-500/10 text-white'
                            : 'border-gray-800 bg-gray-900/40 text-gray-400 hover:border-gray-700'
                        }`}>
                        <p className="text-sm font-semibold">{t.label}</p>
                        <p className="text-[10px] opacity-60 mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Personal Details */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: 'Full Name *', key: 'victim_name', placeholder: 'Your full name', required: true },
                      { label: 'Contact Number', key: 'contact', placeholder: '10-digit mobile', type: 'tel' },
                    ].map(({ label, key, placeholder, type, required }) => (
                      <div key={key}>
                        <label className="text-[11px] text-gray-500 block mb-1">{label}</label>
                        <input type={type || 'text'} value={form[key]} onChange={e => set(key, e.target.value)}
                          placeholder={placeholder}
                          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors" />
                      </div>
                    ))}
                    <div className="md:col-span-2">
                      <label className="text-[11px] text-gray-500 block mb-1">Address</label>
                      <input value={form.address} onChange={e => set('address', e.target.value)}
                        placeholder="Home address"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors" />
                    </div>
                  </div>
                </div>

                {/* Accident Details */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Accident Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Date</label>
                      <input type="date" value={form.accident_date} onChange={e => set('accident_date', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Time</label>
                      <input type="time" value={form.accident_time} onChange={e => set('accident_time', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Location Description *</label>
                    <input value={form.location_description} onChange={e => set('location_description', e.target.value)}
                      placeholder="e.g. NH-48, KM marker 234, near Gurgaon toll"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Road Type</label>
                    <select value={form.road_type} onChange={e => set('road_type', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors">
                      <option value="">Select road type</option>
                      {ROAD_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Vehicle Numbers (comma separated)</label>
                    <input value={form.vehicles} onChange={e => set('vehicles', e.target.value)}
                      placeholder="MH04AB1234, UP32CD5678"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">What Happened? *</label>
                    <textarea value={form.description} onChange={e => set('description', e.target.value)}
                      placeholder="Complete accident details — how it happened, speeds, any traffic signals..."
                      rows={4}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors resize-none" />
                  </div>
                </div>

                {/* Casualties + Insurance */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Casualties & Insurance</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Persons Injured</label>
                      <input type="number" min="0" value={form.injuries} onChange={e => set('injuries', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Fatalities</label>
                      <input type="number" min="0" value={form.fatalities} onChange={e => set('fatalities', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Hospital Name (if admitted)</label>
                    <input value={form.hospital} onChange={e => set('hospital', e.target.value)}
                      placeholder="e.g. AIIMS Delhi / City Hospital"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Insurance Company</label>
                      <input value={form.insurance_company} onChange={e => set('insurance_company', e.target.value)}
                        placeholder="e.g. New India Assurance"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Policy Number</label>
                      <input value={form.policy_number} onChange={e => set('policy_number', e.target.value)}
                        placeholder="Policy no."
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Witnesses (name + number)</label>
                    <textarea value={form.witnesses} onChange={e => set('witnesses', e.target.value)}
                      placeholder="1. Ramesh Kumar — 9876543210&#10;2. Priya Sharma — 8765432109"
                      rows={2}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors resize-none" />
                  </div>
                </div>

                <button onClick={handleGenerateFIR} disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating FIR Draft...</>
                    : <><FileText size={16} />Generate FIR Draft</>}
                </button>
              </div>
            )}

            {/* FIR Result */}
            {step === 2 && result && (
              <div className="space-y-5">
                {/* FIR Actions */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-bold text-white">✅ FIR Draft Ready</p>
                    <p className="text-[11px] text-gray-500">Reference: {result.fir_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={copyFIR}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-xs transition-all">
                      <Copy size={12} />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={printFIR}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded-lg text-xs transition-all">
                      <Printer size={12} />
                      Print / Save PDF
                    </button>
                    <button onClick={() => setStep(1)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-xs transition-all">
                      Edit
                    </button>
                  </div>
                </div>

                {/* FIR Text */}
                <div className="rounded-2xl border border-amber-500/20 bg-gray-900/80 overflow-hidden">
                  <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center gap-2">
                    <FileText size={13} className="text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">FIR DRAFT — {result.fir_id}</span>
                  </div>
                  <pre className="p-4 text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-96 overflow-y-auto">
                    {result.fir_draft}
                  </pre>
                </div>

                {/* Next Steps */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Next Steps</h3>
                  <div className="space-y-2">
                    {result.next_steps?.map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-amber-400">{i + 1}</span>
                        </div>
                        <p className="text-xs text-gray-300">{step.slice(3)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Emergency Contacts */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {result.emergency_contacts && Object.entries(result.emergency_contacts).map(([key, num]) => (
                    <a key={key} href={`tel:${num}`}
                      className="rounded-xl border border-gray-800 bg-gray-900/60 p-3 text-center hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group">
                      <Phone size={14} className="text-amber-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-bold text-white">{num}</p>
                      <p className="text-[9px] text-gray-500 capitalize mt-0.5">{key.replace(/_/g, ' ')}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ CHECKLIST TAB ═══════════════ */}
        {activeTab === 'checklist' && (
          <div className="space-y-5">
            {/* Type selector */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Choose Claim Type</p>
              <div className="grid grid-cols-2 gap-2">
                {INCIDENT_TYPES.map(t => (
                  <button key={t.id} onClick={() => fetchChecklist(t.id)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      checklistType === t.id && checklistData
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                        : 'border-gray-800 bg-gray-900/60 text-gray-400 hover:border-gray-700'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {checklistData && (
              <>
                {/* Progress */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400">Documents Ready</p>
                    <p className="text-sm font-bold text-amber-400">{checkedCount} / {totalDocs}</p>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                      style={{ width: `${totalDocs ? (checkedCount / totalDocs) * 100 : 0}%` }} />
                  </div>
                  {checkedCount === totalDocs && totalDocs > 0 && (
                    <p className="text-xs text-green-400 mt-2 text-center animate-pulse">
                      ✅ All documents are ready! File your claim.
                    </p>
                  )}
                </div>

                {/* Checklist items */}
                <div className="space-y-2">
                  {checklistData.checklist?.map((item, i) => (
                    <ChecklistItem key={i} text={item}
                      checked={!!checkedDocs[i]}
                      onToggle={() => setCheckedDocs(c => ({ ...c, [i]: !c[i] }))} />
                  ))}
                </div>

                {/* Tip */}
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <p className="text-xs text-blue-300">
                    💡 <strong>Pro Tip:</strong> {checklistData.tip}
                  </p>
                </div>
              </>
            )}

            {!checklistData && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
                <FileText size={32} className="text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Choose a claim type above and view the checklist</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

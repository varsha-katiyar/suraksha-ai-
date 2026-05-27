import React, { useState, useEffect } from 'react';
import { Eye, MapPin, Camera, Send, Trophy, Users, CheckCircle, AlertTriangle, Upload, Mic, Star } from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const INCIDENT_TYPES = [
  { id: 'accident', label: 'Road Accident', emoji: '💥', color: '#ef4444' },
  { id: 'breakdown', label: 'Vehicle Breakdown', emoji: '🚗', color: '#f97316' },
  { id: 'flooding', label: 'Road Flooding', emoji: '🌊', color: '#3b82f6' },
  { id: 'fire', label: 'Fire / Smoke', emoji: '🔥', color: '#ef4444' },
  { id: 'animal', label: 'Animal on Road', emoji: '🐄', color: '#eab308' },
  { id: 'pothole', label: 'Dangerous Pothole', emoji: '🕳️', color: '#8b5cf6' },
  { id: 'debris', label: 'Road Debris', emoji: '⚠️', color: '#94a3b8' },
  { id: 'construction', label: 'Construction Block', emoji: '🚧', color: '#f59e0b' },
];

const SEVERITY_OPTIONS = [
  { id: 'low', label: 'Minor', color: '#22c55e', desc: 'No serious problem' },
  { id: 'medium', label: 'Moderate', color: '#eab308', desc: 'Needs attention' },
  { id: 'high', label: 'Serious', color: '#f97316', desc: 'Emergency help needed' },
  { id: 'critical', label: 'Critical', color: '#ef4444', desc: 'Life threatening situation' },
];

export default function WitnessReportPage() {
  const [step, setStep] = useState(1); // 1=type, 2=severity+details, 3=success
  const [form, setForm] = useState({
    incident_type: '',
    severity_guess: 'medium',
    description: '',
    reporter_name: '',
    photo: null,
  });
  const [location, setLocation] = useState(null);
  const [locError, setLocError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Auto-get location on load
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setLocError('GPS not available — please enable location')
    );
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API}/api/witness/leaderboard`);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (e) {}
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(f => ({ ...f, photo: file }));
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!location) { setLocError('Location required to report'); return; }
    if (!form.incident_type) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('lat', location.lat);
      fd.append('lon', location.lon);
      fd.append('incident_type', form.incident_type);
      fd.append('severity_guess', form.severity_guess);
      fd.append('description', form.description);
      fd.append('reporter_name', form.reporter_name || 'Anonymous');
      if (form.photo) fd.append('photo', form.photo);

      const res = await fetch(`${API}/api/witness/quick-report`, { method: 'POST', body: fd });
      const data = await res.json();
      setResult(data);
      setStep(3);
      fetchLeaderboard();
    } catch (e) {
      alert('Report failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setForm({ incident_type: '', severity_guess: 'medium', description: '', reporter_name: '', photo: null });
    setPhotoPreview(null);
    setResult(null);
  };

  const selectedType = INCIDENT_TYPES.find(t => t.id === form.incident_type);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Eye size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Witness Report</h1>
            <p className="text-[11px] text-gray-500">Anonymous 2-tap reporting — No login required</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            {location
              ? <><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span className="text-[11px] text-green-400">GPS Ready</span></>
              : <><div className="w-1.5 h-1.5 rounded-full bg-red-400" /><span className="text-[11px] text-red-400">No GPS</span></>}
          </div>
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div className="flex items-center gap-2">
            {[1, 2].map(s => (
              <React.Fragment key={s}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  step >= s ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-500'
                }`}>{s}</div>
                {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-violet-500' : 'bg-gray-800'}`} />}
              </React.Fragment>
            ))}
            <span className="text-xs text-gray-500 ml-2">{step === 1 ? 'Choose Incident Type' : 'Add Details'}</span>
          </div>
        )}

        {/* STEP 1 — Choose Type */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">What did you see? Choose incident type:</p>
            <div className="grid grid-cols-2 gap-3">
              {INCIDENT_TYPES.map(type => (
                <button key={type.id}
                  onClick={() => { setForm(f => ({ ...f, incident_type: type.id })); setStep(2); }}
                  className="group relative rounded-2xl border border-gray-800 bg-gray-900/60 p-4 text-left hover:border-gray-600 hover:bg-gray-800/80 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <div className="text-2xl mb-2">{type.emoji}</div>
                  <p className="text-sm font-semibold text-white">{type.label}</p>
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ boxShadow: `inset 0 0 0 1px ${type.color}40` }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Details */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Selected type badge */}
            <div className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-xl border border-gray-700">
              <span className="text-xl">{selectedType?.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-white">{selectedType?.label}</p>
                <button onClick={() => setStep(1)} className="text-[11px] text-violet-400 hover:text-violet-300">Change →</button>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-green-400">
                <MapPin size={11} />
                {location ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : 'Locating...'}
              </div>
            </div>

            {/* Severity */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">How Serious Is It?</p>
              <div className="grid grid-cols-2 gap-2">
                {SEVERITY_OPTIONS.map(sev => (
                  <button key={sev.id}
                    onClick={() => setForm(f => ({ ...f, severity_guess: sev.id }))}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.severity_guess === sev.id
                        ? 'border-current bg-current/10'
                        : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
                    }`}
                    style={form.severity_guess === sev.id ? { borderColor: sev.color, color: sev.color } : { color: '#94a3b8' }}>
                    <p className="text-sm font-bold">{sev.label}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{sev.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Description (Optional)</p>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What happened? How many vehicles? Is anyone injured? (30 words enough)"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 transition-colors"
                rows={3}
              />
            </div>

            {/* Photo upload */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Photo (Optional — Strong Evidence!)</p>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-700 hover:border-violet-500/50 bg-gray-900/40 cursor-pointer transition-all group">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                  <Camera size={18} className="text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">{form.photo ? form.photo.name : 'Tap to add photo'}</p>
                  <p className="text-[10px] text-gray-600">JPG, PNG, HEIC supported</p>
                </div>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
              </label>
              {photoPreview && (
                <div className="mt-2 rounded-xl overflow-hidden h-32 w-full">
                  <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Name (optional) */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Your Name (Optional — For the badge!)</p>
              <input
                type="text"
                value={form.reporter_name}
                onChange={e => setForm(f => ({ ...f, reporter_name: e.target.value }))}
                placeholder="Anonymous (default)"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            {locError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-xs">{locError}</p>
              </div>
            )}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={loading || !location}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2 text-sm">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</>
                : <><Send size={16} />Report Incident Now</>}
            </button>
          </div>
        )}

        {/* STEP 3 — Success */}
        {step === 3 && result && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Report Submitted!</h2>
              <p className="text-sm text-gray-400 mb-4">{result.message}</p>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-4"
                style={{
                  borderColor: result.badge?.color + '60',
                  background: result.badge?.color + '15',
                  color: result.badge?.color
                }}>
                <Star size={14} />
                <span className="text-sm font-bold">{result.badge?.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left mt-4">
                <div className="bg-gray-900/60 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500">Report ID</p>
                  <p className="text-sm font-bold text-white font-mono">{result.report_id}</p>
                </div>
                <div className="bg-gray-900/60 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500">Type</p>
                  <p className="text-sm font-bold text-white capitalize">{form.incident_type?.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {result.is_new_incident && (
                <div className="mt-3 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-left">
                  <p className="text-xs text-violet-300">✨ New incident created! Authorities have been notified.</p>
                </div>
              )}
            </div>

            <button onClick={resetForm}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-sm transition-all border border-gray-700">
              + Report Another Incident
            </button>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-yellow-400" />
              <h3 className="text-sm font-bold text-white">Life Saver Leaderboard</h3>
              <span className="text-[10px] text-gray-500 ml-auto">{leaderboard.length} heroes</span>
            </div>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry) => (
                <div key={entry.rank} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-800/60">
                  <span className={`text-sm font-black w-5 text-center ${
                    entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-gray-300' : entry.rank === 3 ? 'text-amber-600' : 'text-gray-500'
                  }`}>#{entry.rank}</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white">{entry.name}</p>
                    <p className="text-[10px]" style={{ color: entry.badge?.color }}>{entry.badge?.name}</p>
                  </div>
                  <span className="text-sm font-bold text-violet-400">{entry.reports} reports</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Why Report?</h3>
          <div className="space-y-3">
            {[
              { emoji: '🚑', text: 'Your report can make emergency dispatch faster' },
              { emoji: '🛡️', text: 'Upcoming drivers will know about the danger zone in advance' },
              { emoji: '🏆', text: 'Report and earn badges — Be a Life Saver!' },
              { emoji: '🔒', text: 'Anonymous reporting — no personal data is saved' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-base">{item.emoji}</span>
                <p className="text-xs text-gray-400">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, AlertTriangle, Car, Shield, Volume2, VolumeX, Wifi, WifiOff, Moon, Sun, Navigation } from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', bg: 'bg-red-500/20', border: 'border-red-500/50', label: 'CRITICAL', pulse: true },
  high:     { color: '#f97316', bg: 'bg-orange-500/20', border: 'border-orange-500/50', label: 'HIGH', pulse: true },
  medium:   { color: '#eab308', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', label: 'MEDIUM', pulse: false },
  low:      { color: '#22c55e', bg: 'bg-green-500/20', border: 'border-green-500/50', label: 'LOW', pulse: false },
};

export default function DriverAlertPage() {
  const [monitoring, setMonitoring] = useState(false);
  const [currentPos, setCurrentPos] = useState(null);
  const [alertData, setAlertData] = useState(null);
  const [nightRisk, setNightRisk] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);
  const [checkCount, setCheckCount] = useState(0);
  const [gpsError, setGpsError] = useState(null);
  const [activeZones, setActiveZones] = useState([]);
  const [language, setLanguage] = useState('hi');
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const lastAlertRef = useRef(null);

  const speakAlert = useCallback((message) => {
    if (!voiceEnabled || !message) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.9;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    } catch (e) { console.warn('TTS failed:', e); }
  }, [voiceEnabled, language]);

  const checkProximity = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(`${API}/api/driver-alert/check-proximity?lat=${lat}&lon=${lon}&lang=${language}&radius_km=3`);
      const data = await res.json();
      setAlertData(data);
      setLastCheck(new Date().toLocaleTimeString('en-IN'));
      setCheckCount(c => c + 1);
      if (data.alert && data.voice_message && lastAlertRef.current !== data.nearest_incident?.incident_id) {
        speakAlert(data.voice_message);
        lastAlertRef.current = data.nearest_incident?.incident_id;
      }
      return data;
    } catch (e) { console.error('Proximity check failed:', e); }
  }, [language, speakAlert]);

  const fetchNightRisk = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(`${API}/api/driver-alert/night-risk?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      setNightRisk(data);
    } catch (e) { console.error('Night risk failed:', e); }
  }, []);

  const fetchActiveZones = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/driver-alert/active-zones`);
      const data = await res.json();
      setActiveZones(data.zones || []);
    } catch (e) { console.error('Zones fetch failed:', e); }
  }, []);

  const startMonitoring = () => {
    if (!navigator.geolocation) {
      setGpsError('GPS is not supported by your browser.');
      return;
    }
    setMonitoring(true);
    setGpsError(null);
    fetchActiveZones();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentPos({ lat: latitude, lon: longitude, accuracy: pos.coords.accuracy });
        checkProximity(latitude, longitude);
        fetchNightRisk(latitude, longitude);
      },
      (err) => { setGpsError(`GPS Error: ${err.message}`); },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    // Also poll every 15 seconds
    intervalRef.current = setInterval(() => {
      if (currentPos) checkProximity(currentPos.lat, currentPos.lon);
    }, 15000);
  };

  const stopMonitoring = () => {
    setMonitoring(false);
    setAlertData(null);
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    window.speechSynthesis.cancel();
  };

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const isNight = new Date().getHours() >= 20 || new Date().getHours() <= 5;
  const hasAlert = alertData?.alert;
  const topSev = hasAlert ? (alertData.nearest_incident?.severity || 'medium') : null;
  const sevConfig = topSev ? SEVERITY_CONFIG[topSev] || SEVERITY_CONFIG.medium : null;

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-all duration-700 ${
      hasAlert
        ? 'bg-gradient-to-br from-gray-950 via-red-950/30 to-gray-950'
        : 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950'
    }`}>
      {/* Animated alert border when danger */}
      {hasAlert && sevConfig?.pulse && (
        <div className="fixed inset-0 pointer-events-none z-50 border-4 border-red-500 animate-pulse rounded-none" />
      )}

      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Car size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Driver Alert System</h1>
              <p className="text-[11px] text-gray-500">Real-time danger zone proximity monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setVoiceEnabled(v => !v)}
              className={`p-2 rounded-lg border transition-all ${voiceEnabled ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-gray-700 bg-gray-800 text-gray-500'}`}
              title={voiceEnabled ? 'Voice ON' : 'Voice OFF'}>
              {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-2 py-1.5">
              <option value="hi">हिंदी</option>
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
              <option value="te">తెలుగు</option>
              <option value="mr">मराठी</option>
            </select>
          </div>
        </div>

        {/* Main control card */}
        <div className={`relative rounded-2xl border p-6 overflow-hidden transition-all duration-500 ${
          hasAlert
            ? `${sevConfig?.bg} ${sevConfig?.border}`
            : 'bg-gray-900/80 border-gray-800'
        }`}>
          {/* Animated bg glow when alert */}
          {hasAlert && (
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none animate-pulse" />
          )}

          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Status circle */}
            <div className="relative flex-shrink-0">
              <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
                !monitoring
                  ? 'border-gray-700 bg-gray-800'
                  : hasAlert
                    ? `border-current animate-pulse`
                    : 'border-green-500 bg-green-500/10'
              }`} style={hasAlert ? { borderColor: sevConfig?.color } : {}}>
                {!monitoring ? (
                  <div className="text-center">
                    <Car size={32} className="text-gray-600 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-600 font-mono">OFFLINE</p>
                  </div>
                ) : hasAlert ? (
                  <div className="text-center">
                    <AlertTriangle size={32} className="mx-auto mb-1 animate-bounce" style={{ color: sevConfig?.color }} />
                    <p className="text-[10px] font-bold font-mono" style={{ color: sevConfig?.color }}>{sevConfig?.label}</p>
                    <p className="text-[9px] text-gray-400">{alertData.alert_count} zone{alertData.alert_count > 1 ? 's' : ''}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Shield size={32} className="text-green-400 mx-auto mb-1" />
                    <p className="text-[10px] text-green-400 font-mono font-bold">SAFE</p>
                    <p className="text-[9px] text-gray-500">3km clear</p>
                  </div>
                )}
              </div>
              {monitoring && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-gray-900 animate-pulse" />
              )}
            </div>

            {/* Info panel */}
            <div className="flex-1 space-y-3 text-center md:text-left">
              {!monitoring ? (
                <>
                  <h2 className="text-xl font-bold text-white">SURAKSHA-AI Driver Mode</h2>
                  <p className="text-sm text-gray-400">
                    Track via GPS. If any accident or incident occurs within a 3km radius, you will get a <strong className="text-white">voice alert</strong> — automatically.
                  </p>
                  <button onClick={startMonitoring}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all text-sm">
                    🚗 Start Drive Mode
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white">
                      {hasAlert ? `⚠️ ${alertData.alert_count} DANGER ZONE${alertData.alert_count > 1 ? 'S' : ''} DETECTED` : '✅ Route Clear'}
                    </h2>
                    {hasAlert && (
                      <p className="text-sm font-medium" style={{ color: sevConfig?.color }}>
                        {alertData.nearest_incident?.message}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-800/60 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-gray-500 mb-0.5">Checks</p>
                      <p className="text-sm font-bold text-cyan-400">{checkCount}</p>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-gray-500 mb-0.5">Last ping</p>
                      <p className="text-sm font-bold text-white">{lastCheck || '—'}</p>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-gray-500 mb-0.5">Accuracy</p>
                      <p className="text-sm font-bold text-green-400">{currentPos?.accuracy ? `±${Math.round(currentPos.accuracy)}m` : '—'}</p>
                    </div>
                  </div>
                  <button onClick={stopMonitoring}
                    className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-all border border-gray-600">
                    ⏹ Stop Monitoring
                  </button>
                </>
              )}
            </div>
          </div>

          {gpsError && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-xs flex items-center gap-2"><WifiOff size={12} /> {gpsError}</p>
            </div>
          )}
        </div>

        {/* All active alerts */}
        {hasAlert && alertData.all_alerts?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Danger Zones Nearby</h3>
            {alertData.all_alerts.map((alert, i) => {
              const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
              return (
                <div key={i} className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border} transition-all`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full`}
                          style={{ background: cfg.color + '30', color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-gray-400 capitalize">{alert.type?.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-sm font-semibold text-white">{alert.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
                    </div>
                    <div className="text-center bg-gray-900/50 rounded-lg px-3 py-2 flex-shrink-0">
                      <p className="text-lg font-bold" style={{ color: cfg.color }}>{alert.distance_km}</p>
                      <p className="text-[9px] text-gray-500">km away</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Night Risk Panel */}
        {nightRisk && (
          <div className={`rounded-2xl border p-5 ${
            nightRisk.risk_score >= 70
              ? 'bg-red-500/10 border-red-500/30'
              : nightRisk.risk_score >= 45
                ? 'bg-orange-500/10 border-orange-500/30'
                : 'bg-green-500/10 border-green-500/30'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isNight ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-yellow-400" />}
                <span className="text-sm font-semibold text-white">Night Risk Score</span>
              </div>
              <span className="text-2xl font-black" style={{ color: nightRisk.risk_color }}>{nightRisk.risk_score}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
              <div className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${nightRisk.risk_score}%`, background: nightRisk.risk_color }} />
            </div>
            <p className="text-xs text-gray-300">{nightRisk.recommendation}</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-gray-900/50 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">Time Period</p>
                <p className="text-xs font-medium text-white">{nightRisk.time_period}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">Nearby Historical</p>
                <p className="text-xs font-medium text-white">{nightRisk.nearby_historical_incidents} incidents</p>
              </div>
            </div>
          </div>
        )}

        {/* Active zones count */}
        {activeZones.length > 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">India Active Incident Zones</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['critical','high','medium','low'].map(sev => {
                const count = activeZones.filter(z => z.severity === sev).length;
                const cfg = SEVERITY_CONFIG[sev];
                return (
                  <div key={sev} className={`rounded-xl border p-3 text-center ${cfg.bg} ${cfg.border}`}>
                    <p className="text-2xl font-black" style={{ color: cfg.color }}>{count}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{cfg.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">How Does It Work?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: '📍', step: '1', title: 'GPS Track', desc: 'Your location is tracked continuously (on device, no data saved)' },
              { icon: '🔍', step: '2', title: 'Proximity Check', desc: 'Active incidents within a 3km radius are checked every 15 seconds' },
              { icon: '🔊', step: '3', title: 'Voice Alert', desc: 'Voice and visual alerts are provided if an incident is found — in your chosen language' },
            ].map(item => (
              <div key={item.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-base flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

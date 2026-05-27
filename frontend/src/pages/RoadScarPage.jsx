import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, CheckCircle, FileText, Send, Camera, ShieldAlert, BarChart3 } from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function RoadScarPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    total_verified: 0,
    clusters_formed: 0,
    drafts_sent: 0,
    accidents_prevented: 0
  });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API}/api/road-scar/status`);
      const data = await res.json();
      if (data.reports) setReports(data.reports);
      setDashboardStats({
        total_verified: data.reports.filter(r => r.is_verified).length,
        clusters_formed: data.clusters?.length || 0,
        drafts_sent: data.drafts?.length || 0,
        accidents_prevented: data.drafts?.length || 0
      });
    } catch (e) {
      console.error("Failed to fetch road scar status", e);
    }
  };

  const simulateReport = async () => {
    setSimulating(true);
    try {
      // Hardcode a location that matches one of the hotspots to trigger a cluster quickly
      const fd = new FormData();
      fd.append("lat", "22.7196");
      fd.append("lon", "75.8577");
      fd.append("damage_type", "Pothole");
      fd.append("description", "Huge crater in the middle of the road. Very dangerous.");
      
      const res = await fetch(`${API}/api/road-scar/report`, { method: "POST", body: fd });
      await res.json();
      await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShieldAlert size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Road Scar Pipeline</h1>
              <p className="text-xs text-gray-400">Citizen Pothole-to-Accident Prevention System</p>
            </div>
          </div>
          <button 
            onClick={simulateReport} 
            disabled={simulating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            {simulating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={16} />}
            Simulate Citizen Report
          </button>
        </div>

        {/* Pipeline Visualizer */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
             <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                <Camera size={20} className="text-blue-400" />
             </div>
             <p className="text-2xl font-black text-white">{reports.length}</p>
             <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Raw Reports</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center relative">
             <div className="absolute top-1/2 -left-6 transform -translate-y-1/2 hidden md:block">
               <ArrowRight className="text-gray-700" size={24} />
             </div>
             <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                <CheckCircle size={20} className="text-green-400" />
             </div>
             <p className="text-2xl font-black text-white">{dashboardStats.total_verified}</p>
             <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">AI Verified</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center relative">
             <div className="absolute top-1/2 -left-6 transform -translate-y-1/2 hidden md:block">
               <ArrowRight className="text-gray-700" size={24} />
             </div>
             <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mb-3">
                <AlertTriangle size={20} className="text-orange-400" />
             </div>
             <p className="text-2xl font-black text-white">{dashboardStats.clusters_formed}</p>
             <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Hotspot Clusters</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center relative">
             <div className="absolute top-1/2 -left-6 transform -translate-y-1/2 hidden md:block">
               <ArrowRight className="text-gray-700" size={24} />
             </div>
             <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mb-3">
                <Send size={20} className="text-red-400" />
             </div>
             <p className="text-2xl font-black text-white">{dashboardStats.drafts_sent}</p>
             <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Drafts to NHAI</p>
          </div>
          <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-500/30 rounded-2xl p-5 flex flex-col items-center justify-center text-center relative shadow-lg shadow-green-500/10 scale-105">
             <div className="absolute top-1/2 -left-6 transform -translate-y-1/2 hidden md:block">
               <ArrowRight className="text-green-500/50" size={24} />
             </div>
             <div className="w-10 h-10 rounded-full bg-green-500/30 flex items-center justify-center mb-3">
                <ShieldAlert size={20} className="text-green-300" />
             </div>
             <p className="text-3xl font-black text-green-400">{dashboardStats.accidents_prevented}</p>
             <p className="text-[10px] font-bold text-green-300 uppercase tracking-widest mt-1">Accidents Prevented</p>
          </div>
        </div>

        {/* Report Feed */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/80 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Live Verification Feed</h2>
            <button onClick={fetchStatus} className="text-xs text-indigo-400 hover:text-indigo-300">Refresh Feed</button>
          </div>
          <div className="divide-y divide-gray-800/50">
            {reports.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No reports processed yet. Click 'Simulate' to start pipeline.</div>
            ) : (
              [...reports].reverse().map(report => (
                <div key={report.id} className="p-4 flex flex-col md:flex-row items-center gap-4 hover:bg-gray-800/20 transition-colors">
                  <div className="w-24 h-16 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden border border-gray-700 flex items-center justify-center">
                    {report.photo_url ? (
                      <img src={report.photo_url} alt="Damage" className="w-full h-full object-cover opacity-60" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-orange-900/20 rounded-lg border border-orange-800">
                        <span className="text-4xl">⚠️</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white">{report.damage_type || 'Road Damage'}</span>
                      <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{report.id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><MapPin size={10} className="text-indigo-400"/> {report.lat.toFixed(4)}, {report.lon.toFixed(4)}</span>
                      <span>•</span>
                      <span>{new Date(report.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className="w-full md:w-auto flex flex-col items-end gap-2 mt-3 md:mt-0">
                    {report.is_verified ? (
                       <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400 uppercase">
                         <CheckCircle size={10} /> Gemini Verified
                       </span>
                    ) : (
                       <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold text-yellow-400 uppercase">
                         Pending Verification
                       </span>
                    )}
                    {report.clustered && (
                      <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 uppercase">
                          <FileText size={10} /> Auto-Drafted to PWD
                        </span>
                        <button 
                          onClick={() => window.open(`${API}/api/road-scar/complaint-pdf/${report.cluster_id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-xs font-semibold rounded transition-all">
                          <FileText size={12} /> Download Complaint PDF
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Arrow helper
function ArrowRight({ size, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14"></path>
      <path d="m12 5 7 7-7 7"></path>
    </svg>
  );
}

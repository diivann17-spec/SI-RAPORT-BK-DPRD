import React from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  Home,
  QrCode,
  FileSpreadsheet,
  Menu,
  Smartphone
} from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, onOpenMenu }) {
  const { currentRole, members, activities, logs } = useAttendance();

  // Hitung badge warning EWS
  const redCount = members.filter(m => {
    const totalAct = activities.length || 1;
    const mLogs = logs.filter(l => l.memberId === m.id);
    let score = 0;
    activities.forEach(a => {
      const lg = mLogs.find(l => l.activityId === a.id);
      if (lg?.status === 'Hadir' || lg?.status === 'Dinas') score += 1;
      else if (lg?.status === 'Terlambat' || lg?.status === 'Izin' || lg?.status === 'Sakit') score += 0.75;
    });
    return Math.round((score / totalAct) * 100) <= 50;
  }).length;

  const homeTab = currentRole === 'ANGGOTA_DPRD' ? 'member_portal' : 'dashboard';
  const attendanceTab = currentRole === 'ANGGOTA_DPRD' ? 'gps_mobile' : 'webcam_scan';

  const isHomeActive = activeTab === 'dashboard' || activeTab === 'member_portal';
  const isAttendanceActive = activeTab === 'webcam_scan' || activeTab === 'gps_mobile';
  const isRaportActive = activeTab === 'raport';

  return (
    <nav className="no-print fixed bottom-0 inset-x-0 z-40 md:hidden bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400 px-3 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="grid grid-cols-4 items-center justify-items-center max-w-md mx-auto">

        {/* 1. Beranda */}
        <button
          onClick={() => setActiveTab(homeTab)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl w-full transition-all ${isHomeActive
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
            }`}
        >
          <div className={`p-1 rounded-lg ${isHomeActive ? 'bg-emerald-500/10' : ''}`}>
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Beranda</span>
        </button>

        {/* 2. Absensi */}
        <button
          onClick={() => setActiveTab(attendanceTab)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl w-full transition-all ${isAttendanceActive
              ? 'text-cyan-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
            }`}
        >
          <div className={`p-1 rounded-lg ${isAttendanceActive ? 'bg-cyan-500/10' : ''}`}>
            {currentRole === 'ANGGOTA_DPRD' ? <Smartphone className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Absensi</span>
        </button>

        {/* 3. Raport */}
        <button
          onClick={() => setActiveTab('raport')}
          className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl w-full transition-all ${isRaportActive
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
            }`}
        >
          <div className={`p-1 rounded-lg ${isRaportActive ? 'bg-emerald-500/10' : ''}`}>
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Raport</span>
          {redCount > 0 && (
            <span className="absolute top-0.5 right-4 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
          )}
        </button>

        {/* 4. Menu / Drawer */}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl w-full text-slate-400 hover:text-white active:scale-95 transition-all"
        >
          <div className="p-1 rounded-lg">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Menu</span>
        </button>

      </div>
    </nav>
  );
}

import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import dprdLogo from '../logo.png';
import {
  UserCheck,
  ShieldAlert,
  QrCode,
  Smartphone,
  LogOut,
  Clock,
  Menu,
  Bell
} from 'lucide-react';

export default function Navbar({ onOpenMenu, onOpenNotifications }) {
  const {
    currentRole,
    members,
    activities,
    logs,
    currentUser,
    syncStatus,
    logout
  } = useAttendance();

  const [time, setTime] = useState(new Date());

  // Hitung jumlah alert EWS
  const redCount = members.filter(m => {
    const totalAct = activities.length || 1;
    const mLogs = logs.filter(l => l.memberId === m.id);
    let score = 0;
    activities.forEach(a => {
      const lg = mLogs.find(l => l.activityId === a.id);
      const st = String(lg?.status || '').toLowerCase();
      if (st === 'hadir' || st === 'dinas' || st.includes('on time') || st === 'dinas luar') score += 1;
      else if (st.includes('terlambat') || st === 'izin' || st === 'sakit') score += 0.75;
    });
    return Math.round((score / totalAct) * 100) <= 50;
  }).length;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="no-print bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Left: Mobile Hamburger Menu & Brand Logo */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* Hamburger Button (Mobile Only) */}
            <button
              onClick={onOpenMenu}
              className="p-1.5 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 md:hidden transition border border-slate-700/60"
              aria-label="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* DPRD Logo */}
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
              <img
                src={dprdLogo}
                alt="Logo DPRD"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
              />
            </div>

            {/* Brand Title */}
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-wider text-emerald-400">SI-RAPORT</span>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded border border-amber-500/30">
                  BK DPRD
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 leading-tight truncate max-w-[170px] sm:max-w-none">
                BK DPRD Kabupaten Cirebon
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-2 sm:space-x-4">

            {/* Notification Bell with Badge (Mobile & Desktop) */}
            <div className="relative">
              <button
                onClick={onOpenNotifications}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 transition"
                title="Notifikasi & Peringatan Dini"
              >
                <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                {redCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-slate-900">
                    {redCount}
                  </span>
                )}
              </button>
            </div>

            {/* Live Clock WIB (Hidden on Mobile) */}
            <div className={`hidden md:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${syncStatus === 'saved' ? 'border-emerald-800 bg-emerald-950/70 text-emerald-300' : syncStatus === 'syncing' || syncStatus === 'pending' ? 'border-amber-800 bg-amber-950/70 text-amber-300' : 'border-rose-800 bg-rose-950/70 text-rose-300'}`} title="Status koneksi dan sinkronisasi Firestore">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {syncStatus === 'saved' ? 'Tersimpan' : syncStatus === 'pending' || syncStatus === 'syncing' ? 'Menunggu Sinkronisasi' : 'Gagal Disimpan'}
            </div>

            <div className="hidden lg:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs font-mono text-emerald-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB</span>
            </div>

            {/* Role berasal dari sesi terverifikasi, bukan pilihan client. */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-800 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                <span className="text-slate-400 hidden sm:inline">Akses:</span>
                <span className="font-medium text-amber-300 flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs truncate max-w-[90px] sm:max-w-none">
                  {currentRole === 'PETUGAS_BK' && <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  {currentRole === 'PETUGAS_SCAN' && <QrCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  {currentRole === 'ANGGOTA_DPRD' && <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  {currentRole === 'SECRETARIAT_ADMIN' && <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  
                  <span className="truncate">
                    {currentRole === 'PETUGAS_BK' && 'BK'}
                    {currentRole === 'PETUGAS_SCAN' && 'Scan QR'}
                    {currentRole === 'ANGGOTA_DPRD' && 'Anggota'}
                    {currentRole === 'SECRETARIAT_ADMIN' && 'Sekretariat'}
                  </span>
                </span>
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                if (window.confirm('Keluar dari sesi SI-RAPORT?')) {
                  logout();
                }
              }}
              title="Keluar / Logout"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white rounded-lg border border-rose-800 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Logout</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
}

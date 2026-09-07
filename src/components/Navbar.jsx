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
  ChevronDown
} from 'lucide-react';

export default function Navbar() {
  const {
    currentRole,
    setCurrentRole,
    activeMemberId,
    setActiveMemberId,
    members,
    currentUser,
    logout
  } = useAttendance();

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeMember = members.find(m => m.id === activeMemberId) || members[0];

  return (
    <header className="no-print bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & System Title */}
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <img
                src={dprdLogo}
                alt="Logo DPRD"
                className="w-10 h-10 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wider text-emerald-400">SI-RAPORT</span>
                <span className="bg-amber-500/20 text-amber-300 text-xs font-semibold px-2 py-0.5 rounded border border-amber-500/30">BK DPRD</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Sistem Absensi, Monitoring & Raport Kehadiran Anggota</p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-3 sm:space-x-4">

            {/* Live Clock WIB */}
            <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs font-mono text-emerald-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB</span>
            </div>

            {/* Role Simulator Switcher Dropdown */}
            <div className="relative group">
              <div className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer transition text-xs">
                <span className="text-slate-400 hidden sm:inline">Akses:</span>
                <span className="font-medium text-amber-300 flex items-center gap-1.5">
                  {currentRole === 'PETUGAS_BK' && <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
                  {currentRole === 'PETUGAS_SCAN' && <QrCode className="w-3.5 h-3.5 text-cyan-400" />}
                  {currentRole === 'ANGGOTA_DPRD' && <Smartphone className="w-3.5 h-3.5 text-emerald-400" />}
                  {currentRole === 'SECRETARIAT_ADMIN' && <UserCheck className="w-3.5 h-3.5 text-blue-400" />}
                  
                  {currentRole === 'PETUGAS_BK' && 'Badan Kehormatan (BK)'}
                  {currentRole === 'PETUGAS_SCAN' && 'Operator Webcam Scan'}
                  {currentRole === 'ANGGOTA_DPRD' && 'Mode Anggota DPRD'}
                  {currentRole === 'SECRETARIAT_ADMIN' && 'Admin Sekretariat'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Role Select Options */}
              <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 hidden group-hover:block z-50">
                <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase border-b border-slate-700/60 pb-1.5">
                  Simulasi Hak Akses Pengguna
                </div>
                <button
                  onClick={() => setCurrentRole('PETUGAS_BK')}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700 ${currentRole === 'PETUGAS_BK' ? 'text-amber-400 bg-slate-700/50 font-bold' : 'text-slate-200'}`}
                >
                  <span className="flex items-center gap-2">🛡️ Badan Kehormatan (BK)</span>
                </button>
                <button
                  onClick={() => setCurrentRole('PETUGAS_SCAN')}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700 ${currentRole === 'PETUGAS_SCAN' ? 'text-cyan-400 bg-slate-700/50 font-bold' : 'text-slate-200'}`}
                >
                  <span className="flex items-center gap-2">📷 Operator Laptop Scan QR</span>
                </button>
                <button
                  onClick={() => setCurrentRole('ANGGOTA_DPRD')}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700 ${currentRole === 'ANGGOTA_DPRD' ? 'text-emerald-400 bg-slate-700/50 font-bold' : 'text-slate-200'}`}
                >
                  <span className="flex items-center gap-2">📱 Anggota DPRD (App Mobile)</span>
                </button>
                <button
                  onClick={() => setCurrentRole('SECRETARIAT_ADMIN')}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700 ${currentRole === 'SECRETARIAT_ADMIN' ? 'text-blue-400 bg-slate-700/50 font-bold' : 'text-slate-200'}`}
                >
                  <span className="flex items-center gap-2">🏛️ Admin Sekretariat DPRD</span>
                </button>
              </div>
            </div>

            {/* If role is Anggota DPRD, show member picker */}
            {currentRole === 'ANGGOTA_DPRD' && (
              <select
                value={activeMemberId}
                onChange={(e) => setActiveMemberId(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs border border-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 max-w-[160px] truncate"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.fraksi.replace('Fraksi ', '')})
                  </option>
                ))}
              </select>
            )}

            {/* Logout Button */}
            <button
              onClick={() => {
                if (window.confirm('Keluar dari sesi SI-RAPORT?')) {
                  logout();
                }
              }}
              title="Keluar / Logout"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white rounded-lg border border-rose-800 text-xs font-semibold transition"
            >
              <span>Logout</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
}

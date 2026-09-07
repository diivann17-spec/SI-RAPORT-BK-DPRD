import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import dprdLogo from '../logo.png';
import {
  Lock,
  User,
  ShieldCheck,
  Smartphone,
  QrCode,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Info
} from 'lucide-react';

const PRESET_ACCOUNTS = [
  {
    role: 'SECRETARIAT_ADMIN',
    roleLabel: 'Admin Sekretariat DPRD',
    username: 'admin',
    password: 'password123',
    icon: UserCheck,
    color: 'from-blue-600 to-indigo-600',
    border: 'border-blue-500/40',
    badge: 'Full Control',
    desc: 'Pengelolaan data anggota, jadwal agenda rapat, audit trail, & konfigurasi.'
  },
  {
    role: 'PETUGAS_BK',
    roleLabel: 'Badan Kehormatan (BK)',
    username: 'bk_dprd',
    password: 'password123',
    icon: ShieldAlert,
    color: 'from-amber-600 to-orange-600',
    border: 'border-amber-500/40',
    badge: 'Pengawasan & BK',
    desc: 'Monitoring kedisiplinan, evaluasi raport, EWS, & catatan pembinaan BK.'
  },
  {
    role: 'PETUGAS_SCAN',
    roleLabel: 'Operator Laptop Presensi',
    username: 'operator_scan',
    password: 'password123',
    icon: QrCode,
    color: 'from-cyan-600 to-teal-600',
    border: 'border-cyan-500/40',
    badge: 'Console Laptop',
    desc: 'Pemindaian kamera laptop untuk scan QR identitas fisik anggota.'
  },
  {
    role: 'ANGGOTA_DPRD',
    roleLabel: 'Anggota Dewan (DPRD)',
    username: 'anggota_dprd',
    password: 'password123',
    icon: Smartphone,
    color: 'from-emerald-600 to-teal-600',
    border: 'border-emerald-500/40',
    badge: 'Aplikasi Anggota',
    desc: 'Melihat kartu QR pribadi, raport kehadiran mandiri, & absensi GPS.'
  }
];

export default function Login() {
  const { login, members, activeMemberId, setActiveMemberId } = useAttendance();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('SECRETARIAT_ADMIN');
  const [selectedMember, setSelectedMember] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (members.length > 0 && !selectedMember) {
      setSelectedMember(members[0].id);
    }
  }, [members]);

  const handleQuickSelect = (account) => {
    setUsername(account.username);
    setPassword(account.password);
    setSelectedRole(account.role);
    setErrorMsg('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username dan password harus diisi.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Find matching preset or allow generic login
      const matchedPreset = PRESET_ACCOUNTS.find(
        (acc) => acc.username.toLowerCase() === username.toLowerCase().trim()
      );

      let effectiveRole = selectedRole;
      let effectiveName = username;

      if (matchedPreset) {
        effectiveRole = matchedPreset.role;
        effectiveName = matchedPreset.roleLabel;
      }

      // If logging in as Anggota DPRD, match member data
      let chosenMemberId = activeMemberId;
      if (effectiveRole === 'ANGGOTA_DPRD') {
        const found = members.find(m => m.id === selectedMember) || members[0];
        if (found) {
          chosenMemberId = found.id;
          effectiveName = found.name;
          setActiveMemberId(found.id);
        }
      }

      login({
        role: effectiveRole,
        username: username.trim(),
        name: effectiveName,
        memberId: chosenMemberId
      });

      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-900/40 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-center">
        
        {/* Left Info Panel */}
        <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center space-x-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl shadow-xl">
            <div className="w-12 h-12 flex items-center justify-center">
              <img
                src={dprdLogo}
                alt="Logo DPRD"
                className="w-12 h-12 object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
              />
            </div>
            <div className="text-left">
              <h1 className="font-extrabold text-base tracking-wider text-emerald-400">SI-RAPORT</h1>
              <p className="text-[11px] font-bold text-amber-300">BK DPRD PROVINSI / KAB / KOTA</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Sistem Informasi Absensi & Raport Digital BK DPRD
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Pencatatan kehadiran presisi dengan Laptop Webcam QR Scanner, Geofencing GPS Mobile, dan Evaluasi Raport Kedisiplinan Terintegrasi.
            </p>
          </div>

          {/* Quick preset account chips */}
          <div className="space-y-2.5 pt-2">
            <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 justify-center lg:justify-start">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pilih Cepat Akun Simulasi:</span>
            </p>
            <div className="grid grid-cols-2 gap-2 text-left">
              {PRESET_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                const isSelected = selectedRole === acc.role;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickSelect(acc)}
                    className={`p-2.5 rounded-xl border text-xs transition flex flex-col justify-between space-y-1.5 ${
                      isSelected
                        ? `bg-slate-900 ${acc.border} ring-1 ring-emerald-500 shadow-md`
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`p-1.5 rounded-lg bg-gradient-to-tr ${acc.color} text-white`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {acc.badge}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-[11px] text-white truncate">{acc.roleLabel}</p>
                      <p className="text-[10px] text-slate-400 font-mono">user: {acc.username}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white">Masuk ke Sistem SI-RAPORT</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulasi autentikasi disimpan secara lokal pada perangkat Anda.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selector Tabs */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Pilih Hak Akses / Role:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  {PRESET_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => handleQuickSelect(acc)}
                      className={`py-2 px-2 text-[10px] font-bold rounded-lg transition text-center truncate ${
                        selectedRole === acc.role
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {acc.roleLabel.split(' ')[0]} {acc.roleLabel.split(' ')[1] || ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anggota picker if role is Anggota DPRD */}
              {selectedRole === 'ANGGOTA_DPRD' && members.length > 0 && (
                <div className="space-y-1.5 bg-emerald-950/30 p-3 rounded-xl border border-emerald-800/40">
                  <label className="text-xs font-bold text-emerald-300 flex items-center justify-between">
                    <span>Pilih Profil Anggota DPRD:</span>
                    <span className="text-[10px] text-emerald-400/80 font-normal">Identitas Akun</span>
                  </label>
                  <select
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    className="w-full bg-slate-900 text-slate-100 text-xs p-2.5 rounded-xl border border-emerald-700/60 focus:ring-2 focus:ring-emerald-500"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.fraksi}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Username / NIP / ID:</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username akun..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 text-slate-100 text-xs rounded-xl border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Kata Sandi (Password):</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 text-slate-100 text-xs rounded-xl border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition active:scale-[0.99] disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span>Memverifikasi Autentikasi...</span>
                ) : (
                  <>
                    <span>Masuk ke Dashboard Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulasi Mode Lokal Perangkat</span>
              </span>
              <span className="font-mono">SI-RAPORT v2.4</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

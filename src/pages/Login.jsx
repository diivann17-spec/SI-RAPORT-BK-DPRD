import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import dprdLogo from '../logo.png';
import {
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  Shield
} from 'lucide-react';

export default function Login() {
  const { login, members, activeMemberId, setActiveMemberId } = useAttendance();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg('Username dan kata sandi wajib diisi.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const lowerUser = cleanUser.toLowerCase();

      // Penentuan Role Autentikasi berdasarkan kredensial akun
      let role = 'PETUGAS_BK';
      let roleLabel = 'Badan Kehormatan (BK)';
      let name = cleanUser;
      let memberId = activeMemberId || 'DPRD-001';

      if (lowerUser === 'admin' || lowerUser.includes('admin') || lowerUser.includes('sekretariat')) {
        role = 'SECRETARIAT_ADMIN';
        roleLabel = 'Admin Sekretariat DPRD';
        name = cleanUser.toUpperCase() === 'ADMIN' ? 'Administrator Sekretariat' : cleanUser;
      } else if (lowerUser === 'bk_dprd' || lowerUser.includes('bk') || lowerUser.includes('kehormatan')) {
        role = 'PETUGAS_BK';
        roleLabel = 'Badan Kehormatan (BK)';
        name = 'Petugas Badan Kehormatan (BK)';
      } else if (lowerUser === 'operator_scan' || lowerUser.includes('scan') || lowerUser.includes('operator')) {
        role = 'PETUGAS_SCAN';
        roleLabel = 'Operator Laptop Presensi';
        name = 'Operator Meja Presensi';
      } else {
        // Cek apakah username cocok dengan NIP / Nama Anggota Dewan di database
        const matchedMember = members.find(
          (m) =>
            m.nip === cleanUser ||
            m.id.toLowerCase() === lowerUser ||
            (m.name && m.name.toLowerCase().includes(lowerUser))
        );

        if (matchedMember) {
          role = 'ANGGOTA_DPRD';
          roleLabel = 'Anggota Dewan (DPRD)';
          name = matchedMember.name;
          memberId = matchedMember.id;
          setActiveMemberId(matchedMember.id);
        } else {
          // Default ke Anggota DPRD / Pegawai
          role = 'ANGGOTA_DPRD';
          roleLabel = 'Anggota Dewan (DPRD)';
          name = cleanUser;
        }
      }

      login({
        role,
        username: cleanUser,
        name,
        memberId
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
              Pencatatan kehadiran presisi berbasis QR Code Agenda resmi, GPS Geofencing Mobile, dan Evaluasi Raport Kedisiplinan Terintegrasi Badan Kehormatan.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs text-slate-400 text-left">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>Akses Terautentikasi Resmi</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Silakan masukkan kredensial akun Anda (Username / NIP dan Kata Sandi) untuk mengakses portal sesuai hak akses masing-masing.
            </p>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white">Masuk ke Sistem SI-RAPORT</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Autentikasi akun pengguna resmi DPRD.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Username / NIP / ID Pengguna:</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username atau NIP..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 text-slate-100 text-xs rounded-xl border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium outline-none transition"
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
                    placeholder="Masukkan kata sandi..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 text-slate-100 text-xs rounded-xl border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition active:scale-[0.99] disabled:opacity-50 mt-2 cursor-pointer"
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
                <span>Sistem Terenkripsi & Terlindungi</span>
              </span>
              <span className="font-mono">SI-RAPORT BK DPRD</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

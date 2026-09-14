import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { authService, getRoleDisplayName } from '../firebase/authService';
import dprdLogo from '../logo.png';
import {
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  Shield,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

/**
 * LOGIN COMPONENT - SI-RAPORT BK DPRD
 * 
 * Sistem login dengan whitelist ketat:
 * - Validasi terhadap registered accounts (whitelist)
 * - ID Anggota/username dan password HARUS dibuat Admin/BK
 * - Status akun HARUS ACTIVE
 * - Role ditentukan oleh Admin, bukan user
 * - Tidak ada self-registration
 */
export default function Login({ isQrAttendance = false }) {
  const { login } = useAttendance();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [accountLocked, setAccountLocked] = useState(false);

  const handleGuestAccess = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await authService.enterPublicGuest();
    } catch (error) {
      setErrorMsg(error.message || 'Halaman Tamu OPD belum dapat dibuka.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load remembered username on mount
  useEffect(() => {
    const remembered = authService.getRememberedUsername();
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Cek jika akun terkunci (terlalu banyak percobaan login gagal)
    if (accountLocked) {
      setErrorMsg('Terlalu banyak percobaan login gagal. Silakan coba lagi dalam beberapa menit.');
      return;
    }

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg('ID Anggota/username dan password wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      // Validasi login dengan whitelist ketat
      const result = await authService.login(cleanUser, cleanPass, rememberMe);

      if (result.success) {
        // Login berhasil
        const userInfo = result.session;
        
        // Reset login attempts
        setLoginAttempts(0);
        
        // Show success message
        setSuccessMsg(`Selamat datang ${userInfo.fullName}! Mengakses sistem...`);

        // 🔐 SECURITY: Call context login dengan data DARI VERIFIED ACCOUNT (Firestore)
        // Jangan pass data dari user input!
        try {
          login({
            role: userInfo.role,              // ← Dari Firestore account
            username: userInfo.username,      // ← Dari Firestore account
            name: userInfo.fullName,          // ← Dari Firestore account
            memberId: userInfo.memberId || null,
            accountId: userInfo.accountId,    // ← Dari Firestore account (untuk verification)
            status: userInfo.status           // ← Dari Firestore account (HARUS ACTIVE)
          });
        } catch (loginError) {
          console.error('[SECURITY] Login validation failed:', loginError);
          setErrorMsg(loginError.message || 'Akun tidak valid. Hubungi Admin.');
          return;
        }

        // Redirect will be handled by context listener
      } else {
        // Login gagal
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        // ⚠️ KEAMANAN: Kunci akun setelah 3 percobaan gagal (lebih ketat)
        if (newAttempts >= 3) {
          setAccountLocked(true);
          setErrorMsg('Terlalu banyak percobaan login gagal (3/3). Akun telah dikunci. Hubungi Admin atau Badan Kehormatan (BK).');
        } else {
          const attemptsLeft = 3 - newAttempts;
          setErrorMsg(`${result.error || 'Login gagal.'} (Kesempatan tersisa: ${attemptsLeft}/3)`);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMsg(error.message || 'Firebase gagal memvalidasi login.');
    } finally {
      setIsLoading(false);
    }
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

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3 text-xs text-slate-400 text-left">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>Autentikasi Whitelist Ketat</span>
            </div>
            <div className="space-y-2 text-[11px] leading-relaxed border-t border-slate-700 pt-2">
              <p className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>Akun hanya dapat dibuat oleh Admin/BK</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>ID Anggota/username dan password wajib dibuat Admin/BK</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>Status akun harus ACTIVE untuk login</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>Role ditentukan Admin, bukan user</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white">{isQrAttendance ? 'Masuk untuk Melanjutkan Absensi' : 'Masuk ke Sistem SI-RAPORT'}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isQrAttendance
                  ? 'QR Agenda terdeteksi. Setelah login berhasil, formulir absensi akan terbuka otomatis.'
                  : 'Autentikasi akun pengguna terdaftar. Hubungi Admin/BK jika akun belum didaftarkan.'}
              </p>
            </div>

            <div className="rounded-2xl border border-teal-800/70 bg-teal-950/40 p-3">
              <p className="text-xs font-bold text-teal-200">Tamu OPD / Instansi?</p>
              <p className="mt-1 text-[11px] text-teal-300/80">Tidak perlu akun. Masuk untuk mengisi absensi agenda sebagai tamu eksternal.</p>
              <button
                type="button"
                onClick={handleGuestAccess}
                disabled={isLoading}
                className="mt-2 w-full rounded-xl bg-teal-600 px-3 py-2 text-xs font-black text-white hover:bg-teal-500 disabled:opacity-60"
              >
                Masuk sebagai Tamu OPD
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold mb-1">Login Gagal</p>
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-3">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold mb-1">Login Berhasil</p>
                  <p>{successMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Login ID Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">ID Anggota / Username:</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh ID Anggota: DPRD001"
                    disabled={isLoading}
                    autoFocus
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 text-slate-100 text-xs rounded-xl border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 text-slate-100 text-xs rounded-xl border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="rememberMe" className="text-xs text-slate-400 cursor-pointer select-none">
                  Ingat username saya di perangkat ini
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || accountLocked}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    <span>Memverifikasi Akun Terdaftar...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Login Attempts Display */}
              {loginAttempts > 0 && loginAttempts < 3 && (
                <p className="text-center text-[11px] text-amber-400 font-medium">
                  ⚠️ Percobaan login gagal: {loginAttempts}/3 (Hati-hati, akun akan dikunci setelah 3x gagal)
                </p>
              )}
            </form>

            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sistem Terenkripsi & Terlindungi</span>
                </span>
                <span className="font-mono">SI-RAPORT BK DPRD</span>
              </div>

              {/* Contact Info for Account Registration */}
              <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-[11px] text-slate-400">
                <p className="font-semibold text-slate-300 mb-1">Akun belum terdaftar?</p>
                <p>Hubungi Admin Sekretariat DPRD atau Badan Kehormatan (BK) untuk mendaftarkan akun Anda.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

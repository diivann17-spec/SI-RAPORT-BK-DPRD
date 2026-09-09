import React, { useEffect, useState } from 'react';
import { Sparkles, Shield } from 'lucide-react';
import dprdLogo from '../logo.png';

export default function SplashScreen({ onFinish, duration = 5000, showTitle = true, showLoading = true }) {
  const [openingCurtain, setOpeningCurtain] = useState(false);
  const [fadeOutLogo, setFadeOutLogo] = useState(false);
  const [removeDOM, setRemoveDOM] = useState(false);

  // Generate 65 butiran kilau cahaya / partikel lembut
  const [snowflakes] = useState(() =>
    Array.from({ length: 65 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 3.0 + Math.random() * 3.5,
      animationDelay: Math.random() * 2.0,
      size: 2.5 + Math.random() * 5.5,
      opacity: 0.35 + Math.random() * 0.65,
      blur: Math.random() > 0.6 ? 'blur(1px)' : 'none',
    }))
  );

  useEffect(() => {
    // Total durasi = 5 detik (5000ms)
    // Logo tayang anggun selama 2.8 detik pertama
    const logoTimer = setTimeout(() => {
      setFadeOutLogo(true);
    }, 2800);

    // Gorden mulai terbuka pelan & halus di detik ke-3.0
    const curtainTimer = setTimeout(() => {
      setOpeningCurtain(true);
    }, 3000);

    // Di detik ke-5.0 (5000ms), transisi tuntas sepenuhnya
    const finishTimer = setTimeout(() => {
      setRemoveDOM(true);
      if (onFinish) onFinish();
    }, 5000);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(curtainTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  if (removeDOM) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none font-sans">
      
      {/* ─── VALANCE / KAIN GORDEN ATAS (TOP DRAPERY ROUCHES) ─── */}
      <div 
        className={`absolute top-0 inset-x-0 h-10 sm:h-12 z-30 bg-gradient-to-b from-[#021f17] to-[#064e3b] shadow-2xl flex items-center justify-around border-b-2 border-amber-400/80 overflow-hidden transition-opacity duration-1000 ${
          openingCurtain ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Rumbai Emas / Tassel Trim */}
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 0, rgba(251,191,36,0.4) 0%, transparent 60%)',
            backgroundSize: '40px 100%'
          }}
        />
      </div>

      {/* ─── SAYAP GORDEN KIRI (LEFT VELVET CURTAIN) ─── */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-1/2 z-20 curtain-velvet-left transition-transform duration-[1900ms] ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-end ${
          openingCurtain ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Lapisan Bayangan Lipatan Kain */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/35 pointer-events-none" />

        {/* Tali Pengikat Gorden Emas (Sash) */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-16 h-8 rounded-full border-2 border-amber-400/70 bg-gradient-to-r from-amber-500/30 to-amber-600/40 shadow-lg blur-[0.5px]" />

        {/* List Tepi Emas Jahitan Tengah Gorden */}
        <div className="h-full w-2 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-[0_0_15px_rgba(251,191,36,0.9)] z-10" />
      </div>

      {/* ─── SAYAP GORDEN KANAN (RIGHT VELVET CURTAIN) ─── */}
      <div
        className={`absolute top-0 bottom-0 right-0 w-1/2 z-20 curtain-velvet-right transition-transform duration-[1900ms] ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-start ${
          openingCurtain ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* List Tepi Emas Jahitan Tengah Gorden */}
        <div className="h-full w-2 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-[0_0_15px_rgba(251,191,36,0.9)] z-10" />

        {/* Tali Pengikat Gorden Emas (Sash) */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-16 h-8 rounded-full border-2 border-amber-400/70 bg-gradient-to-l from-amber-500/30 to-amber-600/40 shadow-lg blur-[0.5px]" />

        {/* Lapisan Bayangan Lipatan Kain */}
        <div className="absolute inset-0 bg-gradient-to-l from-black/50 via-transparent to-black/35 pointer-events-none" />
      </div>

      {/* ─── PERCIKAN BUTIRAN SALJU (SNOW PARTICLES) ─── */}
      <div className={`absolute inset-0 z-30 pointer-events-none overflow-hidden transition-opacity duration-1000 ${fadeOutLogo ? 'opacity-0' : 'opacity-100'}`}>
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="absolute rounded-full bg-white animate-splash-snow shadow-[0_0_10px_rgba(255,255,255,0.95)]"
            style={{
              left: `${flake.left}%`,
              width: `${flake.size}px`,
              height: `${flake.size}px`,
              opacity: flake.opacity,
              filter: flake.blur,
              animationDuration: `${flake.animationDuration}s`,
              animationDelay: `${flake.animationDelay}s`
            }}
          />
        ))}
      </div>

      {/* ─── KONTEN LOGO & EMBLEM DI TENGAH PANGGUNG ─── */}
      <div
        className={`absolute inset-0 z-40 flex flex-col items-center justify-center p-6 transition-all duration-1000 ease-out ${
          fadeOutLogo ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100'
        }`}
      >
        {/* Lingkaran Lambang Emas DPRD & Logo Resmi */}
        <div className="relative mb-5 group">
          {/* Glowing Aura Effect */}
          <div className="absolute -inset-10 bg-gradient-to-tr from-amber-500/40 via-emerald-400/35 to-amber-300/40 rounded-full blur-3xl animate-pulse" />

          {/* Logo Resmi DPRD */}
          <div className="relative flex items-center justify-center">
            <img
              src={dprdLogo}
              alt="Logo DPRD"
              className="w-32 h-32 sm:w-44 sm:h-44 object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.95)] filter contrast-105 transition-transform duration-1000 hover:scale-105"
            />
          </div>
        </div>

        {showTitle && (
          <div className="text-center space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold tracking-wider uppercase mb-1 shadow-md backdrop-blur-md">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Badan Kehormatan (BK)</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
              SI-RAPORT <span className="text-emerald-400">BK DPRD</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-200 font-semibold tracking-wide drop-shadow">
              Sistem Informasi Absensi, Monitoring & Raport Kehadiran Anggota Dewan
            </p>
          </div>
        )}

        {showLoading && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="w-48 sm:w-60 h-1.5 bg-slate-900/90 rounded-full overflow-hidden border border-amber-400/30 shadow-inner">
              <div className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-300 animate-[pulse_2s_infinite] w-full rounded-full" />
            </div>
            <span className="text-[11px] text-slate-300 font-medium tracking-wide">Mempersiapkan Ruang Sidang & Presensi...</span>
          </div>
        )}
      </div>
    </div>
  );
}

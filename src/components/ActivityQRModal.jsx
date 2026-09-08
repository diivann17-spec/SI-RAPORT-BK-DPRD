import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode, X, Clock, Calendar, MapPin, Users,
  Maximize2, Minimize2, Printer, ShieldCheck, CheckCircle2,
  AlertCircle, Wifi, Copy, ExternalLink, Smartphone, Info
} from 'lucide-react';

/**
 * Mendapatkan URL absensi yang benar untuk QR Code.
 * 
 * LOGIKA:
 * 1. Jika diakses via IP LAN (bukan localhost) → URL sudah benar, langsung pakai.
 * 2. Jika diakses via localhost → HP tidak bisa scan, minta IP LAN dari user.
 * 3. Jika ada IP LAN tersimpan di localStorage → generate URL berbasis IP itu.
 */
function getAbsenUrl(activityId, qrToken) {
  const { protocol, hostname, port, pathname } = window.location;

  // Cek apakah sedang di localhost / 127.0.0.1
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (!isLocalhost) {
    // Sudah diakses via IP LAN / domain produksi — URL sudah bisa di-scan HP ✅
    const portStr = port ? `:${port}` : '';
    const base = `${protocol}//${hostname}${portStr}`;
    return {
      url: `${base}${pathname}?absen=${activityId}&token=${encodeURIComponent(qrToken || activityId)}`,
      isLocalhost: false,
      lanIp: hostname,
      currentPort: port || '',
    };
  }

  // Localhost — cek apakah sudah ada IP LAN tersimpan
  const savedLanIP = localStorage.getItem('siraport_lan_ip') || '';
  const savedPort = port || localStorage.getItem('siraport_lan_port') || '5173';

  if (savedLanIP) {
    const base = `${protocol}//${savedLanIP}:${savedPort}`;
    return {
      url: `${base}${pathname}?absen=${activityId}&token=${encodeURIComponent(qrToken || activityId)}`,
      isLocalhost: true,
      lanIp: savedLanIP,
      currentPort: savedPort,
    };
  }

  // Fallback: localhost (tidak bisa di-scan HP)
  const base = `${protocol}//${hostname}:${port || '5173'}`;
  return {
    url: `${base}${pathname}?absen=${activityId}&token=${encodeURIComponent(qrToken || activityId)}`,
    isLocalhost: true,
    lanIp: '',
    currentPort: port || '5173',
  };
}


export default function ActivityQRModal({ isOpen, onClose, activity }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(new Date());
  // IP LAN dikelola di state — default auto fallback ke IP WiFi 192.168.21.228 jika belum di-set
  const [lanIpInput, setLanIpInput] = useState(
    () => localStorage.getItem('siraport_lan_ip') || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '192.168.21.228' : '')
  );
  const [copied, setCopied] = useState(false);
  const [showLanHelp, setShowLanHelp] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowLanHelp(false);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen || !activity) return null;

  // Hitung status aktif QR berdasarkan jam kegiatan
  const [startH, startM] = (activity.startTime || '08:00').split(':').map(Number);
  const [endH, endM] = (activity.endTime || '16:00').split(':').map(Number);
  const tolerance = Number(activity.toleranceMinutes ?? 30);

  const actDate = new Date(activity.date);
  const startDateTime = new Date(actDate);
  startDateTime.setHours(startH, startM, 0, 0);
  const toleranceDateTime = new Date(startDateTime.getTime() + tolerance * 60 * 1000);
  const endDateTime = new Date(actDate);
  endDateTime.setHours(endH, endM, 0, 0);

  const isNotStarted = now < startDateTime;
  const isExpired = now > endDateTime;
  const isLateWindow = now > toleranceDateTime && now <= endDateTime;
  const isOntimeWindow = now >= startDateTime && now <= toleranceDateTime;

  // ─── Hitung URL QR secara real-time dari state lanIpInput ───────────────
  const { protocol, hostname, port, pathname } = window.location;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  // Di produksi (Vercel) port kosong → tidak perlu ditambahkan. Fallback port hanya untuk localhost dev.
  const activePort = isLocalhost
    ? (port || localStorage.getItem('siraport_lan_port') || '5173')
    : port;
  const activePortStr = activePort ? `:${activePort}` : '';

  // URL yang dikode di QR — selalu aktif, berbasis IP jika ada
  const effectiveLanIp = lanIpInput.trim() || (isLocalhost ? '' : hostname);
  const qrBase = effectiveLanIp
    ? `${protocol}//${effectiveLanIp}${activePortStr}`
    : `${protocol}//${hostname}${activePortStr}`;
  const qrValue = `${qrBase}${pathname.replace(/\/$/, '')}?absen=${activity.id}&token=${encodeURIComponent(activity.qrToken || activity.id)}`;
  const needsLanIp = isLocalhost && !effectiveLanIp;

  const handleSaveLanIp = () => {
    const trimmedIp = lanIpInput.trim();
    if (!trimmedIp) return;
    localStorage.setItem('siraport_lan_ip', trimmedIp);
    localStorage.setItem('siraport_lan_port', activePort);
    // Tidak perlu reload — QR sudah diupdate via state!
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(qrValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md transition-all ${isFullscreen ? 'p-0' : ''}`}>
      <div className={`bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl text-slate-100 flex flex-col overflow-hidden relative ${isFullscreen ? 'max-w-none h-full rounded-none border-none justify-center' : 'max-h-[95vh]'}`}>
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  QR Code Agenda Resmi
                </span>
                <span className="text-xs text-slate-400 font-mono">#{activity.activityNumber || activity.id}</span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white line-clamp-1 mt-0.5">
                {activity.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Layar Penuh Proyektor Rapat"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => window.print()}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Cetak QR Code"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 flex flex-col items-center justify-center text-center space-y-5 overflow-y-auto">
          
          {/* ── PANEL IP LAN (selalu tampil jika localhost) ── */}
          {isLocalhost && (
            <div className={`w-full p-3 rounded-2xl border text-left space-y-2 ${
              effectiveLanIp
                ? 'bg-emerald-950/60 border-emerald-700/50'
                : 'bg-amber-950/70 border-amber-600/50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Wifi className={`w-4 h-4 shrink-0 ${effectiveLanIp ? 'text-emerald-400' : 'text-amber-400'}`} />
                {effectiveLanIp ? (
                  <span className="text-emerald-300 text-xs font-bold">✅ QR siap di-scan via IP: <code className="font-mono">{effectiveLanIp}:{activePort}</code></span>
                ) : (
                  <span className="text-amber-300 text-xs font-bold">⚠️ Masukkan IP WiFi komputer agar HP bisa scan QR</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lanIpInput}
                  onChange={e => setLanIpInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveLanIp()}
                  placeholder="Contoh: 192.168.21.228"
                  className={`flex-1 p-2 bg-slate-800 border rounded-xl text-white text-xs font-mono focus:outline-none ${
                    effectiveLanIp ? 'border-emerald-600/50 focus:border-emerald-400' : 'border-amber-600/50 focus:border-amber-400'
                  }`}
                />
                <button
                  onClick={handleSaveLanIp}
                  className={`px-3 py-2 font-bold rounded-xl text-xs transition ${
                    effectiveLanIp
                      ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  {effectiveLanIp ? 'Update' : 'Aktifkan'}
                </button>
              </div>
              {!effectiveLanIp && (
                <div className="text-[10px] text-amber-200/70 space-y-0.5">
                  <p>Windows: buka <code className="bg-slate-800 px-1 rounded">CMD</code> → ketik <code className="bg-slate-800 px-1 rounded">ipconfig</code> → cari <strong>IPv4</strong></p>
                  <p className="text-amber-400">⚠️ HP &amp; Laptop harus di WiFi yang SAMA!</p>
                </div>
              )}
            </div>
          )}

          {/* Status Masa Aktif QR */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {isExpired ? (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> QR Telah Kedaluwarsa (Agenda Selesai)
              </span>
            ) : isLateWindow ? (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Melewati Toleransi (Status: Terlambat)
              </span>
            ) : isOntimeWindow ? (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="w-4 h-4" /> QR Aktif (Hadir Tepat Waktu)
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Menunggu Jadwal Dimulai ({activity.startTime} WIB)
              </span>
            )}
            <span className="text-xs text-slate-400 font-mono bg-slate-800 px-3 py-1 rounded-full">
              Toleransi: {activity.toleranceMinutes || 30} Menit
            </span>
          </div>

          {/* QR Code Container — Menyesuaikan Status Waktu Otomatis */}
          <div className={`p-5 sm:p-7 bg-white rounded-3xl shadow-2xl border-4 relative ${
            isExpired ? 'border-rose-500/50'
            : isNotStarted ? 'border-blue-500/50'
            : isLateWindow ? 'border-amber-500/60'
            : needsLanIp ? 'border-amber-400/60'
            : 'border-emerald-500/50'
          }`}>
            <QRCodeSVG
              value={qrValue}
              size={isFullscreen ? 340 : 240}
              level="H"
              includeMargin={false}
            />
            {/* Hanya blokir jika sudah expired */}
            {isExpired && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-4 text-white">
                <AlertCircle className="w-12 h-12 text-rose-400 mb-2" />
                <span className="font-bold text-sm text-rose-300">QR Code Nonaktif</span>
                <span className="text-[11px] text-slate-400 mt-1">Kegiatan telah selesai</span>
              </div>
            )}
            {/* Badge peringatan kecil jika masih localhost tanpa IP — QR tetap terlihat */}
            {needsLanIp && !isExpired && (
              <div className="absolute bottom-2 left-2 right-2 bg-amber-600/90 backdrop-blur-sm rounded-lg px-2 py-1 text-center">
                <span className="text-[10px] font-bold text-white">⚠️ Isi IP WiFi di atas agar HP bisa scan</span>
              </div>
            )}
          </div>

          {/* URL Copy & Info */}
          {!isExpired && (
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2 p-3 bg-slate-800/60 rounded-2xl border border-slate-700">
                <code className="flex-1 text-[10px] text-emerald-300 font-mono truncate">
                  {qrValue}
                </code>
                <button
                  onClick={handleCopyUrl}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${
                    copied ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {copied ? '✓ Disalin!' : <><Copy className="w-3 h-3 inline mr-1" />Salin URL</>}
                </button>
                <a
                  href={qrValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-[10px] text-slate-500 text-center">
                📱 Arahkan kamera HP ke QR Code — Google Lens / kamera bawaan akan membuka halaman presensi
              </p>
            </div>
          )}

          {/* Live Jam Server & Jadwal */}
          <div className="space-y-1.5 max-w-md">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-wider">
              {now.toLocaleTimeString('id-ID')} <span className="text-xs font-sans text-emerald-400">WIB</span>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Tanggal</span>
                <span className="font-bold text-white">{activity.date}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Jadwal Sidang</span>
                <span className="font-bold text-white">{activity.startTime} - {activity.endTime} WIB</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Lokasi / Radius</span>
                <span className="font-bold text-white truncate block">{activity.locationName || 'Gedung DPRD'} ({activity.radiusMeters || 150}m)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Note */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Validasi Multi-Faktor: Token QR Unik • GPS Geofencing • Kunci 1 Perangkat 1x Absen</span>
        </div>

      </div>
    </div>
  );
}

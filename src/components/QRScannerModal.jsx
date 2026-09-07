import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { useAttendance } from '../context/AttendanceContext';
import {
  QrCode, CheckCircle2, AlertCircle, X, Camera,
  ShieldCheck, RefreshCw, Building, Loader2, UserX
} from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, selectedActivityId }) {
  const { members, activities, getMemberByQR, getMemberById, recordAttendance } = useAttendance();

  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef(null);
  const scannerDivId = 'qr-reader-scan-box';
  const hasScanned = useRef(false); // prevent double-scan

  const selectedActivity = activities.find(a => a.id === selectedActivityId) || activities[0];

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear();
          scannerRef.current = null;
          setScannerReady(false);
        }).catch(() => {
          scannerRef.current = null;
          setScannerReady(false);
        });
      } catch (e) {
        scannerRef.current = null;
      }
    }
  }, []);

  // Handle QR decoded data → lookup member → record attendance
  const handleQRScanned = useCallback(async (decodedText) => {
    if (hasScanned.current || isProcessing) return;
    hasScanned.current = true;
    setIsProcessing(true);
    setScanError('');

    // Stop kamera segera setelah scan berhasil
    stopScanner();

    const cleanText = (decodedText || '').trim();

    // 1. Cari member dengan helper getMemberByQR
    let member = getMemberByQR(cleanText);

    // 2. Parse jika QR berupa format JSON
    if (!member) {
      try {
        const parsed = JSON.parse(cleanText);
        if (parsed.id) member = getMemberById(parsed.id);
        if (!member && parsed.qrToken) member = getMemberByQR(parsed.qrToken);
        if (!member && parsed.nip) member = members.find(m => m.nip === parsed.nip);
      } catch (e) { /* bukan JSON */ }
    }

    // 3. Cari berdasarkan ID atau NIP langsung
    if (!member) {
      member = members.find(m =>
        m.id === cleanText ||
        m.nip === cleanText ||
        (m.qrToken && cleanText.includes(m.qrToken)) ||
        (m.qrToken && m.qrToken.includes(cleanText))
      );
    }

    // 4. Fuzzy match: jika token mengandung ID atau NIP anggota
    if (!member) {
      member = members.find(m =>
        cleanText.includes(m.id) ||
        (m.nip && cleanText.includes(m.nip)) ||
        (m.name && cleanText.toLowerCase().includes(m.name.toLowerCase()))
      );
    }

    if (!member) {
      setScanError(`QR Code "${cleanText}" tidak cocok dengan data anggota manapun di sistem. Pastikan menggunakan Kartu Digital resmi.`);
      setIsProcessing(false);
      hasScanned.current = false;
      return;
    }

    if (!selectedActivity) {
      setScanError('Tidak ada agenda kegiatan yang dipilih. Pilih agenda kegiatan terlebih dahulu.');
      setIsProcessing(false);
      hasScanned.current = false;
      return;
    }

    // Rekam absensi ke Firestore
    const result = await recordAttendance({
      activityId: selectedActivity.id,
      memberId: member.id,
      method: 'QR_WEBCAM',
      operatorName: 'Petugas Laptop Webcam Scanner',
    });

    if (result.success) {
      setScanResult({ ...result, member });
      setScanError('');
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
    } else {
      setScanError(result.message || 'Gagal menyimpan absensi ke database.');
      hasScanned.current = false;
    }
    setIsProcessing(false);
  }, [isProcessing, getMemberByQR, getMemberById, members, recordAttendance, selectedActivity, stopScanner]);

  // Inisialisasi kamera scanner
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setScanResult(null);
      setScanError('');
      setCameraError('');
      hasScanned.current = false;
      return;
    }

    // Tunggu sebentar agar DOM element ter-render
    const timer = setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerDivId);
        scannerRef.current = html5QrCode;

        // Ambil daftar kamera yang tersedia
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setCameraError('Tidak ada kamera yang terdeteksi. Pastikan kamera laptop/PC terhubung.');
          return;
        }

        // Prioritaskan kamera belakang jika ada, fallback ke kamera pertama
        const backCamera = cameras.find(c =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment')
        );
        const cameraId = backCamera?.id || cameras[0].id;

        await html5QrCode.start(
          cameraId,
          {
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.8);
              return {
                width: qrboxSize,
                height: qrboxSize
              };
            },
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            }
          },
          (decodedText) => handleQRScanned(decodedText),
          () => {} // abaikan error frame tidak terbaca
        );
        setScannerReady(true);
        setCameraError('');
      } catch (err) {
        console.error('Camera start error:', err);
        if (err?.toString().includes('Permission')) {
          setCameraError('Akses kamera ditolak. Izinkan akses kamera di browser (ikon kunci di address bar).');
        } else if (err?.toString().includes('NotFound') || err?.toString().includes('Requested device not found')) {
          setCameraError('Kamera tidak ditemukan. Periksa koneksi kamera dan refresh halaman.');
        } else {
          setCameraError(`Kamera gagal dimulai: ${err?.message || err}`);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, selectedActivityId]);

  // Reset dan scan ulang
  const handleRescan = () => {
    setScanResult(null);
    setScanError('');
    setCameraError('');
    hasScanned.current = false;
    setIsProcessing(false);

    // Re-start kamera
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerDivId);
        scannerRef.current = html5QrCode;
        const cameras = await Html5Qrcode.getCameras();
        if (cameras?.length > 0) {
          const backCamera = cameras.find(c => c.label.toLowerCase().includes('back'));
          await html5QrCode.start(
            backCamera?.id || cameras[0].id,
            { fps: 15, qrbox: { width: 250, height: 250 } },
            (decodedText) => handleQRScanned(decodedText),
            () => {}
          );
          setScannerReady(true);
        }
      } catch (err) {
        setCameraError(`Gagal restart kamera: ${err?.message}`);
      }
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl text-slate-100 relative max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Scan QR Code Absensi</h3>
              <p className="text-xs text-slate-400">Arahkan QR Card anggota ke depan kamera</p>
            </div>
          </div>
          <button onClick={() => { stopScanner(); onClose(); }} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Kegiatan Banner */}
        {selectedActivity && (
          <div className="my-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-slate-400">Kegiatan: </span>
                <strong className="text-emerald-300">{selectedActivity.title}</strong>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
              {selectedActivity.category}
            </span>
          </div>
        )}

        {!selectedActivity && (
          <div className="my-4 p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Belum ada agenda kegiatan. Buat kegiatan terlebih dahulu di menu Agenda.</span>
          </div>
        )}

        {/* ── Scan View ── */}
        {!scanResult ? (
          <div>
            {/* Error Kamera */}
            {cameraError ? (
              <div className="my-4 p-5 rounded-2xl bg-rose-950/60 border border-rose-800 text-center space-y-3">
                <UserX className="w-10 h-10 text-rose-400 mx-auto" />
                <p className="text-rose-300 text-xs font-bold">{cameraError}</p>
                <p className="text-rose-400 text-[11px]">Gunakan tombol simulasi di bawah untuk tes tanpa kamera.</p>
              </div>
            ) : (
              <div className="my-4 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative" style={{ minHeight: 300 }}>
                {/* Loading overlay sebelum kamera siap */}
                {!scannerReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 z-10">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    <p className="text-xs text-slate-400">Memulai kamera...</p>
                  </div>
                )}
                <div id={scannerDivId} className="w-full" />
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="my-3 p-3 rounded-lg bg-blue-950/80 border border-blue-800 text-blue-300 text-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Memproses & menyimpan absensi ke database...</span>
              </div>
            )}

            {/* Scan Error */}
            {scanError && (
              <div className="my-3 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}

            {/* Simulasi Scan (untuk testing tanpa kamera nyata / QR fisik) */}
            {members.length > 0 && (
              <div className="mt-4 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-400 font-semibold">Simulasi Scan (Data Anggota Firestore):</span>
                  <span className="text-[10px] text-amber-400">Klik untuk absenkan langsung</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
                  {members.map(m => (
                    <button
                      key={m.id}
                      onClick={() => !isProcessing && handleQRScanned(m.qrToken || m.id)}
                      disabled={isProcessing}
                      className="p-2 text-left bg-slate-800 hover:bg-cyan-900/60 rounded-lg border border-slate-700 hover:border-cyan-700 text-[11px] truncate flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                    >
                      {m.photo ? (
                        <img src={m.photo} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-600" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-700 shrink-0 flex items-center justify-center text-slate-400 text-[8px] font-bold">
                          {m.name?.charAt(0)}
                        </div>
                      )}
                      <span className="truncate font-medium text-slate-200">
                        {m.name?.split(' ').slice(0, 2).join(' ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {members.length === 0 && (
              <div className="mt-4 p-3 bg-amber-950/40 border border-amber-800 rounded-xl text-amber-300 text-xs text-center">
                Belum ada data anggota di Firestore. Tambahkan anggota terlebih dahulu.
              </div>
            )}
          </div>
        ) : (
          /* ── Success Screen ── */
          <div className="my-4 p-5 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-emerald-500/40 shadow-xl text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                scanResult.log?.status === 'Hadir'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                ✓ ABSENSI BERHASIL — {(scanResult.log?.status || 'Hadir').toUpperCase()}
              </span>
              <h4 className="text-xs text-slate-400">Verifikasi Visual Foto Identitas Anggota DPRD</h4>
            </div>

            {/* Member Card */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left flex items-start space-x-4">
              {scanResult.member?.photo ? (
                <img
                  src={scanResult.member.photo}
                  alt={scanResult.member.name}
                  className="w-20 h-24 rounded-xl object-cover border-2 border-emerald-500 shadow-md shrink-0"
                />
              ) : (
                <div className="w-20 h-24 rounded-xl bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-2xl font-bold text-emerald-400 shrink-0">
                  {scanResult.member?.name?.charAt(0)}
                </div>
              )}
              <div className="space-y-1 text-xs">
                <h4 className="font-extrabold text-sm text-white">{scanResult.member?.name}</h4>
                <p className="text-slate-400">NIP: <span className="font-mono text-slate-200">{scanResult.member?.nip}</span></p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold text-[10px]">
                    {scanResult.member?.fraksi}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold text-[10px]">
                    {scanResult.member?.komisi}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  Waktu: <span className="text-emerald-400 font-mono font-semibold">
                    {new Date(scanResult.log?.timestampISO || Date.now()).toLocaleTimeString('id-ID')} WIB
                  </span>
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Data kehadiran telah dicatat ke Cloud Firestore & Audit Trail.</span>
            </div>

            <div className="pt-1 flex justify-center space-x-3">
              <button
                onClick={handleRescan}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Pindai Anggota Selanjutnya</span>
              </button>
              <button
                onClick={() => { stopScanner(); onClose(); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

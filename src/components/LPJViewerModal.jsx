import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { getStatusBadge, formatCheckInWithStatus } from '../utils/raportUtils';
import dprdLogo from '../logo.png';
import {
  FileSpreadsheet, X, Printer, Download, Users,
  Building2, Calendar, Clock, MapPin, CheckCircle,
  FileText, Image as ImageIcon, Sparkles, Check, Edit2
  , Paperclip
} from 'lucide-react';

function formatDuration(minutes) {
  if (!Number.isFinite(Number(minutes)) || Number(minutes) <= 0) return '-';
  const hours = Math.floor(Number(minutes) / 60);
  const remainingMinutes = Number(minutes) % 60;
  return `${hours ? `${hours} Jam ` : ''}${remainingMinutes} Menit`;
}

export default function LPJViewerModal({ isOpen, onClose, activityId }) {
  const { getLPJData, updateLPJSummary, reportSigners, members } = useAttendance();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const printRootRef = React.useRef(null);

  React.useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('lpj-printing');
      document.documentElement.classList.remove('lpj-printing');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('lpj-printing');
      document.documentElement.classList.remove('lpj-printing');
    };
  }, []);

  const lpj = getLPJData(activityId);

  React.useEffect(() => {
    if (lpj?.lpjSummary?.notes) {
      setNotesInput(lpj.lpjSummary.notes);
    }
  }, [lpj]);

  if (!isOpen || !lpj) return null;

  const { activity, internalLogs, externalLogs, internalStats, externalStats, lpjSummary } = lpj;

  const handleSaveNotes = async () => {
    await updateLPJSummary(activityId, { notes: notesInput });
    setIsEditingNotes(false);
  };

  const handleArchiveFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setIsUploading(true);
    const attachments = await Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
      reader.readAsDataURL(file);
    })));
    await updateLPJSummary(activityId, { attachments: [...(lpjSummary.attachments || []), ...attachments] });
    setIsUploading(false);
    event.target.value = '';
  };

  const normalizeDocumentationPhotos = (photos = []) => {
    if (!Array.isArray(photos)) return [];
    return photos
      .map((photo, index) => {
        if (typeof photo === 'string') {
          return {
            id: `photo-${index}-${photo.slice(-24)}`,
            dataUrl: photo,
            caption: '',
            isPrimary: index === 0,
          };
        }

        return {
          id: photo.id || `photo-${index}-${(photo.dataUrl || '').slice(-24) || index}`,
          dataUrl: photo.dataUrl || photo.url || '',
          caption: photo.caption || '',
          isPrimary: Boolean(photo.isPrimary),
        };
      })
      .filter(photo => photo.dataUrl);
  };

  const documentationPhotos = normalizeDocumentationPhotos(lpjSummary.documentationPhotos || []);

  const persistDocumentationPhotos = async (nextPhotos) => {
    const normalized = normalizeDocumentationPhotos(nextPhotos);

    if (normalized.length > 0 && !normalized.some(photo => photo.isPrimary)) {
      normalized[0].isPrimary = true;
    }

    await updateLPJSummary(activityId, {
      documentationPhotos: normalized,
    });
  };

  const handleDocumentationUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setIsUploading(true);

    const newPhotos = await Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        dataUrl: reader.result,
        caption: '',
        isPrimary: false,
      });
      reader.readAsDataURL(file);
    })));

    const nextPhotos = [...documentationPhotos, ...newPhotos];
    await persistDocumentationPhotos(nextPhotos);
    setIsUploading(false);
    event.target.value = '';
  };

  const updateDocumentationPhoto = async (photoId, updates) => {
    const nextPhotos = documentationPhotos.map(photo =>
      photo.id === photoId ? { ...photo, ...updates } : photo
    );
    await persistDocumentationPhotos(nextPhotos);
  };

  const removeDocumentationPhoto = async (photoId) => {
    const filtered = documentationPhotos.filter(photo => photo.id !== photoId);
    await persistDocumentationPhotos(filtered);
  };

  const printLpj = () => {
    const source = printRootRef.current;
    if (!source) return;

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) return;

    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(link => `<link rel="stylesheet" href="${link.href}">`)
      .join('');
    const clonedContent = source.cloneNode(true);
    clonedContent.querySelectorAll('.no-print').forEach(element => element.remove());

    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>LPJ - ${activity.title}</title>${stylesheets}<style>
      @page { size: 215mm 330mm; margin: 12mm; }
      html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.35; }
      .lpj-print-root { position: static !important; display: block !important; width: 100% !important; min-height: 0 !important; background: #fff !important; }
      .lpj-print-root > div { position: static !important; display: block !important; width: 100% !important; max-width: none !important; max-height: none !important; margin: 0 !important; padding: 0 !important; background: #fff !important; color: #000 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; overflow: visible !important; }
      .lpj-print-root .overflow-y-auto { overflow: visible !important; max-height: none !important; height: auto !important; }
      .lpj-print-root .rounded-3xl, .lpj-print-root .rounded-2xl, .lpj-print-root .rounded-xl { border-radius: 0 !important; }
      .lpj-print-root .shadow-2xl, .lpj-print-root .shadow-xl { box-shadow: none !important; }
      .lpj-print-root * { color: #000 !important; text-shadow: none !important; }
      .lpj-print-root h1, .lpj-print-root h2, .lpj-print-root h3, .lpj-print-root h4 { color: #000 !important; line-height: 1.2 !important; }
      .lpj-print-root table { width: 100% !important; border-collapse: collapse !important; break-inside: auto; margin: 8px 0 14px; }
      .lpj-print-root th { background: #e5e7eb !important; border: 1px solid #111 !important; color: #000 !important; font-weight: 700 !important; padding: 5px 6px !important; text-align: left; }
      .lpj-print-root td { border: 1px solid #444 !important; color: #000 !important; padding: 5px 6px !important; vertical-align: top; }
      .lpj-print-root tr { break-inside: avoid; }
      .lpj-print-root img { break-inside: avoid; max-width: 100%; }
      .lpj-print-root .space-y-8 > * + * { margin-top: 18px !important; }
      .lpj-print-root .space-y-3 > * + * { margin-top: 7px !important; }
      .lpj-print-root .grid { gap: 10px !important; }
      .lpj-print-root .border-b-\\[3px\\] { border-bottom: 2px solid #111 !important; }
      .lpj-print-root .lpj-external-section { break-before: page; page-break-before: always; }
      .lpj-print-root .pt-6 { padding-top: 18px !important; }
      .lpj-print-root .h-16 { height: 56px !important; }
      .hidden { display: none !important; }
      .print\\:block { display: block !important; }
      .print\\:flex { display: flex !important; }
      .print\\:hidden { display: none !important; }
    </style></head><body>${clonedContent.outerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 800);
  };

  return (
    <>
      <style>{`@page { size: 215mm 330mm; margin: 12mm; }
      @media print {
        html, body { background: white !important; color: black !important; }
        html.lpj-printing body * { visibility: hidden !important; }
        html.lpj-printing .lpj-print-root,
        html.lpj-printing .lpj-print-root * { visibility: visible !important; }
        html.lpj-printing .lpj-print-root { position: static !important; inset: auto !important; display: block !important; width: 100% !important; min-height: 0 !important; background: white !important; }
        html.lpj-printing .lpj-print-root > div { display: block !important; width: 100% !important; max-width: none !important; max-height: none !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; background: white !important; color: black !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; overflow: visible !important; }
        html.lpj-printing .lpj-print-root .no-print { display: none !important; }
        html.lpj-printing .lpj-print-root,
        html.lpj-printing .lpj-print-root > div,
        html.lpj-printing .lpj-print-root .overflow-y-auto { overflow: visible !important; max-height: none !important; height: auto !important; }
        html.lpj-printing .lpj-print-root .rounded-3xl,
        html.lpj-printing .lpj-print-root .rounded-2xl,
        html.lpj-printing .lpj-print-root .rounded-xl { border-radius: 0 !important; }
        html.lpj-printing .lpj-print-root .shadow-2xl,
        html.lpj-printing .lpj-print-root .shadow-xl { box-shadow: none !important; }
        html.lpj-printing .lpj-print-root .space-y-8 > :not([hidden]) ~ :not([hidden]) { margin-top: 16px !important; }
        html.lpj-printing .lpj-print-root table { break-inside: auto; }
        html.lpj-printing .lpj-print-root tr { break-inside: avoid; }
        html.lpj-printing .lpj-print-root img { break-inside: avoid; }
        html.lpj-printing .lpj-external-section { break-before: page; }
      }`}</style>
    <div ref={printRootRef} className="lpj-print-root fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Bar Action (No Print) */}
        <div className="no-print flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  Arsip LPJ Digital Resmi
                </span>
                <span className="text-xs text-slate-400 font-mono">#{activity.activityNumber || activity.id}</span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white line-clamp-1 mt-0.5">
                Laporan Pertanggungjawaban (LPJ) Kegiatan
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={printLpj}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Cetak / Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LPJ Printable Paper Layout */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-8 bg-slate-900 text-slate-100 print:bg-white print:text-black print:p-0">
          
          {/* KOP Surat DPRD sesuai format resmi Kabupaten Cirebon */}
          <div className="border-b-[3px] border-slate-700 print:border-black pb-2 flex items-center gap-4">
            <img src={dprdLogo} alt="Lambang Kabupaten Cirebon" className="w-[76px] h-[76px] object-contain shrink-0" />
            <div className="text-center flex-1 leading-tight">
              <h3 className="text-[15px] sm:text-lg font-black uppercase tracking-wide text-slate-200 print:text-black">
                PEMERINTAH KABUPATEN CIREBON
              </h3>
              <h4 className="text-[14px] sm:text-base font-black uppercase text-emerald-400 print:text-black">
                SEKRETARIAT DEWAN PERWAKILAN RAKYAT DAERAH
              </h4>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 print:text-gray-700">
                Jalan Sunan Drajat No. 1, Sumber, Kabupaten Cirebon, Jawa Barat 45611
              </p>
              <p className="text-[9px] sm:text-[10px] text-slate-500 print:text-gray-600">
                Telepon (0231) 321197 • Email: sekretariat.dprd@cirebonkab.go.id
              </p>
            </div>
            <div className="w-[76px] shrink-0" aria-hidden="true" />
          </div>

          <div>

          {/* Title of LPJ */}
          <div className="text-center space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-white print:text-black uppercase underline tracking-wide">
              LAPORAN PERTANGGUNGJAWABAN KEGIATAN & DAFTAR HADIR
            </h2>
            <p className="text-xs text-slate-400 print:text-gray-700 font-mono">
              Nomor Berita Acara: {activity.activityNumber || activity.id}
            </p>
          </div>

          {/* 1. Informasi Kegiatan */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 print:text-black flex items-center gap-2 border-b border-slate-800 print:border-gray-300 pb-1">
              <span>I. INFORMASI KEGIATAN</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-800/40 print:bg-gray-50 p-4 rounded-2xl border border-slate-800 print:border-gray-300">
              <div>
                <span className="text-slate-400 print:text-gray-500 block text-[11px]">Nama Kegiatan:</span>
                <span className="font-bold text-white print:text-black">{activity.title}</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-500 block text-[11px]">Penyelenggara / AKD:</span>
                <span className="font-bold text-emerald-400 print:text-black">{activity.category || 'Alat Kelengkapan DPRD'}</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-500 block text-[11px]">Waktu Pelaksanaan:</span>
                <span className="font-bold text-white print:text-black">{activity.date} • {activity.startTime} s.d {activity.endTime} WIB</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-500 block text-[11px]">Tempat / Ruang Sidang:</span>
                <span className="font-bold text-white print:text-black">{activity.locationName || 'Ruang Sidang Utama Gedung DPRD'}</span>
              </div>
            </div>
          </div>

          {/* 2. Ringkasan Statistik Kehadiran */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 print:text-black flex items-center gap-2 border-b border-slate-800 print:border-gray-300 pb-1">
              <span>II. REKAPITULASI STATISTIK KEHADIRAN</span>
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-800/60 print:bg-gray-100 p-3.5 rounded-2xl border border-slate-700/60 print:border-gray-300 text-center">
                <span className="text-[10px] text-slate-400 print:text-gray-600 block uppercase">Anggota Dewan Hadir</span>
                <span className="text-xl font-black text-emerald-400 print:text-black mt-1 block">
                  {internalStats.hadir + internalStats.terlambat} / {internalStats.totalMandatory}
                </span>
                <span className="text-[10px] text-slate-500 print:text-gray-500">
                  Tepat: {internalStats.hadir} | Telat: {internalStats.terlambat}
                </span>
              </div>

              <div className="bg-slate-800/60 print:bg-gray-100 p-3.5 rounded-2xl border border-slate-700/60 print:border-gray-300 text-center">
                <span className="text-[10px] text-slate-400 print:text-gray-600 block uppercase">Dinas Luar / SPT</span>
                <span className="text-xl font-black text-indigo-400 print:text-black mt-1 block">
                  {internalStats.dinasLuar}
                </span>
                <span className="text-[10px] text-slate-500 print:text-gray-500">
                  Disertai Surat Tugas
                </span>
              </div>

              <div className="bg-slate-800/60 print:bg-gray-100 p-3.5 rounded-2xl border border-slate-700/60 print:border-gray-300 text-center">
                <span className="text-[10px] text-slate-400 print:text-gray-600 block uppercase">Izin / Sakit / Alpha</span>
                <span className="text-xl font-black text-amber-400 print:text-black mt-1 block">
                  {internalStats.izin + internalStats.sakit + internalStats.alpha}
                </span>
                <span className="text-[10px] text-slate-500 print:text-gray-500">
                  Izin: {internalStats.izin} | Sakit: {internalStats.sakit} | Alpha: {internalStats.alpha}
                </span>
              </div>

              <div className="bg-slate-800/60 print:bg-gray-100 p-3.5 rounded-2xl border border-slate-700/60 print:border-gray-300 text-center">
                <span className="text-[10px] text-slate-400 print:text-gray-600 block uppercase">Tamu Eksternal / OPD</span>
                <span className="text-xl font-black text-cyan-400 print:text-black mt-1 block">
                  {externalLogs.length} / {externalStats.totalInvited}
                </span>
                <span className="text-[10px] text-slate-500 print:text-gray-500">
                  Hadir: {externalStats.hadirLangsung} | Diwakili: {externalStats.diwakili}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Tabel Daftar Hadir Anggota DPRD (Internal) */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 print:text-black flex items-center justify-between border-b border-slate-800 print:border-gray-300 pb-1">
              <span>III. DAFTAR PRESENSI ANGGOTA DEWAN (INTERNAL)</span>
              <span className="text-[10px] text-slate-400 print:text-gray-600">Tercatat ke Raport Kedisiplinan BK</span>
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-gray-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 print:bg-gray-200 text-slate-300 print:text-black font-bold border-b border-slate-700 print:border-gray-400">
                    <th className="p-2.5 text-center w-10">No</th>
                    <th className="p-2.5">Nama Anggota & Fraksi</th>
                    <th className="p-2.5">Check-in</th>
                    <th className="p-2.5">Check-out</th>
                    <th className="p-2.5">Durasi</th>
                    <th className="p-2.5">Metode & Perangkat</th>
                    <th className="p-2.5">Status Kehadiran</th>
                    <th className="p-2.5">Keterangan / SPT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300 text-slate-300 print:text-black">
                  {internalLogs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-4 text-center text-slate-500 print:text-gray-500">
                        Belum ada data presensi anggota pada kegiatan ini.
                      </td>
                    </tr>
                  ) : (
                    internalLogs.map((log, idx) => {
                      const badge = getStatusBadge(log.status);
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                          <td className="p-2.5 text-center font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-white print:text-black">
                            {log.memberName}
                            <span className="block text-[10px] text-slate-400 print:text-gray-600 font-normal font-mono">{log.memberId}</span>
                          </td>
                          <td className="p-2.5 font-mono text-[11px]">
                            {formatCheckInWithStatus(log)}
                          </td>
                          <td className="p-2.5 font-mono text-[11px]">
                            {log.checkOutAt ? `${new Date(log.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : <span className="text-amber-400 print:text-gray-600">Belum</span>}
                          </td>
                          <td className="p-2.5 text-[11px] whitespace-nowrap">
                            {formatDuration(log.durationMinutes)}
                          </td>
                          <td className="p-2.5 text-[11px]">
                            <span className="font-semibold block">{log.method}</span>
                            <span className="text-[10px] text-slate-400 print:text-gray-500">{log.deviceType || 'Smartphone'}</span>
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                            {log.checkoutStatus && <span className={`block mt-1 text-[10px] font-bold ${log.checkoutStatus === 'Pulang Lebih Awal' ? 'text-rose-300 print:text-rose-700' : 'text-emerald-300 print:text-emerald-700'}`}>{log.checkoutStatus}</span>}
                          </td>
                          <td className="p-2.5 text-[11px] text-slate-400 print:text-gray-700">
                            {log.sptNumber && <span className="block text-indigo-300 print:text-indigo-900 font-bold">SPT: {log.sptNumber}{log.sptDate ? ` (${log.sptDate})` : ''}</span>}
                            {log.note || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Tabel Daftar Hadir Tamu Eksternal / OPD / Delegasi */}
          <div className="lpj-external-section space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 print:text-black flex items-center justify-between border-b border-slate-800 print:border-gray-300 pb-1">
              <span>IV. DAFTAR PRESENSI TAMU EKSTERNAL, DINAS & OPD</span>
              <span className="text-[10px] text-slate-400 print:text-gray-600">Dokumentasi LPJ (Non-Raport)</span>
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-gray-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 print:bg-gray-200 text-slate-300 print:text-black font-bold border-b border-slate-700 print:border-gray-400">
                    <th className="p-2.5 text-center w-10">No</th>
                    <th className="p-2.5">Nama</th>
                    <th className="p-2.5">Jabatan</th>
                    <th className="p-2.5">Instansi / OPD</th>
                    <th className="p-2.5">Jenis</th>
                    <th className="p-2.5">Status & Delegasi</th>
                    <th className="p-2.5">Check-in</th>
                    <th className="p-2.5">Check-out</th>
                    <th className="p-2.5">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300 text-slate-300 print:text-black">
                  {externalLogs.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-4 text-center text-slate-500 print:text-gray-500">
                        Tidak ada tamu eksternal / OPD terdaftar pada agenda ini.
                      </td>
                    </tr>
                  ) : (
                    externalLogs.map((gst, idx) => (
                      <tr key={gst.id} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                        <td className="p-2.5 text-center font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-white print:text-black">{gst.isRepresented ? gst.representativeName : gst.guestName || gst.invitedName}</td>
                        <td className="p-2.5 text-slate-300 print:text-black">{gst.isRepresented ? gst.representativePosition : gst.position || '-'}</td>
                        <td className="p-2.5 text-slate-300 print:text-black">{gst.agency}</td>
                        <td className="p-2.5 text-slate-300 print:text-black">{gst.participantCategory || 'OPD/INSTANSI'}</td>
                        <td className="p-2.5">
                          {gst.isRepresented ? (
                            <div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                Diwakili Delegasi
                              </span>
                              <span className="block font-bold text-white print:text-black text-[11px] mt-1">
                                {gst.representativeName}
                              </span>
                              <span className="text-[10px] text-slate-400 print:text-gray-500">
                                ({gst.representativePosition})
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Hadir Langsung
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-[11px]">
                          {formatCheckInWithStatus(gst)}
                        </td>
                        <td className="p-2.5 font-mono text-[11px]">
                          {gst.checkOutAt ? `${new Date(gst.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : '-'}
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-400 print:text-gray-700">{gst.note || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Notulen & Dokumentasi Rapat */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 print:border-gray-300 pb-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 print:text-black">
                V. NOTULEN RAPAT & DOKUMENTASI KEGIATAN
              </h4>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="no-print text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Notulen
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="no-print space-y-2 bg-slate-800 p-4 rounded-2xl">
                <textarea
                  value={notesInput}
                  onChange={e => setNotesInput(e.target.value)}
                  rows={4}
                  placeholder="Tuliskan intisari kesimpulan rapat atau jalannya persidangan..."
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsEditingNotes(false)} className="px-3 py-1.5 bg-slate-700 text-xs rounded-xl">Batal</button>
                  <button onClick={handleSaveNotes} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl">Simpan Notulen</button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-800/40 print:bg-gray-50 rounded-2xl border border-slate-800 print:border-gray-300 text-xs text-slate-200 print:text-black leading-relaxed">
                {lpjSummary.notes || 'Belum ada catatan notulen yang dimasukkan untuk kegiatan ini.'}
              </div>
            )}

            {/* Dokumentasi Foto */}
            <div className="no-print space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-bold cursor-pointer">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {isUploading ? 'Mengunggah...' : 'Tambah Dokumentasi Foto'}
                  <input type="file" multiple accept="image/*" onChange={handleDocumentationUpload} className="hidden" disabled={isUploading} />
                </label>
                <span className="text-[10px] text-slate-500">{documentationPhotos.length} foto terlampir</span>
              </div>

              {documentationPhotos.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documentationPhotos.map((photo, index) => (
                    <div key={photo.id} className="rounded-2xl border border-slate-700 bg-slate-800/40 p-2.5 space-y-2">
                      <div className="relative">
                        <img
                          src={photo.dataUrl}
                          alt={`Dokumentasi ${index + 1}`}
                          className="w-full h-32 object-cover rounded-xl border border-slate-700"
                        />
                        {photo.isPrimary && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Foto Utama
                          </span>
                        )}
                      </div>

                      <textarea
                        value={photo.caption || ''}
                        onChange={e => updateDocumentationPhoto(photo.id, { caption: e.target.value })}
                        rows={2}
                        placeholder="Caption foto / keterangan dokumentasi"
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-[10px] text-slate-200 resize-none"
                      />

                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => updateDocumentationPhoto(photo.id, { isPrimary: true })}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${photo.isPrimary ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-700 text-slate-200 border-slate-600'}`}
                        >
                          {photo.isPrimary ? 'Utama' : 'Jadikan Utama'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDocumentationPhoto(photo.id)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold border border-rose-500/30 bg-rose-500/10 text-rose-300"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="no-print space-y-2 pt-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-bold cursor-pointer">
                <Paperclip className="w-3.5 h-3.5" />
                {isUploading ? 'Mengunggah...' : 'Tambah Arsip Dokumen'}
                <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={handleArchiveFiles} className="hidden" disabled={isUploading} />
              </label>
              <p className="text-[10px] text-slate-500">Surat undangan, berita acara, notulen, foto, dan laporan kegiatan.</p>
            </div>

            {lpjSummary.attachments?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lpjSummary.attachments.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
                    {file.type?.startsWith('image/') ? (
                      <a href={file.dataUrl} target="_blank" rel="noreferrer" title={`Buka ${file.name}`}>
                        <img src={file.dataUrl} alt={file.name} className="w-full h-44 object-contain bg-slate-950 print:bg-white print:h-36" />
                      </a>
                    ) : file.type === 'application/pdf' ? (
                      <iframe src={file.dataUrl} title={file.name} className="w-full h-44 bg-white border-0" />
                    ) : null}
                    <a href={file.dataUrl} download={file.name} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2.5 text-xs text-slate-200 hover:border-emerald-500">
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" /><span className="truncate">{file.name}</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lembar Pengesahan / Tanda Tangan */}
          <div className="pt-6 grid gap-8 text-center text-xs print:text-black" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, reportSigners.filter(signer => signer.active !== false).length))}, minmax(0, 1fr))` }}>
            {reportSigners.filter(signer => signer.active !== false).map(signer => <div key={signer.id}>
              <p className="text-slate-400 print:text-gray-600">{signer.label || 'Mengetahui'},</p>
              <p className="font-bold text-white print:text-black mt-0.5">{signer.position}</p>
              <div className="h-16" />
              <p className="font-black text-white print:text-black underline">{signer.name}</p>
              {signer.rank && <p className="text-[10px] text-slate-400 print:text-gray-600">{signer.rank}</p>}
              {signer.nip && <p className="text-[10px] text-slate-400 print:text-gray-600 font-mono">NIP. {signer.nip}</p>}
            </div>)}
          </div>

          </div>

          <div className="hidden">
            <div className="text-center mb-4 leading-tight">
              <h2 className="text-base font-black uppercase underline">DAFTAR HADIR</h2>
              <p className="text-xs font-bold">{activity.title}</p>
              <p className="text-xs font-bold">{activity.date} • {activity.startTime} - {activity.endTime} WIB</p>
            </div>
            <table className="w-full border-collapse border border-black text-[10px]">
              <thead>
                <tr>
                  <th className="border border-black p-1 text-center w-8">No</th>
                  <th className="border border-black p-1 text-left">Nama</th>
                  <th className="border border-black p-1 text-left">Jabatan</th>
                  <th className="border border-black p-1 text-left">Instansi</th>
                  <th className="border border-black p-1 text-center">Check-in</th>
                  <th className="border border-black p-1 text-center">Check-out</th>
                  <th className="border border-black p-1 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {[...internalLogs, ...externalLogs].map((log, index) => {
                  const isExternal = log.participantType === 'EXTERNAL';
                  const member = members.find(item => item.id === log.memberId);
                  return (
                    <tr key={log.id} className="h-8">
                      <td className="border border-black p-1 text-center">{index + 1}</td>
                      <td className="border border-black p-1">{isExternal ? (log.isRepresented ? log.representativeName : log.guestName || log.invitedName) : log.memberName}</td>
                      <td className="border border-black p-1">{isExternal ? log.representativePosition || log.position || '-' : member?.jabatan || 'Anggota DPRD'}</td>
                      <td className="border border-black p-1">{isExternal ? log.agency || log.guestAgency || '-' : member?.fraksi || log.memberFraksi || 'DPRD Kabupaten Cirebon'}</td>
                      <td className="border border-black p-1 text-center">{formatCheckInWithStatus(log).split(' - ')[0]}</td>
                      <td className="border border-black p-1 text-center">{log.checkOutAt ? `${new Date(log.checkOutAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace(':', '.')} WIB` : '-'}</td>
                      <td className="border border-black p-1">{[log.status, log.checkoutStatus, log.note].filter(Boolean).join(' | ') || '-'}</td>
                    </tr>
                  );
                })}
                {Array.from({ length: Math.max(0, 15 - internalLogs.length - externalLogs.length) }, (_, index) => (
                  <tr key={`empty-${index}`} className="h-8">
                    <td className="border border-black p-1 text-center">{internalLogs.length + externalLogs.length + index + 1}</td>
                    <td className="border border-black p-1"></td><td className="border border-black p-1"></td><td className="border border-black p-1"></td><td className="border border-black p-1"></td><td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
    </>
  );
}

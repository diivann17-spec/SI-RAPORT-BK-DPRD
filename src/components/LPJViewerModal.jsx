import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { getStatusBadge } from '../utils/raportUtils';
import dprdLogo from '../logo.png';
import {
  FileSpreadsheet, X, Printer, Download, Users,
  Building2, Calendar, Clock, MapPin, CheckCircle,
  FileText, Image as ImageIcon, Sparkles, Check, Edit2
} from 'lucide-react';

export default function LPJViewerModal({ isOpen, onClose, activityId }) {
  const { getLPJData, updateLPJSummary } = useAttendance();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState('');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm">
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
              onClick={() => window.print()}
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
          
          {/* KOP Surat DPRD (Official Header) */}
          <div className="border-b-2 border-slate-700 print:border-black pb-4 flex items-center justify-between gap-4">
            <img src={dprdLogo} alt="Logo DPRD" className="w-16 h-16 object-contain shrink-0" />
            <div className="text-center flex-1">
              <h3 className="text-base font-black uppercase tracking-wider text-slate-200 print:text-black">
                DEWAN PERWAKILAN RAKYAT DAERAH
              </h3>
              <h4 className="text-sm font-bold text-emerald-400 print:text-black uppercase">
                SEKRETARIAT & BADAN KEHORMATAN (BK) DPRD
              </h4>
              <p className="text-[11px] text-slate-400 print:text-gray-600">
                Gedung DPRD Kabupaten Cirebon • Jl. Sunan Drajat No. 1, Sumber • Jawa Barat
              </p>
            </div>
            <div className="w-16 hidden sm:block" />
          </div>

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
                <span className="text-slate-400 print:text-gray-500 block text-[11px]">Kategori & Sifat:</span>
                <span className="font-bold text-white print:text-black">Sidang / Rapat {activity.category}</span>
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
                    <th className="p-2.5">Waktu Scan</th>
                    <th className="p-2.5">Metode & Perangkat</th>
                    <th className="p-2.5">Status Kehadiran</th>
                    <th className="p-2.5">Keterangan / SPT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300 text-slate-300 print:text-black">
                  {internalLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-4 text-center text-slate-500 print:text-gray-500">
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
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                          </td>
                          <td className="p-2.5 text-[11px]">
                            <span className="font-semibold block">{log.method}</span>
                            <span className="text-[10px] text-slate-400 print:text-gray-500">{log.deviceType || 'Smartphone'}</span>
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-2.5 text-[11px] text-slate-400 print:text-gray-700">
                            {log.sptNumber && <span className="block text-indigo-300 print:text-indigo-900 font-bold">{log.sptNumber}</span>}
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
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 print:text-black flex items-center justify-between border-b border-slate-800 print:border-gray-300 pb-1">
              <span>IV. DAFTAR PRESENSI TAMU EKSTERNAL, DINAS & OPD</span>
              <span className="text-[10px] text-slate-400 print:text-gray-600">Dokumentasi LPJ (Non-Raport)</span>
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-gray-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 print:bg-gray-200 text-slate-300 print:text-black font-bold border-b border-slate-700 print:border-gray-400">
                    <th className="p-2.5 text-center w-10">No</th>
                    <th className="p-2.5">Instansi / OPD</th>
                    <th className="p-2.5">Pihak Diundang</th>
                    <th className="p-2.5">Status & Delegasi</th>
                    <th className="p-2.5">Waktu Kehadiran</th>
                    <th className="p-2.5">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300 text-slate-300 print:text-black">
                  {externalLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-4 text-center text-slate-500 print:text-gray-500">
                        Tidak ada tamu eksternal / OPD terdaftar pada agenda ini.
                      </td>
                    </tr>
                  ) : (
                    externalLogs.map((gst, idx) => (
                      <tr key={gst.id} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                        <td className="p-2.5 text-center font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-white print:text-black">{gst.agency}</td>
                        <td className="p-2.5 text-slate-300 print:text-black">{gst.invitedName}</td>
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
                          {gst.timestamp ? new Date(gst.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
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
            {lpjSummary.documentationPhotos?.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {lpjSummary.documentationPhotos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt={`Dokumentasi ${i + 1}`}
                    className="w-full h-32 object-cover rounded-2xl border border-slate-700 print:border-gray-300"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Lembar Pengesahan / Tanda Tangan */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs print:text-black">
            <div>
              <p className="text-slate-400 print:text-gray-600">Mengetahui,</p>
              <p className="font-bold text-white print:text-black mt-0.5">Ketua Badan Kehormatan (BK) DPRD</p>
              <div className="h-16" />
              <p className="font-black text-white print:text-black underline">Dr. H. Ahmad Muzani, S.H., M.H.</p>
              <p className="text-[10px] text-slate-400 print:text-gray-600 font-mono">NIP. 19691105 199803 1 002</p>
            </div>

            <div>
              <p className="text-slate-400 print:text-gray-600">Petugas Notulis / Verifikator,</p>
              <p className="font-bold text-white print:text-black mt-0.5">Sekretariat DPRD</p>
              <div className="h-16" />
              <p className="font-black text-white print:text-black underline">Budi Hartono, S.STP.</p>
              <p className="text-[10px] text-slate-400 print:text-gray-600 font-mono">NIP. 19820512 200604 1 007</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

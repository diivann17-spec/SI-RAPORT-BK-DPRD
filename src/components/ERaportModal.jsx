import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { getStatusBadge, getMethodBadge, formatCheckInWithStatus } from '../utils/raportUtils';
import dprdLogo from '../logo.png';
import {
  FileSpreadsheet,
  Printer,
  X,
  Award,
  AlertTriangle,
  CheckCircle,
  Building2,
  Calendar,
  Save,
  ShieldAlert
} from 'lucide-react';

export default function ERaportModal({ isOpen, onClose, memberId }) {
  const {
    getMemberById,
    getMemberRaport,
    activities,
    logs,
    bkNotes,
    saveBKNote,
    reportSigners,
    currentRole
  } = useAttendance();

  // Filter periode sampai bulan (Default 11 = November)
  const [selectedMaxMonth, setSelectedMaxMonth] = useState('11');

  const member = getMemberById(memberId);
  const raport = getMemberRaport(memberId, 'ALL', selectedMaxMonth);
  const currentBkNote = bkNotes[memberId] || { note: '', statusWarning: 'BAIK' };

  const [noteText, setNoteText] = useState(currentBkNote.note);
  const [warningStatus, setWarningStatus] = useState(currentBkNote.statusWarning || 'BAIK');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen || !member) return null;

  // Filter activities up to selectedMaxMonth
  const filteredActivities = activities.filter(act => {
    if (selectedMaxMonth === 'ALL') return true;
    if (!act.date) return true;
    const m = new Date(act.date).getMonth() + 1;
    return m <= parseInt(selectedMaxMonth, 10);
  });

  const memberLogs = logs.filter(l => l.memberId === memberId);

  // Group activities by category for category-wise raport breakdown (Struktur AKD)
  const categories = [
    'Komisi I', 'Komisi II', 'Komisi III', 'Komisi IV',
    'Badan Kehormatan (BK)', 'Badan Anggaran (Banggar)',
    'Badan Musyawarah (Banmus)', 'Badan Pembentukan Peraturan Daerah (Bapemperda)',
    'Panitia Khusus (Pansus 1)', 'Panitia Khusus (Pansus 2)', 'Panitia Khusus (Pansus 3)', 'Panitia Khusus (Pansus 4)',
    'Pimpinan DPRD', 'Rapat Paripurna'
  ];

  const handleSaveNote = () => {
    saveBKNote(memberId, noteText, warningStatus);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl text-slate-100 relative max-h-[92vh] overflow-y-auto">

        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 mb-6 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-950 border border-amber-800 text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">e-Raport Kedisiplinan Kehadiran Digital</h3>
              <p className="text-xs text-slate-400">Format Kertas Cetak F4 / Folio (215 x 330 mm) - Terlihat Penuh</p>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Periode Month Filter */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-2.5 py-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-amber-400">Periode S.D:</span>
              <select
                value={selectedMaxMonth}
                onChange={(e) => setSelectedMaxMonth(e.target.value)}
                className="bg-slate-900 text-white text-xs font-semibold rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:border-amber-400"
              >
                <option value="11">November 2026 (Jan - Nov)</option>
                <option value="12">Desember 2026 (1 Tahun Penuh)</option>
                <option value="10">Oktober 2026</option>
                <option value="9">September 2026</option>
                <option value="6">Juni 2026 (Semester 1)</option>
                <option value="ALL">Semua Agenda Rapat</option>
              </select>
            </div>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF (F4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE E-RAPORT PAPER DOCUMENT CONTAINER (F4 / FOLIO READY) */}
        <div className="print-page bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 text-xs font-sans space-y-4">

          {/* Official DPRD Header Kop Surat */}
          <div className="border-b-4 border-double border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-16 h-16 flex items-center justify-center shrink-0">
                <img
                  src={dprdLogo}
                  alt="Logo DPRD"
                  className="w-16 h-16 object-contain"
                />
              </div>
              <div>
                <h2 className="text-base font-black tracking-wide text-slate-900 uppercase leading-snug">DEWAN PERWAKILAN RAKYAT DAERAH</h2>
                <h3 className="text-xs font-bold text-emerald-800 tracking-wider uppercase leading-snug">BADAN KEHORMATAN (BK) & SEKRETARIAT DPRD</h3>
                <p className="text-[10px] text-slate-600 font-medium">
                  Sistem Informasi Raport Kehadiran (SI-RAPORT BK DPRD) • Periode Sidang s.d {selectedMaxMonth === '11' ? 'November 2026' : selectedMaxMonth === '12' ? 'Desember 2026' : selectedMaxMonth === 'ALL' ? 'Tahun 2026' : `Bulan ${selectedMaxMonth} 2026`}
                </p>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-500 shrink-0">
              <p className="font-bold text-slate-800 uppercase">Dokumen Resmi Evaluasi BK</p>
              <p className="font-mono">NO: BK-RAPORT/{member.id}/2026</p>
              <p className="text-slate-400">Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[9px] border border-slate-300">
                UKURAN: F4 / FOLIO
              </span>
            </div>
          </div>

          {/* Member Profile & Category Badge Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200">

            {/* Photo & Member Data */}
            <div className="md:col-span-2 flex items-start space-x-4">
              <img
                src={member.photo}
                alt={member.name}
                className="w-20 h-24 rounded-lg object-cover border-2 border-slate-300 shadow-sm shrink-0"
              />
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest bg-emerald-100 px-2 py-0.5 rounded">
                  Identitas Anggota DPRD
                </span>
                <h3 className="text-base font-extrabold text-slate-900">{member.name}</h3>
                <p className="text-xs text-slate-600">NIP / ID Digital: <span className="font-mono text-slate-800 font-bold">{member.nip}</span></p>
                <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold">
                  <span className="bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded">{member.fraksi}</span>
                  <span className="bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded">{member.komisi}</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">{member.jabatan}</p>
              </div>
            </div>

            {/* Raport Score & Color Category Indicator */}
            <div className={`p-4 rounded-xl text-center flex flex-col justify-center border ${raport.categoryInfo.badgeClass}`}>
              <span className="text-xs font-extrabold uppercase tracking-wider">Persentase Kehadiran</span>
              <div className="text-4xl font-black my-1">
                {raport.percentage}%
              </div>
              <div className="text-xs font-bold uppercase tracking-wide">
                KATEGORI: {raport.categoryInfo.label}
              </div>
              <p className="text-[11px] mt-1 opacity-90">{raport.categoryInfo.statusText}</p>
            </div>

          </div>

          {/* Breakdown Table by Activity Category */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>1. Evaluasi Kehadiran Berdasarkan Jenis Kegiatan (s.d {selectedMaxMonth === '11' ? 'November' : selectedMaxMonth === '12' ? 'Desember' : selectedMaxMonth === 'ALL' ? 'Semua' : `Bulan ${selectedMaxMonth}`})</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Total: {filteredActivities.length} Agenda Rapat</span>
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-[11px] text-left text-slate-700">
                <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2">Jenis Kegiatan</th>
                    <th className="p-2 text-center">Wajib Diikuti</th>
                    <th className="p-2 text-center">Hadir / Dinas</th>
                    <th className="p-2 text-center">Terlambat</th>
                    <th className="p-2 text-center">Izin / Sakit</th>
                    <th className="p-2 text-center">Tanpa Ket.</th>
                    <th className="p-2 text-right">% Kehadiran</th>
                    <th className="p-2 text-center">Kategori</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {categories.map(cat => {
                    const catRaport = getMemberRaport(memberId, cat, selectedMaxMonth);
                    return (
                      <tr key={cat} className="hover:bg-slate-50">
                        <td className="p-2 font-semibold text-slate-900">{cat}</td>
                        <td className="p-2 text-center font-mono">{catRaport.totalMandatory}</td>
                        <td className="p-2 text-center text-emerald-700 font-bold">{catRaport.breakdown.hadir + catRaport.breakdown.dinas}</td>
                        <td className="p-2 text-center text-amber-700 font-bold">{catRaport.breakdown.terlambat}</td>
                        <td className="p-2 text-center text-blue-700 font-bold">{catRaport.breakdown.izin + catRaport.breakdown.sakit}</td>
                        <td className="p-2 text-center text-rose-700 font-bold">{catRaport.breakdown.alpa}</td>
                        <td className="p-2 text-right font-bold text-slate-900 font-mono">{catRaport.percentage}%</td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${catRaport.categoryInfo.badgeClass}`}>
                            {catRaport.categoryInfo.key}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Attendance History */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span>2. Riwayat Catatan Kehadiran Rapat</span>
              <span className="text-[10px] text-slate-500 font-normal">Menampilkan {filteredActivities.length} Riwayat Kegiatan</span>
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-[11px] text-left text-slate-700">
                <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2 font-semibold">Tanggal & Waktu</th>
                    <th className="p-2 font-semibold">Nama Agenda Rapat</th>
                    <th className="p-2 font-semibold text-center">Status</th>
                    <th className="p-2 font-semibold text-center">Metode Absensi</th>
                    <th className="p-2 font-semibold">Keterangan / Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-slate-400 italic">
                        Tidak ada agenda rapat pada periode yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map(act => {
                      const log = memberLogs.find(l => l.activityId === act.id);
                      const statusBadge = getStatusBadge(log ? log.status : 'Tanpa Keterangan');
                      const methodBadge = getMethodBadge(log ? log.method : 'SYSTEM');
                      return (
                        <tr key={act.id} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-[10px] whitespace-nowrap">
                            {act.date} {log ? formatCheckInWithStatus(log) : '-'}
                          </td>
                          <td className="p-2 font-medium">{act.title}</td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${statusBadge.bg}`}>
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="p-2 text-center text-[10px] whitespace-nowrap">
                            {log ? `${methodBadge.icon} ${methodBadge.label}` : 'Tanpa Presensi'}
                          </td>
                          <td className="p-2 text-slate-500 text-[10px] truncate max-w-[180px]">
                            {log?.note || 'Tidak melakukan presensi rapat'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Badan Kehormatan (BK) Official Evaluation & Warning Notes */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>3. Catatan Evaluasi & Rekomendasi Badan Kehormatan (BK)</span>
              </h4>
              <span className="text-[10px] text-amber-700 font-semibold">
                Status BK: {warningStatus}
              </span>
            </div>

            {/* Editable note for BK / Admin roles, Readonly for Anggota */}
            {currentRole === 'PETUGAS_BK' || currentRole === 'SECRETARIAT_ADMIN' ? (
              <div className="no-print space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Tindakan Kedisiplinan BK:</label>
                    <select
                      value={warningStatus}
                      onChange={(e) => setWarningStatus(e.target.value)}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      <option value="BAIK">Kedisiplinan Baik / Sesuai Standar</option>
                      <option value="PERINGATAN_LISAN">Peringatan Lisan BK (Kategori Kuning)</option>
                      <option value="SURAT_TEGURAN_1">Surat Teguran Tertulis I (Kategori Merah)</option>
                      <option value="SURAT_TEGURAN_2">Surat Teguran Tertulis II (Kategori Merah Parah)</option>
                      <option value="PEMANGGILAN_BK">Pemanggilan Klarifikasi Sidang BK</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleSaveNote}
                      className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow"
                    >
                      <Save className="w-4 h-4" />
                      <span>Simpan Catatan & Status BK</span>
                    </button>
                  </div>
                </div>

                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Tuliskan catatan evaluasi Badan Kehormatan untuk anggota ini..."
                  rows={2}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-800"
                />

                {isSaved && (
                  <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Catatan Evaluasi BK berhasil disimpan ke database & Audit Trail.</span>
                  </p>
                )}
              </div>
            ) : null}

            {/* Rendered Note text for Print or View */}
            <div className="p-3 bg-white rounded-lg border border-amber-200 text-xs italic text-slate-800">
              "{noteText || raport.categoryInfo.recommendation}"
            </div>
          </div>

          {/* Signature Block for Official Printout */}
          <div className="pt-6 border-t border-slate-300 grid grid-cols-2 text-center text-xs text-slate-700">
            {reportSigners.filter(signer => signer.active !== false).slice(0, 2).map(signer => <div key={signer.id}>
              <p className="text-slate-500">{signer.label || signer.position},</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900 border-b border-slate-400 inline-block pb-0.5">{signer.name}</p>
              {signer.rank && <p className="text-[10px] text-slate-500">{signer.rank}</p>}
              {signer.nip && <p className="text-[10px] text-slate-500">NIP. {signer.nip}</p>}
            </div>)}
          </div>

        </div>

      </div>
    </div>
  );
}

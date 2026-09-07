import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import ERaportModal from '../components/ERaportModal';
import {
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  FileText,
  Printer,
  ShieldAlert
} from 'lucide-react';

export default function RaportList() {
  const {
    members,
    getMemberRaport,
    bkNotes,
    currentRole
  } = useAttendance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState('ALL');
  const [selectedFraksi, setSelectedFraksi] = useState('ALL');
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState('11'); // Default November
  const [activeModalMemberId, setActiveModalMemberId] = useState(null);

  // Compute all member raports with selectedPeriodMonth
  const memberRaports = members.map(m => {
    const raport = getMemberRaport(m.id, 'ALL', selectedPeriodMonth);
    const bkNote = bkNotes[m.id];
    return {
      member: m,
      raport,
      bkNote
    };
  }).filter(({ member, raport }) => {
    // Search query filter
    const q = searchQuery.toLowerCase();
    const matchSearch =
      member.name.toLowerCase().includes(q) ||
      member.fraksi.toLowerCase().includes(q) ||
      member.komisi.toLowerCase().includes(q);

    // Color filter
    const matchColor = selectedColor === 'ALL' || raport.categoryInfo.key === selectedColor;

    // Fraksi filter
    const matchFraksi = selectedFraksi === 'ALL' || member.fraksi === selectedFraksi;

    return matchSearch && matchColor && matchFraksi;
  });

  const fraksiList = Array.from(new Set(members.map(m => m.fraksi)));

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-amber-500/20 text-amber-300 text-xs font-extrabold px-2.5 py-0.5 rounded border border-amber-500/30 uppercase tracking-wide">
              Badan Kehormatan (BK) & Pimpinan DPRD
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white">Raport Digital Kedisiplinan Kehadiran</h1>
          <p className="text-xs text-slate-300">
            Hasil pengolahan evaluasi kehadiran anggota DPRD dengan indikator kategori warna Hijau (81-100%), Kuning (51-80%), & Merah (0-50%).
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-2 border border-slate-700 transition shrink-0"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>Cetak Rekap Raport Seluruh Anggota</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari nama, fraksi, komisi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-xl border border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* Period Filter (Default: s.d November) */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">Periode:</span>
            <select
              value={selectedPeriodMonth}
              onChange={(e) => setSelectedPeriodMonth(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-emerald-600 dark:text-emerald-400"
            >
              <option value="11">s.d November 2026 (Jan - Nov)</option>
              <option value="12">s.d Desember 2026 (1 Tahun Penuh)</option>
              <option value="10">s.d Oktober 2026</option>
              <option value="9">s.d September 2026</option>
              <option value="6">s.d Juni 2026 (Semester 1)</option>
              <option value="ALL">Semua Agenda Rapat</option>
            </select>
          </div>

          {/* Color Category Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-emerald-600 shrink-0" />
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
            >
              <option value="ALL">Semua Indikator Warna</option>
              <option value="GREEN">🟢 Hijau (81 - 100% / Baik)</option>
              <option value="YELLOW">🟡 Kuning (51 - 80% / Cukup)</option>
              <option value="RED">🔴 Merah (0 - 50% / Evaluasi BK)</option>
            </select>
          </div>

          {/* Fraksi Filter */}
          <div>
            <select
              value={selectedFraksi}
              onChange={(e) => setSelectedFraksi(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
            >
              <option value="ALL">Semua Fraksi</option>
              {fraksiList.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Raport Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Rekap Raport Kehadiran ({memberRaports.length} Anggota)
          </h3>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
              <tr>
                <th className="p-3">Anggota DPRD</th>
                <th className="p-3">Fraksi & Komisi</th>
                <th className="p-3 text-center">Kegiatan Diikuti</th>
                <th className="p-3 text-right">Persentase Kehadiran</th>
                <th className="p-3 text-center">Kategori Warna Raport</th>
                <th className="p-3 text-center">Status Evaluasi BK</th>
                <th className="p-3 text-right">Dokumen e-Raport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {memberRaports.map(({ member, raport, bkNote }) => (
                <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  
                  <td className="p-3">
                    <div className="flex items-center space-x-3">
                      <img src={member.photo} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{member.name}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">NIP: {member.nip}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-3">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{member.fraksi}</p>
                    <p className="text-[11px] text-slate-400">{member.komisi}</p>
                  </td>

                  <td className="p-3 text-center font-mono text-[11px]">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{raport.attendedCount}</span> / {raport.totalMandatory} Kegiatan
                  </td>

                  <td className="p-3 text-right font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                    {raport.percentage}%
                  </td>

                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${raport.categoryInfo.badgeClass}`}>
                      {raport.categoryInfo.label}
                    </span>
                  </td>

                  <td className="p-3 text-center text-[11px]">
                    {bkNote?.statusWarning ? (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-300">
                        {bkNote.statusWarning}
                      </span>
                    ) : (
                      <span className="text-slate-400">Kedisiplinan Baik</span>
                    )}
                  </td>

                  <td className="p-3 text-right">
                    <button
                      onClick={() => setActiveModalMemberId(member.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] inline-flex items-center gap-1.5 shadow"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Buka e-Raport</span>
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* ERaport Modal Component */}
      <ERaportModal
        isOpen={Boolean(activeModalMemberId)}
        onClose={() => setActiveModalMemberId(null)}
        memberId={activeModalMemberId}
      />

    </div>
  );
}

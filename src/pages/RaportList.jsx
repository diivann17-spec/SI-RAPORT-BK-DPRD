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
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

import { AKD_CATEGORIES } from '../utils/akdUtils';

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
  const [selectedAKD, setSelectedAKD] = useState('ALL');
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState('11'); // Default November
  const [activeModalMemberId, setActiveModalMemberId] = useState(null);

  // Compute all member raports with selectedPeriodMonth and selectedAKD
  const memberRaports = members.map(m => {
    const raport = getMemberRaport(m.id, selectedAKD, selectedPeriodMonth);
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
      (member.komisi && member.komisi.toLowerCase().includes(q));

    // Color filter
    const matchColor = selectedColor === 'ALL' || raport.categoryInfo.key === selectedColor;

    // Fraksi filter
    const matchFraksi = selectedFraksi === 'ALL' || member.fraksi === selectedFraksi;

    return matchSearch && matchColor && matchFraksi;
  });

  const fraksiList = Array.from(new Set(members.map(m => m.fraksi)));

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded border border-amber-500/30 uppercase tracking-wide">
              Badan Kehormatan (BK) & Pimpinan DPRD
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white">Raport Kedisiplinan Kehadiran</h1>
          <p className="text-xs text-slate-300">
            Hasil pengolahan evaluasi kehadiran anggota DPRD dengan indikator kategori warna Hijau, Kuning, & Merah.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition shrink-0"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>Cetak Rekap Raport</span>
        </button>
      </div>

      {/* Mobile-Friendly Category Tabs (Sesuai Mockup Screen 6) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: 'Semua' },
          { key: 'GREEN', label: 'Hijau' },
          { key: 'YELLOW', label: 'Kuning' },
          { key: 'RED', label: 'Merah' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedColor(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
              selectedColor === tab.key
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 sm:top-3" />
            <input
              type="text"
              placeholder="Cari nama, fraksi, komisi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-xl border border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* AKD Filter */}
          <div>
            <select
              value={selectedAKD}
              onChange={(e) => setSelectedAKD(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-emerald-600 dark:text-emerald-400"
            >
              {AKD_CATEGORIES.map(akd => (
                <option key={akd} value={akd}>{akd === 'ALL' ? 'Semua AKD / Seluruh Agenda' : `Filter: ${akd}`}</option>
              ))}
            </select>
          </div>

          {/* Period Filter (Default: s.d November) */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedPeriodMonth}
              onChange={(e) => setSelectedPeriodMonth(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
            >
              <option value="11">s.d November 2026 (Jan - Nov)</option>
              <option value="12">s.d Desember 2026 (1 Tahun)</option>
              <option value="10">s.d Oktober 2026</option>
              <option value="9">s.d September 2026</option>
              <option value="6">s.d Juni 2026 (Semester 1)</option>
              <option value="ALL">Semua Periode</option>
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

      {/* ── MOBILE CARD LIST VIEW (Sesuai Mockup Mobile Screen 6) ── */}
      <div className="md:hidden space-y-2.5">
        {memberRaports.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            Tidak ada data anggota sesuai filter.
          </div>
        ) : (
          memberRaports.map(({ member, raport, bkNote }) => {
            const isGreen = raport.categoryInfo.key === 'GREEN';
            const isYellow = raport.categoryInfo.key === 'YELLOW';
            const statusTag = isGreen ? 'Baik' : isYellow ? 'Cukup' : 'Kurang';
            const tagColor = isGreen
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : isYellow
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

            return (
              <div
                key={member.id}
                onClick={() => setActiveModalMemberId(member.id)}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between shadow-md active:scale-[0.99] transition cursor-pointer gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {member.photo ? (
                    <img
                      src={member.photo}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover border-2 border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-sm font-black text-slate-200 shrink-0">
                      {member.name?.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-white truncate">{member.name}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{member.jabatan} • {member.komisi}</p>
                    <p className="text-[11px] font-black text-slate-200 font-mono mt-0.5">
                      {raport.percentage}% Kehadiran
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${tagColor}`}>
                    {statusTag}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── DESKTOP TABLE VIEW (Hidden on Mobile) ── */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        
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

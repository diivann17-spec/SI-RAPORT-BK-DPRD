import React, { useEffect, useMemo, useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import ERaportModal from '../components/ERaportModal';
import LegacyAttendanceModal from '../components/LegacyAttendanceModal';
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
  ChevronRight,
  BookOpen,
  Upload
} from 'lucide-react';

import { AKD_CATEGORIES, getMemberAKDs, matchAKDCategory } from '../utils/akdUtils';
import * as XLSX from 'xlsx';

export default function RaportList() {
  const {
    members,
    getMemberRaport,
    bkNotes,
    activities
  } = useAttendance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState('ALL');
  const [selectedFraksi, setSelectedFraksi] = useState('ALL');
  const [selectedAKD, setSelectedAKD] = useState('ALL');
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState('11'); // Default November
  const [selectedActivity, setSelectedActivity] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [activeModalMemberId, setActiveModalMemberId] = useState(null);
  const [activeModalReportType, setActiveModalReportType] = useState('AVERAGE');
  const [reportType, setReportType] = useState('AVERAGE');
  const [isLegacyModalOpen, setIsLegacyModalOpen] = useState(false);

  useEffect(() => {
    window.__openLegacyModal = () => setIsLegacyModalOpen(true);
    return () => {
      delete window.__openLegacyModal;
    };
  }, []);

  useEffect(() => {
    const clearPrintMode = () => document.body.classList.remove('raport-list-printing');
    window.addEventListener('afterprint', clearPrintMode);
    return () => {
      window.removeEventListener('afterprint', clearPrintMode);
      clearPrintMode();
    };
  }, []);

  // Compute all member raports with selectedPeriodMonth and selectedAKD
  const memberRaports = members.map(m => {
    const raport = getMemberRaport(m.id, reportType === 'AKD' ? selectedAKD : 'ALL', selectedPeriodMonth, selectedActivity, selectedYear);
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
    const memberAKDs = getMemberAKDs(member);
    const isParipurnaFilter = /paripurna/i.test(selectedAKD);
    const matchAKD = selectedAKD === 'ALL' || isParipurnaFilter || memberAKDs.some(akd => matchAKDCategory(akd, selectedAKD));

    return matchSearch && matchColor && matchFraksi && (reportType === 'AVERAGE' || matchAKD);
  });

  const akdRaports = useMemo(() => {
    if (selectedAKD === 'ALL') {
      return memberRaports.map(({ member, bkNote }) => {
        const akds = [...getMemberAKDs(member), 'Rapat Paripurna']
          .filter((cat, idx, self) => self.findIndex(v => matchAKDCategory(v, cat)) === idx);
        const perAkdRaports = akds.map(akd => ({
          akd,
          raport: getMemberRaport(member.id, akd, selectedPeriodMonth, selectedActivity, selectedYear)
        }));
        return {
          member,
          category: getMemberAKDs(member).join(', ') || member.komisi || 'Anggota',
          perAkdRaports,
          raport: getMemberRaport(member.id, 'ALL', selectedPeriodMonth, selectedActivity, selectedYear),
          bkNote
        };
      });
    }

    return memberRaports
      .filter(({ member }) => {
        if (/paripurna/i.test(selectedAKD)) return true;
        return getMemberAKDs(member).some(akd => matchAKDCategory(akd, selectedAKD));
      })
      .map(({ member, bkNote }) => ({
        member,
        category: selectedAKD,
        raport: getMemberRaport(member.id, selectedAKD, selectedPeriodMonth, selectedActivity, selectedYear),
        bkNote
      }));
  }, [memberRaports, selectedAKD, selectedPeriodMonth, selectedActivity, selectedYear, getMemberRaport]);

  const reportRows = reportType === 'AVERAGE' ? memberRaports : akdRaports;

  const fraksiList = Array.from(new Set(members.map(m => m.fraksi)));
  const yearList = Array.from(new Set(activities.map(activity => String(activity.date || '').slice(0, 4)).filter(Boolean))).sort();

  const exportWorkbook = () => {
    const header = ['Nama', 'NIP', 'Fraksi', 'AKD / Komisi', 'Total Agenda Wajib', 'Hadir', 'Tepat Waktu', 'Terlambat', 'Terlambat Berat', 'Izin', 'Sakit', 'Dinas Luar', 'Tidak Hadir / Alpha', 'Persentase', 'Nilai', 'Kategori'];
    const rows = reportRows.map(({ member, raport, category }) => [
      member.name, member.nip || '', member.fraksi || '', category || member.komisi || '',
      raport.totalMandatory, raport.breakdown.hadir, raport.breakdown.tepatWaktu,
      raport.breakdown.terlambat, raport.breakdown.terlambatBerat,
      raport.breakdown.izin, raport.breakdown.sakit, raport.breakdown.dinas,
      raport.breakdown.alpa, raport.percentage === null ? '' : `${raport.percentage}%`,
      raport.discipline.grade, raport.categoryInfo.label
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    worksheet['!cols'] = header.map(() => ({ wch: 20 }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Kehadiran');
    XLSX.writeFile(workbook, `laporan-kehadiran-dprd-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="report-list-page space-y-4 sm:space-y-6">
      
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
            E-Raport kedisiplinan kehadiran digital anggota DPRD berdasarkan AKD, dengan indikator Hijau, Kuning, & Merah.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsLegacyModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 transition border border-amber-500/40"
          >
            <BookOpen className="w-4 h-4 text-amber-200" />
            <span>Migrasi / Input Absensi Manual Lama</span>
          </button>
          <button onClick={exportWorkbook} className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition"><FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)</button>
          <button onClick={() => { document.body.classList.add('raport-list-printing'); window.setTimeout(() => window.print(), 100); }} className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition"><Printer className="w-4 h-4 text-emerald-400" /> Cetak / PDF</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-1.5" role="tablist" aria-label="Jenis raport kehadiran">
        {[
          { key: 'AVERAGE', label: 'Raport Keseluruhan / Rata-Rata' },
          { key: 'AKD', label: 'Raport Berdasarkan AKD' }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={reportType === tab.key}
            onClick={() => setReportType(tab.key)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${reportType === tab.key ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-1 text-xs text-slate-500 dark:text-slate-400">
        {reportType === 'AVERAGE'
          ? 'Rekap seluruh agenda berstatus Wajib Hadir yang relevan dengan anggota, termasuk Rapat Paripurna.'
          : 'Hanya AKD yang menjadi keanggotaan anggota yang ditampilkan. Rapat Paripurna ditampilkan sebagai kegiatan wajib tersendiri.'}
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
              {(reportType === 'AKD' ? AKD_CATEGORIES : ['ALL']).map(akd => (
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

          <div>
            <select value={selectedActivity} onChange={event => setSelectedActivity(event.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold">
              <option value="ALL">Semua Kegiatan</option>
              {activities.map(activity => <option key={activity.id} value={activity.id}>{activity.title}</option>)}
            </select>
          </div>
          <div>
            <select value={selectedYear} onChange={event => setSelectedYear(event.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold">
              <option value="ALL">Semua Tahun</option>
              {yearList.map(year => <option key={year} value={year}>{year}</option>)}
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
            reportRows.map(({ member, raport, bkNote, category }) => {
            const isGreen = raport.categoryInfo.key === 'GREEN';
            const isYellow = raport.categoryInfo.key === 'YELLOW';
            const hasNoData = raport.categoryInfo.key === 'NO_DATA';
            const statusTag = hasNoData ? 'Belum Ada Data' : isGreen ? 'Baik' : isYellow ? 'Cukup' : 'Kurang';
            const tagColor = isGreen
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : isYellow
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : hasNoData
              ? 'bg-slate-500/20 text-slate-400 border-slate-500/40'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

            return (
              <div
                key={`${member.id}-${category || 'average'}`}
                onClick={() => {
                  setActiveModalReportType(reportType);
                  setActiveModalMemberId(member.id);
                }}
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
                    <p className="text-[10px] text-slate-400 truncate">{reportType === 'AKD' ? category : `${member.jabatan} • ${member.komisi}`}</p>
                    <p className="text-[11px] font-black text-slate-200 font-mono mt-0.5">{raport.percentage === null ? 'Belum Ada Data' : `${raport.percentage}% Kehadiran • Nilai ${raport.discipline.grade}`}</p>
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
            {reportType === 'AVERAGE'
              ? `Rekap Raport Keseluruhan / Rata-Rata (${reportRows.length} Anggota)`
              : `Rekap Raport Berdasarkan AKD: ${selectedAKD === 'ALL' ? 'Semua AKD' : selectedAKD} (${reportRows.length} Anggota)`}
          </h3>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full min-w-[1280px] text-xs text-left text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
              <tr>
                <th className="p-3 whitespace-nowrap min-w-[220px]">Anggota</th>
                <th className="p-3 whitespace-nowrap min-w-[300px]">{reportType === 'AKD' ? (selectedAKD === 'ALL' ? 'Keanggotaan AKD & Nilai' : 'AKD') : 'Fraksi / Komisi'}</th>
                <th className="p-3 text-center whitespace-nowrap min-w-[70px]">Agenda</th>
                <th className="p-3 text-center whitespace-nowrap min-w-[70px]">Hadir</th>
                <th className="p-3 text-center whitespace-nowrap min-w-[80px]">Tepat Waktu</th>
                <th className="p-3 text-center whitespace-nowrap min-w-[80px]">Terlambat</th>
                <th className="p-3 text-center whitespace-nowrap min-w-[90px]">Izin / Sakit</th>
                <th className="p-3 text-center whitespace-nowrap min-w-[80px]">Dinas Luar</th>
                <th className="p-3 text-center whitespace-nowrap min-w-[70px]">Alpha</th>
                <th className="p-3 text-right whitespace-nowrap min-w-[110px]">Kehadiran</th>
                <th className="p-3 text-center whitespace-nowrap min-w-[110px]">Kategori</th>
                <th className="p-3 text-center whitespace-nowrap min-w-[120px]">Status BK</th>
                <th className="p-3 text-right whitespace-nowrap min-w-[90px]">e-Raport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {reportRows.map(({ member, raport, bkNote, category, perAkdRaports }) => (
                <tr key={`${member.id}-${category || 'average'}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  
                  <td className="p-3 min-w-[220px]">
                    <div className="flex items-center space-x-3">
                      <img src={member.photo} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white whitespace-normal leading-tight">{member.name}</h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">NIP: {member.nip || '-'}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 min-w-[300px]">
                    {reportType === 'AKD' && selectedAKD === 'ALL' && perAkdRaports?.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{member.fraksi} • {member.komisi}</p>
                        <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                          {perAkdRaports.map(({ akd, raport: akdRaport }) => {
                            const isNoData = akdRaport.totalMandatory === 0 || akdRaport.percentage === null;
                            return (
                              <span
                                key={akd}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                              >
                                <span className="font-bold">{akd}:</span>
                                {isNoData ? (
                                  <span className="italic text-slate-400 font-medium">Belum ada data</span>
                                ) : (
                                  <span className={`font-black ${akdRaport.categoryInfo.textColor}`}>{akdRaport.percentage}%</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{reportType === 'AKD' ? category : member.fraksi}</p>
                        <p className="text-[11px] text-slate-400">{reportType === 'AKD' ? 'Agenda wajib sesuai keanggotaan' : member.komisi}</p>
                      </div>
                    )}
                  </td>

                  <td className="p-3 text-center font-mono text-[11px] font-bold">
                    {raport.totalMandatory}
                  </td>

                  <td className="p-3 text-center font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {raport.breakdown.hadir}
                  </td>

                  <td className="p-3 text-center font-mono text-[11px]">
                    {raport.breakdown.tepatWaktu}
                  </td>

                  <td className="p-3 text-center font-mono text-[11px]">
                    {raport.breakdown.terlambat + raport.breakdown.terlambatBerat}
                    {raport.breakdown.terlambatBerat > 0 && <span className="block text-[9px] text-rose-500">Berat: {raport.breakdown.terlambatBerat}</span>}
                  </td>

                  <td className="p-3 text-center font-mono text-[11px]">
                    {raport.breakdown.izin} / {raport.breakdown.sakit}
                  </td>

                  <td className="p-3 text-center font-mono text-[11px]">
                    {raport.breakdown.dinas}
                  </td>

                  <td className="p-3 text-center font-mono text-[11px] text-rose-600 dark:text-rose-400">
                    {raport.breakdown.alpa}
                  </td>

                  <td className="p-3 text-right font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                    {raport.percentage === null || raport.totalMandatory === 0 ? (
                      <span className="text-slate-400 text-xs font-normal italic">Belum ada data</span>
                    ) : (
                      <>{raport.percentage}% <span className="text-cyan-600 dark:text-cyan-400">({raport.discipline.grade})</span></>
                    )}
                  </td>

                  <td className="p-3 text-center">
                    {raport.totalMandatory === 0 || raport.percentage === null ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                        Belum Ada Data
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${raport.categoryInfo.badgeClass}`}>
                        {raport.categoryInfo.label}
                      </span>
                    )}
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
                      onClick={() => {
                        setActiveModalReportType(reportType);
                        setActiveModalMemberId(member.id);
                      }}
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
        reportType={activeModalReportType}
      />

      {/* Legacy Attendance Migration Modal Component */}
      <LegacyAttendanceModal
        isOpen={isLegacyModalOpen}
        onClose={() => setIsLegacyModalOpen(false)}
      />

    </div>
  );
}

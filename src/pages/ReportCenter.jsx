import React, { useEffect, useMemo, useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import RaportList from './RaportList';
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  Printer,
  Search,
  Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatCheckInWithStatus } from '../utils/raportUtils';
import dprdLogo from '../logo.png';

function PrintableReportHeader({ title, subtitle }) {
  return (
    <div className="flex items-center gap-4 bg-white text-black border-b-[3px] border-black pb-2 mb-5 px-4 pt-4 print:px-0 print:pt-0">
      <img src={dprdLogo} alt="Lambang Kabupaten Cirebon" className="w-[76px] h-[76px] object-contain shrink-0" />
      <div className="text-center flex-1 leading-tight">
        <h2 className="text-lg font-black uppercase tracking-wide text-black">PEMERINTAH KABUPATEN CIREBON</h2>
        <h3 className="text-base font-black uppercase text-black">SEKRETARIAT DEWAN PERWAKILAN RAKYAT DAERAH</h3>
        <p className="text-[11px] font-semibold text-gray-700">Jalan Sunan Drajat No. 1, Sumber, Kabupaten Cirebon, Jawa Barat 45611</p>
        <p className="text-[10px] text-gray-600">Telepon (0231) 321197</p>
        <h4 className="mt-3 text-sm font-black uppercase underline text-black">{title}</h4>
        <p className="text-[10px] text-gray-700">{subtitle}</p>
      </div>
      <div className="w-[76px] shrink-0" aria-hidden="true" />
    </div>
  );
}

function PrintableAttendanceTable({ rows, getName, getPosition, getAgency }) {
  const rowCount = Math.max(12, rows.length);
  const formatTime = value => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return `${date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace(':', '.')} WIB`;
  };
  return (
    <div className="hidden print:block text-black">
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
          {Array.from({ length: rowCount }, (_, index) => {
            const row = rows[index];
            return (
              <tr key={row?.id || `empty-${index}`} className="h-8">
                <td className="border border-black p-1 text-center">{index + 1}</td>
                <td className="border border-black p-1">{row ? getName(row) : ''}</td>
                <td className="border border-black p-1">{row ? getPosition(row) : ''}</td>
                <td className="border border-black p-1">{row ? getAgency(row) : ''}</td>
                <td className="border border-black p-1 text-center">{row ? formatTime(row.checkInAt || row.timestamp) : ''}</td>
                <td className="border border-black p-1 text-center">{row ? formatTime(row.checkOutAt) : ''}</td>
                <td className="border border-black p-1">{row ? [row.status, row.checkoutStatus].filter(Boolean).join(' | ') : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportCenter() {
  const { activities, members, personnel, logs } = useAttendance();
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [externalSearch, setExternalSearch] = useState('');
  const [selectedReportActivityId, setSelectedReportActivityId] = useState('ALL');
  const [printTarget, setPrintTarget] = useState(null);

  const selectedReportActivity = activities.find(activity => activity.id === selectedReportActivityId);

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('report-center-printing');
      setPrintTarget(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const printReport = (target) => {
    setPrintTarget(target);
    document.body.classList.add('report-center-printing');
    window.setTimeout(() => window.print(), 100);
  };

  const memberLogs = useMemo(
    () => logs.filter((log) => log.participantType !== 'EXTERNAL'),
    [logs]
  );

  const externalLogs = useMemo(
    () => logs.filter((log) => log.participantType === 'EXTERNAL'),
    [logs]
  );

  const reportMemberLogs = useMemo(
    () => memberLogs.filter(log => selectedReportActivityId === 'ALL' || log.activityId === selectedReportActivityId),
    [memberLogs, selectedReportActivityId]
  );

  const reportExternalLogs = useMemo(
    () => externalLogs.filter(log => selectedReportActivityId === 'ALL' || log.activityId === selectedReportActivityId),
    [externalLogs, selectedReportActivityId]
  );

  const uniqueUnits = useMemo(
    () =>
      Array.from(new Set(personnel.map((item) => item.unit).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [personnel]
  );

  const filteredPersonnel = useMemo(() => {
    const query = personnelSearch.toLowerCase();

    return personnel.filter((item) => {
      const searchable = [item.name, item.nip, item.jabatan, item.unit, item.pangkat]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchSearch = !query || searchable.includes(query);
      const matchUnit = selectedUnit === 'ALL' || item.unit === selectedUnit;

      return matchSearch && matchUnit;
    });
  }, [personnel, personnelSearch, selectedUnit]);

  const filteredExternalLogs = useMemo(() => {
    const query = externalSearch.toLowerCase();

    return reportExternalLogs.filter((item) => {
      const searchable = [
        item.guestName,
        item.invitedName,
        item.guestAgency,
        item.agency,
        item.category,
        item.status,
        item.checkInAt,
        item.checkOutAt,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return !query || searchable.includes(query);
    });
  }, [reportExternalLogs, externalSearch]);

  const formatDateTime = (value) => {
    if (!value) return '—';

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportPersonnelReport = () => {
    const rows = filteredPersonnel.map((item) => ({
      Nama: item.name || '',
      NIP: item.nip || '',
      Jabatan: item.jabatan || '',
      Pangkat: item.pangkat || '',
      'Bagian / Unit Kerja': item.unit || '',
      'Nomor Kontak': item.phone || '',
      Email: item.email || '',
      Status: item.statusActive === false ? 'Nonaktif' : 'Aktif',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Personel Sekretariat');
    XLSX.writeFile(
      workbook,
      `laporan-personel-sekretariat-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const exportExternalReport = () => {
    const rows = filteredExternalLogs.map((item) => ({
      Nama: item.guestName || item.invitedName || item.guestAgency || '',
      Instansi: item.guestAgency || item.agency || '',
      Kategori: item.category || '',
      'Check-in': formatDateTime(item.checkInAt),
      'Keterangan Check-in': formatCheckInWithStatus(item),
      'Check-out': formatDateTime(item.checkOutAt),
      Status: item.status || (item.checkOutAt ? 'Selesai' : 'Hadir'),
      'Durasi (menit)': item.durationMinutes ?? '',
      Metode: item.method || '',
      'Diwakili oleh': item.representativeName || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'External Absen');
    XLSX.writeFile(
      workbook,
      `laporan-external-absen-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="report-center-ui space-y-5">
      <style>{`@media print {
        body.report-center-printing .report-center-header,
        body.report-center-printing .report-center-summary,
        body.report-center-printing .report-section-hidden-print { display: none !important; }
        body.report-center-printing .report-section-target { display: block !important; border: 0 !important; box-shadow: none !important; }
        body.report-center-printing .report-section-target .print-hide-report-control { display: none !important; }
      }`}</style>
      <div className="report-center-header p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-900 border border-cyan-800/40 text-white shadow-xl flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
            Pusat Laporan
          </span>
          <h1 className="text-xl font-black mt-1">
            Laporan Anggota DPRD & Personel Sekretariat DPRD
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Rekap terpisah berdasarkan kategori data, filter masing-masing, dan ekspor
            yang live dari database.
          </p>
        </div>
        <BarChart3 className="w-9 h-9 text-cyan-300 shrink-0" />
      </div>

      <div className="report-center-summary grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CalendarDays className="w-5 h-5 text-emerald-500 mb-2" />
          <strong className="block text-xl">{activities.length}</strong>
          <span className="text-[11px] text-slate-500">Total kegiatan</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Users className="w-5 h-5 text-blue-500 mb-2" />
          <strong className="block text-xl">{members.length}</strong>
          <span className="text-[11px] text-slate-500">Anggota DPRD terdata</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Building2 className="w-5 h-5 text-violet-500 mb-2" />
          <strong className="block text-xl">{personnel.length}</strong>
          <span className="text-[11px] text-slate-500">Personel Sekretariat terdata</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <FileSpreadsheet className="w-5 h-5 text-amber-500 mb-2" />
          <strong className="block text-xl">{memberLogs.length}</strong>
          <span className="text-[11px] text-slate-500">Log kehadiran tercatat</span>
        </div>
      </div>

      <section className={`report-section ${printTarget && printTarget !== 'members' ? 'report-section-hidden-print' : ''} ${printTarget === 'members' ? 'report-section-target' : ''} bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden`}>
        <PrintableReportHeader
          title="DAFTAR HADIR"
          subtitle={`LAPORAN KEHADIRAN ANGGOTA DPRD KABUPATEN CIREBON${selectedReportActivity ? ` | ${selectedReportActivity.title} | ${selectedReportActivity.date} ${selectedReportActivity.startTime}–${selectedReportActivity.endTime} WIB` : ''}`}
        />
        <div className="print-hide-report-control px-4 sm:px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              1. Laporan Anggota DPRD
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Rekap kehadiran, evaluasi BK, filter Fraksi/Komisi/AKD, dan ekspor laporan
              anggota.
            </p>
            {selectedReportActivity && <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mt-1">Agenda: {selectedReportActivity.title} • {selectedReportActivity.date} • {selectedReportActivity.startTime}–{selectedReportActivity.endTime} WIB</p>}
          </div>
          <button
            type="button"
            onClick={() => printReport('members')}
            className="print-hide-report-control px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            Cetak / PDF
          </button>
        </div>
        <div className="p-3 sm:p-4">
          <div className="print-hide-report-control mb-3">
            <select value={selectedReportActivityId} onChange={event => setSelectedReportActivityId(event.target.value)} className="w-full sm:max-w-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold">
              <option value="ALL">Semua Agenda</option>
              {activities.map(activity => <option key={activity.id} value={activity.id}>{activity.title} • {activity.date} • {activity.startTime}–{activity.endTime}</option>)}
            </select>
          </div>
          <PrintableAttendanceTable
            rows={reportMemberLogs}
            getName={item => item.memberName || ''}
            getPosition={item => {
              const member = members.find(entry => entry.id === item.memberId);
              return member?.jabatan || 'Anggota DPRD';
            }}
            getAgency={item => {
              const member = members.find(entry => entry.id === item.memberId);
              return member?.fraksi || item.memberFraksi || 'DPRD Kabupaten Cirebon';
            }}
          />
          <div className="print:hidden">
            <RaportList />
          </div>
        </div>
      </section>

      <section className={`report-section ${printTarget && printTarget !== 'personnel' ? 'report-section-hidden-print' : ''} ${printTarget === 'personnel' ? 'report-section-target' : ''} bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden`}>
        <PrintableReportHeader
          title="DAFTAR HADIR"
          subtitle="LAPORAN PERSONEL SEKRETARIAT DPRD KABUPATEN CIREBON"
        />
        <div className="px-4 sm:px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              2. Laporan Personel Sekretariat DPRD
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Filter berdasarkan Bagian / Unit Kerja serta ekspor data personel yang
              terhubung langsung ke database.
            </p>
          </div>

          <button
            type="button"
            onClick={exportPersonnelReport}
            className="print-hide-report-control px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => printReport('personnel')}
            className="print-hide-report-control px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            Cetak / PDF
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-3">
          <div className="print-hide-report-control grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={personnelSearch}
                onChange={(event) => setPersonnelSearch(event.target.value)}
                placeholder="Cari nama, NIP, jabatan, unit..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-xl border border-slate-300 dark:border-slate-700"
              />
            </div>

            <select
              value={selectedUnit}
              onChange={(event) => setSelectedUnit(event.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
            >
              <option value="ALL">Semua Bagian / Unit Kerja</option>
              {uniqueUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>

          <PrintableAttendanceTable
            rows={filteredPersonnel}
            getName={item => item.name || ''}
            getPosition={item => `${item.jabatan || ''}${item.pangkat ? ` / ${item.pangkat}` : ''}`}
            getAgency={item => item.unit || 'Sekretariat DPRD'}
          />

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl print:hidden">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                <tr>
                  <th className="p-3">Personel</th>
                  <th className="p-3">Jabatan / Pangkat</th>
                  <th className="p-3">Bagian / Unit Kerja</th>
                  <th className="p-3">Kontak</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Tidak ada data personel sesuai filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  filteredPersonnel.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {item.photo ? (
                            <img
                              src={item.photo}
                              alt={item.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-200">
                              {item.name?.charAt(0) || 'P'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              NIP: {item.nip || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.jabatan || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400">{item.pangkat || '—'}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                          {item.unit || 'Unit belum diatur'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.phone || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400">{item.email || '—'}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.statusActive === false
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {item.statusActive === false ? 'Nonaktif' : 'Aktif'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={`report-section ${printTarget && printTarget !== 'external' ? 'report-section-hidden-print' : ''} ${printTarget === 'external' ? 'report-section-target' : ''} bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden`}>
        <PrintableReportHeader
          title="DAFTAR HADIR"
            subtitle={`LAPORAN EXTERNAL ABSEN - OPD, TAMU, DAN PERWAKILAN${selectedReportActivity ? ` | ${selectedReportActivity.title} | ${selectedReportActivity.date} ${selectedReportActivity.startTime}–${selectedReportActivity.endTime} WIB` : ''}`}
        />
        <div className="print-hide-report-control px-4 sm:px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              3. Laporan External Absen
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Rekap presensi tamu eksternal, OPD, dan peserta non-DPRD yang tercatat dari
              database live.
            </p>
            {selectedReportActivity && <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mt-1">Agenda: {selectedReportActivity.title} • {selectedReportActivity.date} • {selectedReportActivity.startTime}–{selectedReportActivity.endTime} WIB</p>}
          </div>

          <button
            type="button"
            onClick={exportExternalReport}
            className="print-hide-report-control px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => printReport('external')}
            className="print-hide-report-control px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            Cetak / PDF
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-3">
          <div className="print-hide-report-control">
            <select value={selectedReportActivityId} onChange={event => setSelectedReportActivityId(event.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold">
              <option value="ALL">Semua Agenda</option>
              {activities.map(activity => <option key={activity.id} value={activity.id}>{activity.title} • {activity.date} • {activity.startTime}–{activity.endTime}</option>)}
            </select>
          </div>
          <div className="print-hide-report-control relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={externalSearch}
              onChange={(event) => setExternalSearch(event.target.value)}
              placeholder="Cari nama, instansi, kategori, status..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-xl border border-slate-300 dark:border-slate-700"
            />
          </div>

          <PrintableAttendanceTable
            rows={filteredExternalLogs}
            getName={item => item.isRepresented ? item.representativeName || item.guestName || item.invitedName : item.guestName || item.invitedName || ''}
            getPosition={item => item.isRepresented ? item.representativePosition || item.position || '' : item.position || ''}
            getAgency={item => item.guestAgency || item.agency || ''}
          />

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl print:hidden">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                <tr>
                  <th className="p-3">Peserta</th>
                  <th className="p-3">Instansi / OPD</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Check-in</th>
                  <th className="p-3">Check-out</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExternalLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      Tidak ada data external absen yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredExternalLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.guestName || item.invitedName || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.isRepresented && item.representativeName
                            ? `Perwakilan: ${item.representativeName}`
                            : 'Peserta eksternal'}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 text-[10px] font-bold">
                          {item.guestAgency || item.agency || '—'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.category || '—'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatCheckInWithStatus(item)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatDateTime(item.checkOutAt)}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.checkOutAt
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {item.status || (item.checkOutAt ? 'Selesai' : 'Hadir')}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.durationMinutes ?? '—'} menit
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import RaportList from './RaportList';
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  Image,
  Printer,
  Search,
  Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatCheckInWithStatus } from '../utils/raportUtils';
import { getAttendancePhoto } from '../utils/attendancePhotoStore';
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

const getAttendanceId = (log) => log.attendanceId || log.id;

function PrintableAttendanceTable({ rows, getName, getPosition, getAgency, includeAgency = true }) {
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
            {includeAgency && <th className="border border-black p-1 text-left">Instansi</th>}
            <th className="border border-black p-1 text-center">Check-in</th>
            <th className="border border-black p-1 text-center">Check-out</th>
            <th className="border border-black p-1 text-left">Status</th>
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
                {includeAgency && <td className="border border-black p-1">{row ? getAgency(row) : ''}</td>}
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

function PrintableDocumentationAppendix({ rows, activities, formatDateTime, photoUrls, removeAttendancePhoto }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4 text-black">
      {rows.length === 0 ? (
        <p className="col-span-full py-8 text-center text-xs text-gray-500">Belum ada foto dokumentasi absensi.</p>
      ) : rows.map(log => {
        const activity = activities.find(item => item.id === (log.activityId || log.agendaId));
        const name = log.participantType === 'EXTERNAL'
          ? (log.isRepresented ? log.representativeName : log.guestName || log.invitedName)
          : log.memberName;
        const position = log.participantType === 'EXTERNAL'
          ? (log.isRepresented ? log.representativePosition : log.position)
          : 'Anggota DPRD';
        const attendanceId = getAttendanceId(log);
        const checkInPhotoSource = photoUrls[`${attendanceId}:CHECK_IN`] || (String(log.documentationPhoto || '').startsWith('data:image/') ? log.documentationPhoto : null);
        const checkOutPhotoSource = photoUrls[`${attendanceId}:CHECK_OUT`] || (String(log.checkoutPhoto || '').startsWith('data:image/') ? log.checkoutPhoto : null);

        return (
          <article key={attendanceId} className="border border-gray-400 rounded-lg p-3 break-inside-avoid bg-white">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {['Foto Check-in', 'Foto Check-out'].map(label => {
                const photo = label === 'Foto Check-in' ? checkInPhotoSource : checkOutPhotoSource;
                return (
                  <figure key={label}>
                    {photo ? <img src={photo} alt={`${label} ${name || ''}`} className="w-full h-40 object-cover border border-gray-300 rounded" /> : <div className="flex h-40 items-center justify-center rounded border border-dashed border-gray-400 text-center text-[10px] text-gray-500">Foto dokumentasi tidak tersedia</div>}
                    <figcaption className="mt-1 text-center text-[9px] font-bold">{label}</figcaption>
                    {(label === 'Foto Check-in' ? (log.documentationPhotoRef || log.checkInPhotoId || log.documentationPhoto) : (log.checkoutPhotoRef || log.checkOutPhotoId || log.checkoutPhoto)) && (
                      <button
                        type="button"
                        className="no-print mt-1 text-[9px] font-bold text-rose-600 hover:text-rose-500"
                        onClick={async () => {
                          if (!window.confirm('Hapus foto dokumentasi ini?\nFoto yang dihapus tidak dapat dikembalikan.')) return;
                          const result = await removeAttendancePhoto({ attendanceId, photoType: label === 'Foto Check-in' ? 'CHECK_IN' : 'CHECK_OUT' });
                          if (!result.success) window.alert(result.message || 'Foto gagal dihapus.');
                        }}
                      >
                        🗑 Hapus
                      </button>
                    )}
                  </figure>
                );
              })}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[10px]">
              <dt className="font-bold">Nama</dt><dd>{name || '-'}</dd>
              <dt className="font-bold">Jabatan</dt><dd>{position || '-'}</dd>
              <dt className="font-bold">Agenda</dt><dd>{activity?.title || log.activityId || '-'}</dd>
              <dt className="font-bold">Check-in</dt><dd>{formatDateTime(log.checkInAt || log.timestamp)}</dd>
              <dt className="font-bold">Check-out</dt><dd>{formatDateTime(log.checkOutAt)}</dd>
              <dt className="font-bold">Status</dt><dd>{log.status || (log.checkOutAt ? 'Selesai' : 'Hadir')}</dd>
            </dl>
          </article>
        );
      })}
    </div>
  );
}

export default function ReportCenter() {
  const { activities, members, personnel, logs, removeAttendancePhoto } = useAttendance();
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [externalSearch, setExternalSearch] = useState('');
  const [selectedReportActivityId, setSelectedReportActivityId] = useState('ALL');
  const [printTarget, setPrintTarget] = useState(null);
  const [photoUrls, setPhotoUrls] = useState({});
  const [photosLoading, setPhotosLoading] = useState(false);

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
    if (target === 'documentation' && photosLoading) return;
    setPrintTarget(target);
    document.body.classList.add('report-center-printing');
    window.setTimeout(async () => {
      const images = Array.from(document.querySelectorAll('.report-section-target img'));
      await Promise.all(images.map(image => image.complete
        ? Promise.resolve()
        : new Promise(resolve => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        })));
      window.print();
    }, 150);
  };

  const memberLogs = useMemo(
    () => logs.filter((log) => log.participantType !== 'EXTERNAL' && log.participantCategory !== 'PERSONEL SEKRETARIAT'),
    [logs]
  );

  const personnelAttendanceLogs = useMemo(
    () => logs.filter(log => log.participantType !== 'EXTERNAL' && log.participantCategory === 'PERSONEL SEKRETARIAT' && (selectedReportActivityId === 'ALL' || (log.activityId || log.agendaId) === selectedReportActivityId)),
    [logs, selectedReportActivityId]
  );

  const externalLogs = useMemo(
    () => logs.filter((log) => log.participantType === 'EXTERNAL'),
    [logs]
  );

  const reportMemberLogs = useMemo(
    () => memberLogs.filter(log => selectedReportActivityId === 'ALL' || (log.activityId || log.agendaId) === selectedReportActivityId),
    [memberLogs, selectedReportActivityId]
  );

  const reportExternalLogs = useMemo(
    () => externalLogs.filter(log => selectedReportActivityId === 'ALL' || (log.activityId || log.agendaId) === selectedReportActivityId),
    [externalLogs, selectedReportActivityId]
  );

  const documentationLogs = useMemo(
    () => [...reportMemberLogs, ...reportExternalLogs].filter(log => log.documentationPhotoRef || log.checkInPhotoId || log.checkoutPhotoRef || log.checkOutPhotoId || log.documentationPhoto || log.checkoutPhoto),
    [reportMemberLogs, reportExternalLogs]
  );

  useEffect(() => {
    let cancelled = false;
    setPhotosLoading(true);
    const loadPhotos = async () => {
      const entries = await Promise.all(documentationLogs.flatMap(log => [
        (log.documentationPhotoRef || log.checkInPhotoId) ? getAttendancePhoto(log.documentationPhotoRef || log.checkInPhotoId).then(url => [`${getAttendanceId(log)}:CHECK_IN`, url]) : null,
        (log.checkoutPhotoRef || log.checkOutPhotoId) ? getAttendancePhoto(log.checkoutPhotoRef || log.checkOutPhotoId).then(url => [`${getAttendanceId(log)}:CHECK_OUT`, url]) : null,
      ].filter(Boolean)));
      if (!cancelled) {
        setPhotoUrls(Object.fromEntries(entries.filter(([, url]) => url)));
        setPhotosLoading(false);
      }
    };
    loadPhotos().catch(() => {
      if (!cancelled) {
        setPhotoUrls({});
        setPhotosLoading(false);
      }
    });
    return () => {
      cancelled = true;
      Object.values(photoUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [documentationLogs]);

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
            includeAgency={false}
          />
          <div className="print:hidden">
            <RaportList />
          </div>
        </div>
      </section>

      <section className={`report-section ${printTarget && printTarget !== 'documentation' ? 'report-section-hidden-print' : ''} ${printTarget === 'documentation' ? 'report-section-target' : ''} bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden`}>
        <PrintableReportHeader
          title="LAMPIRAN DOKUMENTASI ABSENSI"
          subtitle={`FOTO BUKTI KEHADIRAN${selectedReportActivity ? ` | ${selectedReportActivity.title} | ${selectedReportActivity.date}` : ''}`}
        />
        <div className="print-hide-report-control px-4 sm:px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Image className="w-4 h-4 text-emerald-600" /> 2. Lampiran Dokumentasi Absensi
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">Foto check-in dan check-out terhubung dengan log peserta, agenda, waktu, dan status.</p>
          </div>
          <button type="button" onClick={() => printReport('documentation')} disabled={photosLoading} className="print-hide-report-control px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:cursor-wait disabled:opacity-50">
            <Printer className="w-4 h-4" /> Cetak Lampiran / PDF
          </button>
        </div>
        <div className="p-3 sm:p-4">
          <div className="print-hide-report-control mb-3">
            <select value={selectedReportActivityId} onChange={event => setSelectedReportActivityId(event.target.value)} className="w-full sm:max-w-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold">
              <option value="ALL">Semua Agenda</option>
              {activities.map(activity => <option key={activity.id} value={activity.id}>{activity.title} • {activity.date} • {activity.startTime}–{activity.endTime}</option>)}
            </select>
          </div>
          {photosLoading && <p className="mb-3 text-xs text-slate-500">Memuat foto dokumentasi dari penyimpanan lokal...</p>}
          <PrintableDocumentationAppendix rows={documentationLogs} activities={activities} formatDateTime={formatDateTime} photoUrls={photoUrls} removeAttendancePhoto={removeAttendancePhoto} />
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
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">Log kehadiran agenda: {personnelAttendanceLogs.length} personel. Data ini tidak dihitung dalam e-RAPORT Anggota DPRD.</p>
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

          {personnelAttendanceLogs.length > 0 && <div className="overflow-x-auto border border-emerald-200 dark:border-emerald-900/50 rounded-xl print:hidden">
            <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-xs font-bold text-emerald-800 dark:text-emerald-300">Daftar Kehadiran Personel pada Agenda</div>
            <PrintableAttendanceTable
              rows={personnelAttendanceLogs}
              getName={item => item.memberName || ''}
              getPosition={item => personnel.find(entry => entry.id === item.memberId)?.jabatan || 'Personel Sekretariat DPRD'}
              getAgency={item => personnel.find(entry => entry.id === item.memberId)?.unit || 'Sekretariat DPRD'}
            />
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-emerald-50/60 dark:bg-emerald-950/20 text-slate-900 dark:text-white font-bold">
                <tr><th className="p-3">Nama</th><th className="p-3">Jabatan / Bagian</th><th className="p-3">Agenda</th><th className="p-3">Check-in</th><th className="p-3">Check-out</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-emerald-100 dark:divide-emerald-900/30">
                {personnelAttendanceLogs.map(log => {
                  const item = personnel.find(entry => entry.id === log.memberId);
                  const activity = activities.find(entry => entry.id === log.activityId);
                  return <tr key={log.id}><td className="p-3 font-semibold">{log.memberName || item?.name || '-'}</td><td className="p-3">{item?.jabatan || '-'} / {item?.unit || 'Sekretariat DPRD'}</td><td className="p-3">{activity?.title || log.activityId}</td><td className="p-3">{formatDateTime(log.checkInAt || log.timestamp)}</td><td className="p-3">{formatDateTime(log.checkOutAt)}</td><td className="p-3">{log.status || '-'}</td></tr>;
                })}
              </tbody>
            </table>
          </div>}

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

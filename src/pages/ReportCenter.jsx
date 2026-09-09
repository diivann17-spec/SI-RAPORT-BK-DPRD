import React from 'react';
import { useAttendance } from '../context/AttendanceContext';
import RaportList from './RaportList';
import dprdLogo from '../logo.png';
import { BarChart3, CalendarDays, FileSpreadsheet, Users, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ReportCenter() {
  const { activities, members, logs, deleteAttendanceLog, reportSigners, isAdmin, isBK } = useAttendance();
  const [deletingId, setDeletingId] = React.useState(null);
  const [selectedExternalActivityId, setSelectedExternalActivityId] = React.useState('ALL');
  const internalLogs = logs.filter(log => log.participantType !== 'EXTERNAL');
  const externalLogs = logs.filter(log => log.participantType === 'EXTERNAL');
  const printableExternalLogs = selectedExternalActivityId === 'ALL'
    ? externalLogs
    : externalLogs.filter(log => log.activityId === selectedExternalActivityId);
  const printableActivity = activities.find(activity => activity.id === selectedExternalActivityId) || activities[0];
  const externalCategories = ['OPD/INSTANSI', 'SEKRETARIAT/ASN', 'NARASUMBER', 'TAMU/UNDANGAN'];
  const hadir = internalLogs.filter(log => ['Hadir', 'Hadir Tepat Waktu', 'Hadir Terlambat'].includes(log.status)).length;
  const percentage = internalLogs.length ? Math.round((hadir / internalLogs.length) * 100) : 0;
  const exportExternalReport = () => {
    const rows = externalLogs.map(log => ({
      Kegiatan: activities.find(activity => activity.id === log.activityId)?.title || log.activityId,
      Kategori: log.participantCategory || 'OPD/INSTANSI',
      Instansi: log.agency || log.guestAgency || '',
      Diundang: log.invitedName || '',
      YangHadir: log.isRepresented ? log.representativeName : log.guestName,
      Status: log.isRepresented ? 'Perwakilan' : log.status,
      Metode: log.method,
      Waktu: log.timestamp
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Peserta Eksternal');
    XLSX.writeFile(workbook, `laporan-peserta-eksternal-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDeleteExternal = async (log) => {
    if (!window.confirm(`Hapus data percobaan peserta "${log.guestName || log.invitedName || 'tanpa nama'}"? Data akan dihapus dari laporan dan database.`)) return;
    setDeletingId(log.id);
    await deleteAttendanceLog(log.id);
    setDeletingId(null);
  };

  const printExternalAttendance = () => window.print();

  return (
    <div className="report-center-ui space-y-5">
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-900 border border-cyan-800/40 text-white shadow-xl flex items-center justify-between gap-4"><div><span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Pusat Pelaporan Terintegrasi</span><h1 className="text-xl font-black mt-1">Laporan Kegiatan & Kehadiran</h1><p className="text-xs text-slate-300 mt-1">Rekap anggota, kegiatan, AKD, kehadiran, dan export dokumen.</p></div><BarChart3 className="w-9 h-9 text-cyan-300 shrink-0" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"><CalendarDays className="w-5 h-5 text-emerald-500 mb-2" /><strong className="block text-xl">{activities.length}</strong><span className="text-[11px] text-slate-500">Total kegiatan</span></div><div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"><Users className="w-5 h-5 text-blue-500 mb-2" /><strong className="block text-xl">{members.length}</strong><span className="text-[11px] text-slate-500">Anggota terdata</span></div><div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"><FileSpreadsheet className="w-5 h-5 text-amber-500 mb-2" /><strong className="block text-xl">{internalLogs.length}</strong><span className="text-[11px] text-slate-500">Log kehadiran</span></div><div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"><BarChart3 className="w-5 h-5 text-cyan-500 mb-2" /><strong className="block text-xl">{percentage}%</strong><span className="text-[11px] text-slate-500">Rasio hadir tercatat</span></div></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{externalCategories.map(category => <div key={category} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"><strong className="block text-xl text-cyan-500">{externalLogs.filter(log => (log.participantCategory || 'OPD/INSTANSI') === category).length}</strong><span className="text-[11px] text-slate-500">{category}</span></div>)}</div>
      <section className="no-print bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"><div className="flex items-center justify-between gap-2"><div><h2 className="font-bold text-sm text-slate-900 dark:text-white">Laporan Peserta Eksternal</h2><p className="text-[11px] text-slate-500">Undangan, kehadiran langsung, dan perwakilan.</p></div><div className="flex flex-wrap gap-2"><select value={selectedExternalActivityId} onChange={event => setSelectedExternalActivityId(event.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"><option value="ALL">Semua Kegiatan</option>{activities.map(activity => <option key={activity.id} value={activity.id}>{activity.title}</option>)}</select><button onClick={printExternalAttendance} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Cetak Daftar Hadir</button><button onClick={exportExternalReport} className="px-3 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4" /> Export Excel</button></div></div><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700"><th className="p-2">Peserta</th><th className="p-2">Instansi</th><th className="p-2">Kategori</th><th className="p-2">Status</th><th className="p-2">Metode</th>{(isAdmin || isBK) && <th className="p-2">Aksi</th>}</tr></thead><tbody>{externalLogs.map(log => <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800"><td className="p-2"><strong>{log.isRepresented ? log.representativeName : log.guestName}</strong><span className="block text-[10px] text-slate-500">Undangan: {log.invitedName}</span></td><td className="p-2">{log.agency || log.guestAgency}</td><td className="p-2">{log.participantCategory || 'OPD/INSTANSI'}</td><td className="p-2">{log.isRepresented ? 'Perwakilan' : log.status}</td><td className="p-2">{log.method}</td>{(isAdmin || isBK) && <td className="p-2"><button onClick={() => handleDeleteExternal(log)} disabled={deletingId === log.id} title="Hapus data percobaan" className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button></td>}</tr>)}</tbody></table></div></section>
      <section className="attendance-print-sheet print-only">
        <div className="attendance-print-header"><img src={dprdLogo} alt="Logo Pemerintah Kabupaten Cirebon" /><div><h1>PEMERINTAH KABUPATEN CIREBON</h1><h2>SEKRETARIAT DEWAN PERWAKILAN RAKYAT DAERAH</h2><p>Jalan Sunan Bonang No. 1, Telp. (0231) 321259 Fax. 323136</p><p>Email: SekretariatDprd@cirebonkab.go.id</p></div></div>
        <div className="attendance-print-title"><h2>DAFTAR HADIR</h2><p>{printableActivity?.title || 'KEGIATAN DPRD KABUPATEN CIREBON'}</p><p>{printableActivity?.date || ''} {printableActivity?.startTime ? `• ${printableActivity.startTime} - ${printableActivity.endTime || 'Selesai'} WIB` : ''}</p></div>
        <table><thead><tr><th>No</th><th>Nama</th><th>Jabatan</th><th>Instansi</th><th>Check-in</th><th>Check-out</th><th>Keterangan / Status</th></tr></thead><tbody>{printableExternalLogs.map((log, index) => <tr key={log.id}><td>{index + 1}</td><td>{log.isRepresented ? log.representativeName : (log.guestName || log.invitedName)}</td><td>{log.representativePosition || log.position || '-'}</td><td>{log.agency || log.guestAgency || '-'}</td><td>{log.timestamp ? `${new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : '-'}</td><td>{log.checkOutAt ? `${new Date(log.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : '-'}</td><td>{log.isRepresented ? 'Hadir sebagai Perwakilan' : (log.note || log.status || 'Hadir')}</td></tr>)}{Array.from({ length: Math.max(0, 15 - printableExternalLogs.length) }).map((_, index) => <tr key={`empty-${index}`}><td>{printableExternalLogs.length + index + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>)}</tbody></table>
        <div className="attendance-print-signatures" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, reportSigners.filter(signer => signer.active !== false).length))}, minmax(0, 1fr))` }}>{reportSigners.filter(signer => signer.active !== false).map(signer => <div key={signer.id}>{signer.label || 'Mengetahui'}<br />{signer.position}<br /><br /><strong>{signer.name}</strong>{signer.rank && <><br />{signer.rank}</>}{signer.nip && <><br />NIP. {signer.nip}</>}</div>)}</div>
      </section>
      <RaportList />
    </div>
  );
}

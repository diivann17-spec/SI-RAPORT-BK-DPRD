import React, { useMemo, useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import RaportList from './RaportList';
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  Search,
  Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ReportCenter() {
  const { activities, members, personnel, logs } = useAttendance();
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('ALL');

  const memberLogs = useMemo(
    () => logs.filter((log) => log.participantType !== 'EXTERNAL'),
    [logs]
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

  return (
    <div className="report-center-ui space-y-5">
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-900 border border-cyan-800/40 text-white shadow-xl flex items-center justify-between gap-4">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            1. Laporan Anggota DPRD
          </h2>
          <p className="text-[11px] text-slate-500 mt-1">
            Rekap kehadiran, evaluasi BK, filter Fraksi/Komisi/AKD, dan ekspor laporan
            anggota.
          </p>
        </div>
        <div className="p-3 sm:p-4">
          <RaportList />
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
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
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
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
    </div>
  );
}

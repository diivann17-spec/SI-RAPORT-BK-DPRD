import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { ShieldCheck, Search, Clock, Laptop, Filter } from 'lucide-react';

export default function AuditLogs() {
  const { auditLogs } = useAttendance();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = auditLogs.filter(l =>
    l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 text-white shadow-xl flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Keamanan & Transparansi Data</span>
          </div>
          <h1 className="text-xl font-extrabold text-white">Log Jejak Audit (Audit Trail Engine)</h1>
          <p className="text-xs text-slate-400">
            Seluruh aktivitas pencatatan absensi, perubahan data manual, dan catatan evaluasi BK terekam dalam log yang tidak dapat diubah.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Cari aktivitas, nama petugas, aksi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 text-xs rounded-xl border border-slate-200 dark:border-slate-800"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
              <tr>
                <th className="p-3">Waktu & Timestamp</th>
                <th className="p-3">Pengguna / Peran</th>
                <th className="p-3">Kode Aksi</th>
                <th className="p-3">Rincian Deskripsi Audit</th>
                <th className="p-3 text-center">Metode</th>
                <th className="p-3 text-right">Alamat IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-[11px] text-slate-500">
                    {new Date(log.timestamp).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-slate-900 dark:text-white">{log.userName}</p>
                    <p className="text-[10px] text-slate-400">{log.userRole}</p>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">
                    {log.details}
                  </td>
                  <td className="p-3 text-center font-bold text-[10px] text-slate-500">
                    {log.method}
                  </td>
                  <td className="p-3 text-right font-mono text-[11px] text-slate-400">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

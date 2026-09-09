import React from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  LayoutDashboard,
  QrCode,
  MapPin,
  FileSpreadsheet,
  Users,
  Calendar,
  ShieldCheck,
  Settings,
  CreditCard,
  AlertTriangle,
  LogOut,
  Mail,
  BarChart3,
  Bell,
  DoorOpen,
  FolderArchive
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { currentRole, logs, activities, members, logout } = useAttendance();

  // Count active warnings for badge indicator
  const redCount = members.filter(m => {
    const totalAct = activities.length || 1;
    const mLogs = logs.filter(l => l.memberId === m.id);
    let score = 0;
    activities.forEach(a => {
      const lg = mLogs.find(l => l.activityId === a.id);
      if (lg?.status === 'Hadir' || lg?.status === 'Dinas') score += 1;
      else if (lg?.status === 'Terlambat' || lg?.status === 'Izin' || lg?.status === 'Sakit') score += 0.75;
    });
    return Math.round((score / totalAct) * 100) <= 50;
  }).length;

  const menuItems = [
    {
      id: 'member_portal',
      label: 'Portal Pribadi Anggota',
      icon: Users,
      badge: 'Pribadi',
      roles: ['ANGGOTA_DPRD']
    },
    {
      id: 'dashboard',
      label: 'Dashboard Monitoring',
      icon: LayoutDashboard,
      roles: ['PETUGAS_BK', 'PETUGAS_SCAN', 'SECRETARIAT_ADMIN']
    },
    {
      id: 'webcam_scan',
      label: 'Absensi QR Webcam',
      icon: QrCode,
      badge: 'Laptop',
      roles: ['PETUGAS_SCAN', 'SECRETARIAT_ADMIN', 'PETUGAS_BK']
    },
    {
      id: 'member_qr',
      label: 'Kartu QR Digital',
      icon: CreditCard,
      roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK', 'PETUGAS_SCAN']
    },
    {
      id: 'raport',
      label: 'Raport Kedisiplinan & BK',
      icon: FileSpreadsheet,
      badge: redCount > 0 ? `${redCount} EWS` : null,
      badgeColor: 'bg-rose-500 text-white',
      roles: ['PETUGAS_BK', 'SECRETARIAT_ADMIN', 'ANGGOTA_DPRD']
    },
    {
      id: 'reports',
      label: 'Laporan Terintegrasi',
      icon: BarChart3,
      roles: ['PETUGAS_BK', 'SECRETARIAT_ADMIN', 'ANGGOTA_DPRD']
    },
    {
      id: 'calendar',
      label: 'Kalender Agenda',
      icon: Calendar,
      roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK', 'ANGGOTA_DPRD']
    },
    {
      id: 'archive',
      label: 'Arsip Digital',
      icon: FolderArchive,
      roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK', 'ANGGOTA_DPRD']
    },
    {
      id: 'notifications',
      label: 'Pusat Notifikasi',
      icon: Bell,
      roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK', 'ANGGOTA_DPRD']
    },
    {
      id: 'invitations',
      label: 'Undangan & Amplop',
      icon: Mail,
      roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK']
    },
    {
      id: 'members',
      label: 'Data Anggota DPRD',
      icon: Users,
      roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK']
    },
    {
      id: 'personnel',
      label: 'Personel Sekretariat DPRD',
      icon: Users,
      roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK']
    },
    {
      id: 'rooms',
      label: 'Master Ruangan',
      icon: DoorOpen,
      roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK']
    },
    {
      id: 'activities',
      label: 'Agenda & Jadwal Kegiatan',
      icon: Calendar,
      roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK', 'ANGGOTA_DPRD']
    },
    {
      id: 'audit',
      label: 'Log Jejak Audit',
      icon: ShieldCheck,
      roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK']
    },
    {
      id: 'settings',
      label: 'Pengaturan & Firebase',
      icon: Settings,
      roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK']
    }
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(currentRole));

  return (
    <aside className="no-print hidden md:block w-full md:w-72 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0">
      <div className="p-4">

        {/* Role Identity Tag */}
        <div className="mb-6 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
            BK
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 font-medium">Mode Pengguna</p>
            <p className="text-xs font-bold text-amber-300 leading-tight break-words">
              {currentRole === 'PETUGAS_BK' && 'Badan Kehormatan (BK)'}
              {currentRole === 'PETUGAS_SCAN' && 'Operator Laptop Scan'}
              {currentRole === 'ANGGOTA_DPRD' && 'Aplikasi Anggota'}
              {currentRole === 'SECRETARIAT_ADMIN' && 'Sekretariat DPRD'}
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {filteredMenu.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate text-left leading-snug">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* EWS Warning Box for BK */}
        {currentRole === 'PETUGAS_BK' && redCount > 0 && (
          <div className="mt-8 p-3 rounded-xl bg-rose-950/50 border border-rose-900/60 text-xs">
            <div className="flex items-center space-x-2 text-rose-400 font-semibold mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Early Warning System</span>
            </div>
            <p className="text-[11px] text-rose-300/80 leading-relaxed">
              Terdapat <strong className="text-rose-200 font-bold">{redCount} anggota</strong> dalam kategori Merah (kehadiran ≤ 50%).
            </p>
            <button
              onClick={() => setActiveTab('raport')}
              className="mt-2 text-[11px] font-medium text-rose-300 underline hover:text-rose-100"
            >
              Lihat Raport & Evaluasi &rarr;
            </button>
          </div>
        )}

        {/* Sidebar Footer: Quick Logout */}
        <div className="pt-4 mt-6 border-t border-slate-800">
          <button
            onClick={() => {
              if (window.confirm('Keluar dari sesi SI-RAPORT?')) {
                logout();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-950/50 hover:bg-rose-900/80 border border-rose-900/60 text-rose-300 hover:text-white text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout Sesi</span>
          </button>
        </div>

      </div>
    </aside>
  );
}

import React, { useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import dprdLogo from '../logo.png';
import {
  X,
  LayoutDashboard,
  QrCode,
  CreditCard,
  FileSpreadsheet,
  Users,
  Calendar,
  ShieldCheck,
  Settings,
  LogOut,
  MapPin,
  ChevronRight,
  ShieldAlert,
  Bell,
  Mail,
  BarChart3,
  FolderArchive,
  DoorOpen
} from 'lucide-react';

export default function MobileDrawer({ isOpen, onClose, activeTab, setActiveTab }) {
  const { currentRole, currentUser, logout, logs, activities, members } = useAttendance();

  // Hitung jumlah EWS / kategori merah
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

  // Tutup drawer jika tombol ESC ditekan
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Cegah body scroll saat drawer terbuka di mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSelectMenu = (tabId) => {
    setActiveTab(tabId);
    onClose();
  };

  // Struktur Menu Terkelompok
  const menuSections = [
    {
      title: 'MENU UTAMA',
      items: [
        {
          id: currentRole === 'ANGGOTA_DPRD' ? 'member_portal' : 'dashboard',
          label: currentRole === 'ANGGOTA_DPRD' ? 'Portal Pribadi Anggota' : 'Dashboard Monitoring',
          icon: LayoutDashboard,
          roles: ['PETUGAS_BK', 'PETUGAS_SCAN', 'SECRETARIAT_ADMIN', 'ANGGOTA_DPRD']
        }
      ]
    },
    {
      title: 'ABSENSI & KEHADIRAN',
      items: [
        {
          id: 'webcam_scan',
          label: 'Absensi QR Webcam',
          icon: QrCode,
          badge: 'Laptop',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
          roles: ['PETUGAS_SCAN', 'SECRETARIAT_ADMIN', 'PETUGAS_BK']
        },
        {
          id: 'member_qr',
          label: 'Kartu QR Digital',
          icon: CreditCard,
          roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK', 'PETUGAS_SCAN']
        },
        {
          id: 'gps_mobile',
          label: 'Presensi GPS Lokasi',
          icon: MapPin,
          roles: ['ANGGOTA_DPRD', 'SECRETARIAT_ADMIN', 'PETUGAS_BK']
        }
      ]
    },
    {
      title: 'MANAJEMEN',
      items: [
        {
          id: 'raport',
          label: 'Raport Kedisiplinan',
          icon: FileSpreadsheet,
          badge: redCount > 0 ? `${redCount}` : null,
          badgeColor: 'bg-rose-500 text-white font-bold',
          roles: ['PETUGAS_BK', 'SECRETARIAT_ADMIN', 'ANGGOTA_DPRD']
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
          id: 'activities',
          label: 'Agenda & Jadwal',
          icon: Calendar,
          roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK', 'ANGGOTA_DPRD']
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
          roles: ['PETUGAS_BK', 'SECRETARIAT_ADMIN', 'ANGGOTA_DPRD']
        },
        {
          id: 'archive',
          label: 'Arsip Digital',
          icon: FolderArchive,
          roles: ['PETUGAS_BK', 'SECRETARIAT_ADMIN', 'ANGGOTA_DPRD']
        },
        {
          id: 'notifications',
          label: 'Pusat Notifikasi',
          icon: Bell,
          roles: ['PETUGAS_BK', 'SECRETARIAT_ADMIN', 'ANGGOTA_DPRD']
        },
        {
          id: 'rooms',
          label: 'Master Ruangan',
          icon: DoorOpen,
          roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK']
        },
        {
          id: 'invitations',
          label: 'Undangan & Amplop',
          icon: Mail,
          roles: ['SECRETARIAT_ADMIN', 'PETUGAS_BK']
        }
      ]
    },
    {
      title: 'SISTEM',
      items: [
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
      ]
    }
  ];

  return (
    <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      
      {/* Backdrop Overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Panel (Slide from Left) */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-[85%] max-w-sm bg-slate-900 border-r border-slate-800 text-slate-100 shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header & Profile Card */}
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 flex items-center justify-center">
                <img src={dprdLogo} alt="Logo DPRD" className="w-9 h-9 object-contain drop-shadow" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-sm tracking-wider text-emerald-400">SI-RAPORT</span>
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-amber-500/30">BK</span>
                </div>
                <p className="text-[10px] text-slate-400">BK DPRD Kabupaten Cirebon</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Role Card inside Drawer */}
          <div className="p-4 pb-2">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-800/90 border border-emerald-500/30 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-extrabold text-sm">
                BK
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs text-white truncate">
                  {currentUser?.name || 'Badan Kehormatan'}
                </h4>
                <p className="text-[10px] text-emerald-400 font-medium truncate">
                  BK DPRD Kabupaten Cirebon
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Menu List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          {menuSections.map((section, idx) => {
            const visibleItems = section.items.filter(item => item.roles.includes(currentRole));
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <div className="px-2 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                  {section.title}
                </div>
                <div className="space-y-1">
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectMenu(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/80 active:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Drawer Footer: Logout Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={() => {
              onClose();
              if (window.confirm('Keluar dari sesi SI-RAPORT?')) {
                logout();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-white font-bold text-xs transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar / Logout</span>
          </button>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { AttendanceProvider, useAttendance } from './context/AttendanceContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MobileDrawer from './components/MobileDrawer';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import AttendanceScan from './pages/AttendanceScan';
import GPSAttendance from './pages/GPSAttendance';
import MemberQRCard from './pages/MemberQRCard';
import RaportList from './pages/RaportList';
import MemberList from './pages/MemberList';
import PersonnelList from './pages/PersonnelList';
import ActivityList from './pages/ActivityList';
import MemberPortal from './pages/MemberPortal';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import RoomList from './pages/RoomList';
import Login from './pages/Login';
import PublicMemberAttendancePage from './pages/PublicMemberAttendancePage';
import PublicOpdAttendancePage from './pages/PublicOpdAttendancePage';
import InvitationCenter from './pages/InvitationCenter';
import ReportCenter from './pages/ReportCenter';
import CalendarAgenda from './pages/CalendarAgenda';
import ArchiveCenter from './pages/ArchiveCenter';
import NotificationCenter from './pages/NotificationCenter';
import AccountManagement from './pages/AccountManagement';
import SplashScreen from './components/SplashScreen';
import { Loader2, QrCode } from 'lucide-react';
import { authService } from './firebase/authService';

// Inner app mengakses context
function AppInner() {
  const { loading, authReady, currentUser, currentRole } = useAttendance();
  const [publicGuestRequested, setPublicGuestRequested] = useState(false);
  const [agendaEntryChoice, setAgendaEntryChoice] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(
    () => (currentRole === 'ANGGOTA_DPRD' ? 'member_portal' : 'dashboard')
  );

  // Deteksi jika user membuka halaman presensi dari scan Google Lens / QR Agenda URL (?absen=ACT-xxx)
  const [scannedActivityId, setScannedActivityId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('absen') || null;
    } catch (e) {
      return null;
    }
  });
  const [scanType] = useState(() => new URLSearchParams(window.location.search).get('type') || 'agenda');

  // Sinkronisasi activeTab otomatis sesuai hak akses / role saat login
  useEffect(() => {
    if (!currentUser) return;
    if (currentRole === 'ANGGOTA_DPRD') {
      setActiveTab('member_portal');
    } else if (currentRole === 'PETUGAS_SCAN') {
      setActiveTab('webcam_scan');
    } else {
      // SECRETARIAT_ADMIN / PETUGAS_BK
      setActiveTab('dashboard');
    }
  }, [currentUser, currentRole]);

  useEffect(() => {
    if (!authReady || !scannedActivityId || scanType !== 'opd' || currentUser || publicGuestRequested) return;
    setPublicGuestRequested(true);
    authService.enterPublicGuest().catch(() => setPublicGuestRequested(false));
  }, [authReady, scannedActivityId, scanType, currentUser, publicGuestRequested]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-400" />
          <p className="text-sm font-semibold">Memverifikasi sesi pengguna...</p>
          <p className="text-xs text-slate-500">Menyiapkan halaman absensi dan koneksi Firebase.</p>
        </div>
      </div>
    );
  }

  // QR Agenda tetap menggunakan sesi Firebase agar rules dapat memverifikasi pemilik absensi.
  if (scannedActivityId) {
    if (scanType === 'agenda' && !currentUser && !agendaEntryChoice) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-5">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-950 text-emerald-300">
              <QrCode className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-black">Absensi Agenda</h1>
            <p className="mt-2 text-sm text-slate-400">Pilih jenis peserta untuk melanjutkan absensi.</p>
            <div className="mt-6 grid gap-3">
              <button type="button" onClick={() => { setAgendaEntryChoice('member'); setPublicGuestRequested(true); authService.enterPublicGuest().catch(() => setPublicGuestRequested(false)); }} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-500">
                Anggota DPRD
                <span className="mt-1 block text-[11px] font-normal text-emerald-100">Pilih anggota peserta agenda</span>
              </button>
              <button type="button" onClick={() => { setAgendaEntryChoice('opd'); setPublicGuestRequested(true); authService.enterPublicGuest().catch(() => setPublicGuestRequested(false)); }} className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-black text-white hover:bg-teal-600">
                Tamu OPD / Instansi
                <span className="mt-1 block text-[11px] font-normal text-teal-100">Tanpa akun, isi data tamu</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (['opd', 'agenda'].includes(scanType) && !currentUser) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
          <div className="text-center space-y-3"><Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-400" /><p className="text-sm font-semibold">Menyiapkan absensi tamu OPD...</p></div>
        </div>
      );
    }
    return (
      (scanType === 'opd' || agendaEntryChoice === 'opd') ? <PublicOpdAttendancePage
        initialActivityId={scannedActivityId}
        publicGuest={currentRole === 'PUBLIC_GUEST'}
        onBackToApp={() => {
          // Bersihkan query param dari URL
          window.history.replaceState({}, '', window.location.pathname);
          setScannedActivityId(null);
        }}
      /> : <PublicMemberAttendancePage
        initialActivityId={scannedActivityId}
        memberOnly={currentRole === 'ANGGOTA_DPRD'}
        onBackToApp={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setScannedActivityId(null);
        }}
      />
    );
  }

  if (currentRole === 'PUBLIC_GUEST') {
    return <PublicOpdAttendancePage onBackToApp={() => authService.logout()} publicGuest />;
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white pb-20 md:pb-0">

      {/* Navigation Navbar Header */}
      <Navbar
        onOpenMenu={() => setIsDrawerOpen(true)}
        onOpenNotifications={() => setActiveTab('notifications')}
      />

      {/* Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Global Loading Banner (saat Firestore pertama kali sync) */}
      {loading && (
        <div className="fixed top-14 sm:top-16 inset-x-0 z-40 flex items-center justify-center">
          <div className="bg-slate-900/95 border border-slate-700 text-white text-xs px-4 py-2 rounded-full shadow-xl flex items-center gap-2 backdrop-blur-sm">
            <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>Memuat data dari database...</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1500px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 gap-4 sm:gap-6 xl:gap-7">

        {/* Sidebar Menu (Desktop only) */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic Main View Panel */}
        <main className="flex-1 min-w-0">
          {activeTab === 'member_portal' && <MemberPortal onNavigate={setActiveTab} />}
          {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
          {activeTab === 'webcam_scan' && <AttendanceScan />}
          {activeTab === 'gps_mobile' && <GPSAttendance />}
          {activeTab === 'member_qr' && <MemberQRCard />}
          {activeTab === 'raport' && <RaportList />}
          {activeTab === 'reports' && <ReportCenter onNavigate={setActiveTab} />}
          {activeTab === 'calendar' && <CalendarAgenda />}
          {activeTab === 'archive' && <ArchiveCenter />}
          {activeTab === 'notifications' && <NotificationCenter />}
          {activeTab === 'invitations' && <InvitationCenter />}
          {activeTab === 'members' && <MemberList onNavigate={setActiveTab} />}
          {activeTab === 'personnel' && <PersonnelList />}
          {activeTab === 'activities' && <ActivityList />}
          {activeTab === 'audit' && <AuditLogs />}
          {activeTab === 'accounts' && <AccountManagement />}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'rooms' && <RoomList />}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMenu={() => setIsDrawerOpen(true)}
      />

      {/* Footer */}
      <footer className="no-print border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 sm:py-4 text-center text-[10px] sm:text-xs text-slate-500">
        <p>© 2026 SI-RAPORT BK DPRD • Sistem Informasi Absensi, Monitoring & Raport Kehadiran Anggota DPRD</p>
      </footer>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Jangan tampilkan splash screen panjang jika user membuka langsung link presensi QR
    try {
      return !window.location.search.includes('absen=');
    } catch (e) {
      return true;
    }
  });

  return (
    <AttendanceProvider>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <AppInner />
    </AttendanceProvider>
  );
}

import React, { useState } from 'react';
import { AttendanceProvider, useAttendance } from './context/AttendanceContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AttendanceScan from './pages/AttendanceScan';
import GPSAttendance from './pages/GPSAttendance';
import MemberQRCard from './pages/MemberQRCard';
import RaportList from './pages/RaportList';
import MemberList from './pages/MemberList';
import ActivityList from './pages/ActivityList';
import MemberPortal from './pages/MemberPortal';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import Login from './pages/Login';
import SplashScreen from './components/SplashScreen';
import { Loader2 } from 'lucide-react';

// Inner app mengakses context
function AppInner() {
  const { loading, currentUser, currentRole } = useAttendance();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState(
    () => (currentRole === 'ANGGOTA_DPRD' ? 'member_portal' : 'dashboard')
  );

  // Sync tab when switching roles
  React.useEffect(() => {
    if (currentRole === 'ANGGOTA_DPRD') {
      setActiveTab('member_portal');
    } else if (activeTab === 'member_portal') {
      setActiveTab('dashboard');
    }
  }, [currentRole]);

  if (!currentUser) {
    return (
      <>
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        <Login />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Splash Screen on Initial Load */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Navigation Navbar Header */}
      <Navbar />

      {/* Global Loading Banner (saat Firestore pertama kali sync) */}
      {loading && (
        <div className="fixed top-16 inset-x-0 z-40 flex items-center justify-center">
          <div className="bg-slate-900/95 border border-slate-700 text-white text-xs px-4 py-2 rounded-full shadow-xl flex items-center gap-2 backdrop-blur-sm">
            <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>Memuat data dari Cloud Firestore...</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">

        {/* Sidebar Menu */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic Main View Panel */}
        <main className="flex-1 min-w-0">
          {activeTab === 'member_portal' && <MemberPortal />}
          {activeTab === 'dashboard'     && <Dashboard onNavigate={setActiveTab} />}
          {activeTab === 'webcam_scan'   && <AttendanceScan />}
          {activeTab === 'gps_mobile'    && <GPSAttendance />}
          {activeTab === 'member_qr'     && <MemberQRCard />}
          {activeTab === 'raport'        && <RaportList />}
          {activeTab === 'members'       && <MemberList />}
          {activeTab === 'activities'    && <ActivityList />}
          {activeTab === 'audit'         && <AuditLogs />}
          {activeTab === 'settings'      && <Settings />}
        </main>
      </div>

      {/* Footer */}
      <footer className="no-print border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-500">
        <p>© 2026 SI-RAPORT BK DPRD • Sistem Informasi Absensi, Monitoring & Raport Kehadiran Anggota DPRD</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AttendanceProvider>
      <AppInner />
    </AttendanceProvider>
  );
}

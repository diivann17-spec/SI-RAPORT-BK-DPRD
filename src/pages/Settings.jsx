import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { firebaseConfig } from '../firebase/config';
import { seedFirestoreFromMockData } from '../firebase/firestoreService';
import {
  INITIAL_MEMBERS,
  INITIAL_ACTIVITIES,
  INITIAL_ATTENDANCE_LOGS,
  INITIAL_AUDIT_TRAILS,
  INITIAL_BK_NOTES
} from '../firebase/mockData';
import {
  Settings as SettingsIcon,
  Database,
  Key,
  RefreshCw,
  CheckCircle,
  ShieldCheck,
  CloudUpload,
  Wifi,
  WifiOff,
  Info,
  AlertTriangle,
  Terminal,
  Loader2
} from 'lucide-react';

export default function Settings() {
  const { resetSystemData, members, activities, logs, auditLogs, bkNotes } = useAttendance();
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [seedStatus, setSeedStatus] = useState('idle'); // idle | loading | success | error
  const [seedCount, setSeedCount] = useState(0);
  const [seedError, setSeedError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSeedFirestore = async () => {
    if (!isOnline) {
      setSeedError('Tidak ada koneksi internet. Hubungkan jaringan terlebih dahulu.');
      return;
    }
    setSeedStatus('loading');
    setSeedError('');
    try {
      const count = await seedFirestoreFromMockData(
        members,
        activities,
        logs,
        auditLogs,
        bkNotes
      );
      setSeedCount(count);
      setSeedStatus('success');
    } catch (err) {
      console.error('Seed error:', err);
      setSeedError(err.message || 'Gagal melakukan seed data ke Firestore.');
      setSeedStatus('error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 text-white shadow-xl">
        <h1 className="text-xl font-extrabold text-white">Pengaturan Sistem & Firebase Backend</h1>
        <p className="text-xs text-slate-400 mt-1">Konfigurasi Cloud Firestore, Authentication, Storage & sinkronisasi data ke database live.</p>
      </div>

      {/* Firebase Connection Status */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-500" />
            Status Koneksi Firebase Project
          </h3>
          <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
            isOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online — Firebase Terhubung' : 'Offline — Mode Lokal Aktif'}
          </span>
        </div>

        {/* Firebase Config Details */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1.5 text-slate-700 dark:text-slate-300">
          <div className="flex gap-3"><span className="text-slate-400 w-32 shrink-0">Project ID:</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{firebaseConfig.projectId}</span></div>
          <div className="flex gap-3"><span className="text-slate-400 w-32 shrink-0">Auth Domain:</span><span>{firebaseConfig.authDomain}</span></div>
          <div className="flex gap-3"><span className="text-slate-400 w-32 shrink-0">Storage Bucket:</span><span>{firebaseConfig.storageBucket}</span></div>
          <div className="flex gap-3"><span className="text-slate-400 w-32 shrink-0">Sender ID:</span><span>{firebaseConfig.messagingSenderId}</span></div>
          <div className="flex gap-3"><span className="text-slate-400 w-32 shrink-0">Analytics:</span><span>{firebaseConfig.measurementId}</span></div>
          <div className="flex gap-3"><span className="text-slate-400 w-32 shrink-0">API Key:</span><span className="truncate max-w-xs text-amber-600 dark:text-amber-400">{firebaseConfig.apiKey?.slice(0, 20)}••••••••</span></div>
        </div>
      </div>

      {/* Seed Data to Firestore */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-sm">
          <CloudUpload className="w-5 h-5 text-blue-500" />
          <span>Inisialisasi & Seed Data ke Cloud Firestore</span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Upload seluruh data yang ada di sistem saat ini (anggota, kegiatan, log absensi, audit trail) ke
          <strong className="text-slate-700 dark:text-slate-200"> Cloud Firestore</strong> project <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-600 dark:text-emerald-400">si-raport-bk-dprd</code>.
          Proses ini aman dan menggunakan <code className="text-amber-600 dark:text-amber-400 font-mono text-[11px]">merge: true</code> sehingga tidak akan menghapus data yang sudah ada.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center">
          {[
            { label: 'Anggota DPRD', count: members.length, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Agenda Kegiatan', count: activities.length, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Log Absensi', count: logs.length, color: 'text-purple-600 dark:text-purple-400' },
            { label: 'Audit Trails', count: auditLogs.length, color: 'text-amber-600 dark:text-amber-400' },
          ].map(item => (
            <div key={item.label} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className={`font-black text-lg ${item.color}`}>{item.count}</p>
              <p className="text-slate-500 text-[10px]">{item.label}</p>
            </div>
          ))}
        </div>

        {seedStatus === 'success' && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>✅ Berhasil upload <strong>{seedCount} dokumen</strong> ke Cloud Firestore! Cek Firebase Console untuk memverifikasi.</span>
          </div>
        )}
        {seedStatus === 'error' && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gagal seed ke Firestore:</p>
              <p className="font-mono text-[11px] mt-0.5 opacity-80">{seedError}</p>
              <p className="text-[11px] mt-1 opacity-70">Pastikan Firestore Rules sudah mengizinkan write, atau cek apakah project Firebase aktif.</p>
            </div>
          </div>
        )}

        <button
          onClick={handleSeedFirestore}
          disabled={seedStatus === 'loading'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
        >
          {seedStatus === 'loading' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Sedang Upload ke Firestore...</span></>
          ) : (
            <><CloudUpload className="w-4 h-4" /><span>Upload & Seed Data ke Cloud Firestore</span></>
          )}
        </button>
      </div>

      {/* Firestore Rules Guidance */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
          <Terminal className="w-5 h-5" />
          <span>Panduan Setup Firestore Security Rules</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Agar seed data berhasil dan akses terproteksi, pasang rules berikut di <strong>Firebase Console → Firestore → Rules</strong>:
        </p>
        <pre className="bg-slate-950 text-emerald-400 text-[11px] p-4 rounded-xl overflow-x-auto font-mono leading-relaxed">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Izinkan read/write untuk authenticated users saja
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Public read untuk members (untuk QR scan verifikasi)
    match /members/{memberId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Audit trails: hanya bisa di-create, tidak bisa di-update/delete
    match /auditTrails/{logId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false; // immutable
    }
  }
}`}</pre>
      </div>

      {/* Reset Data Demo */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
          <RefreshCw className="w-5 h-5" />
          <span>Reset Data Lokal ke Kondisi Awal Demo</span>
        </div>
        <p className="text-xs text-slate-500">
          Kembalikan seluruh data lokal (anggota, agenda, absensi, audit) ke dataset demo awal. Data di Firestore <strong>tidak terpengaruh</strong>.
        </p>
        <button
          onClick={() => {
            if (window.confirm('Reset seluruh data lokal ke kondisi awal demo?')) {
              resetSystemData();
              alert('✅ Data lokal berhasil di-reset!');
            }
          }}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset Data Lokal Demo</span>
        </button>
      </div>

    </div>
  );
}

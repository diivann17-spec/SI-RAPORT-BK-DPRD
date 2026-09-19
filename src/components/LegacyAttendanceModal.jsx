import React, { useState, useMemo, useRef } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { AKD_CATEGORIES, matchAKDCategory } from '../utils/akdUtils';
import { getStatusBadge, getSourceBadge } from '../utils/raportUtils';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle, AlertTriangle,
  X, Search, Filter, Calendar, UserCheck, Clock, FileText,
  Edit3, Trash2, ShieldCheck, Check, Loader2,
  Info, Database, Sparkles, BookOpen
} from 'lucide-react';

const ATTENDANCE_STATUS_OPTIONS = [
  { value: 'Hadir', label: 'Hadir', color: 'bg-emerald-600 border-emerald-500 text-white' },
  { value: 'Terlambat', label: 'Terlambat', color: 'bg-amber-600 border-amber-500 text-white' },
  { value: 'Izin', label: 'Izin', color: 'bg-blue-600 border-blue-500 text-white' },
  { value: 'Sakit', label: 'Sakit', color: 'bg-purple-600 border-purple-500 text-white' },
  { value: 'Dinas Luar', label: 'Dinas Luar', color: 'bg-indigo-600 border-indigo-500 text-white' },
  { value: 'Alpha', label: 'Tidak Hadir / Alpha', color: 'bg-rose-600 border-rose-500 text-white' },
];

export default function LegacyAttendanceModal({ isOpen, onClose }) {
  const {
    members,
    activities,
    logs,
    recordLegacyAttendance,
    batchImportLegacyAttendance,
    updateLegacyAttendance,
    deleteLegacyAttendance,
    currentUser
  } = useAttendance();

  const [activeTab, setActiveTab] = useState('SINGLE'); // 'SINGLE' | 'IMPORT' | 'LIST'
  const fileInputRef = useRef(null);

  // ─── State Single Entry ─────────────────────────────────────────────────────
  const [singleForm, setSingleForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    title: '',
    akd: 'Komisi I',
    category: 'Rapat Kerja',
    memberId: '',
    status: 'Hadir',
    checkInTime: '09:00',
    checkOutTime: '12:00',
    note: '',
    operatorName: currentUser?.name || 'Petugas Sekretariat DPRD'
  });
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleFeedback, setSingleFeedback] = useState({ type: '', message: '' });

  // ─── State Batch Import ─────────────────────────────────────────────────────
  const [importFile, setImportFile] = useState(null);
  const [rawRows, setRawRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    date: '',
    title: '',
    akd: '',
    category: '',
    memberName: '',
    nip: '',
    status: '',
    checkInTime: '',
    checkOutTime: '',
    note: ''
  });
  const [fileHeaders, setFileHeaders] = useState([]);
  const [parsedPreview, setParsedPreview] = useState([]);
  const [filterPreviewStatus, setFilterPreviewStatus] = useState('ALL'); // 'ALL' | 'VALID' | 'ERROR' | 'DUPLICATE'
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // ─── State List & Edit ──────────────────────────────────────────────────────
  const [listSearch, setListSearch] = useState('');
  const [listAKDFilter, setListAKDFilter] = useState('ALL');
  const [editingLog, setEditingLog] = useState(null);
  const [editForm, setEditForm] = useState({
    status: 'Hadir',
    checkInTime: '09:00',
    checkOutTime: '12:00',
    note: '',
    changeReason: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Filter legacy logs
  const legacyLogs = useMemo(() => {
    return logs.filter(l => l.method === 'MANUAL_LEGACY' || l.source === 'MANUAL_LEGACY' || l.isLegacy);
  }, [logs]);

  const filteredLegacyLogs = useMemo(() => {
    return legacyLogs.filter(log => {
      const q = listSearch.toLowerCase();
      const matchSearch =
        !q ||
        log.memberName?.toLowerCase().includes(q) ||
        log.activityId?.toLowerCase().includes(q) ||
        log.note?.toLowerCase().includes(q) ||
        log.status?.toLowerCase().includes(q);

      const act = activities.find(a => a.id === log.activityId);
      const matchAKD = listAKDFilter === 'ALL' || (act && matchAKDCategory(act.akd || act.category, listAKDFilter));

      return matchSearch && matchAKD;
    });
  }, [legacyLogs, listSearch, listAKDFilter, activities]);

  const validRowsToImport = useMemo(() => {
    return parsedPreview.filter(p => p.isValid && !p.isDuplicate);
  }, [parsedPreview]);

  if (!isOpen) return null;

  // ─── Handler Single Entry ───────────────────────────────────────────────────
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setSingleFeedback({ type: '', message: '' });

    if (!singleForm.date) {
      setSingleFeedback({ type: 'error', message: 'Tanggal kegiatan wajib diisi.' });
      return;
    }
    if (!singleForm.title.trim()) {
      setSingleFeedback({ type: 'error', message: 'Nama agenda kegiatan wajib diisi.' });
      return;
    }
    if (!singleForm.memberId) {
      setSingleFeedback({ type: 'error', message: 'Pilih anggota DPRD terlebih dahulu.' });
      return;
    }

    setSingleLoading(true);
    const result = await recordLegacyAttendance(singleForm);
    setSingleLoading(false);

    if (result.success) {
      setSingleFeedback({
        type: 'success',
        message: `Absensi manual lama berhasil disimpan & digabungkan ke riwayat E-RAPORT ${result.log.memberName}.`
      });
      setSingleForm(prev => ({
        ...prev,
        note: '',
        status: 'Hadir'
      }));
      setTimeout(() => setSingleFeedback({ type: '', message: '' }), 4000);
    } else {
      setSingleFeedback({
        type: 'error',
        message: result.message || 'Gagal menyimpan absensi manual lama.'
      });
    }
  };

  // ─── Template Generator ─────────────────────────────────────────────────────
  const downloadTemplateExcel = () => {
    const headers = [
      'Tanggal (YYYY-MM-DD)',
      'Nama Anggota',
      'Agenda Kegiatan',
      'AKD / Komisi',
      'Status Kehadiran',
      'Keterangan',
      'Jam Masuk (HH:MM)',
      'Jam Keluar (HH:MM)'
    ];

    const sampleRows = [
      [
        '2026-01-15',
        members[0]?.name || 'H. Ahmad Subarkah, S.E.',
        'Rapat Kerja Evaluasi Kinerja Triwulan IV',
        'Komisi I',
        'Hadir',
        'Absensi buku manual lama arsip Komisi I',
        '09:00',
        '12:30'
      ],
      [
        '2026-01-15',
        members[1]?.name || 'Dr. Hj. Siti Rohmah, M.Si.',
        'Rapat Kerja Evaluasi Kinerja Triwulan IV',
        'Komisi I',
        'Terlambat',
        'Terlambat 45 menit',
        '09:45',
        '12:30'
      ],
      [
        '2026-02-10',
        members[2]?.name || 'Bambang Irawan, S.H.',
        'Rapat Pembahasan Ranperda RTRW 2026-2046',
        'Bapemperda',
        'Dinas Luar',
        'SPT No. 090/112/DPRD/II/2026',
        '08:30',
        '16:00'
      ],
      [
        '2026-03-05',
        members[0]?.name || 'H. Ahmad Subarkah, S.E.',
        'Rapat Paripurna Penyampaian LKPJ Kepala Daerah TA 2025',
        'Rapat Paripurna',
        'Hadir',
        'Hadir tepat waktu',
        '08:45',
        '13:00'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 18 }, { wch: 32 }, { wch: 38 }, { wch: 22 },
      { wch: 18 }, { wch: 35 }, { wch: 16 }, { wch: 16 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Absensi Lama');
    XLSX.writeFile(wb, 'template-migrasi-absensi-manual-lama.xlsx');
  };

  // ─── File Upload & Parsing ──────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

        if (jsonData.length < 2) {
          alert('File kosong atau tidak memiliki data.');
          return;
        }

        const headers = jsonData[0].map(h => String(h || '').trim());
        setFileHeaders(headers);

        const rows = jsonData.slice(1).filter(r => r.some(c => String(c).trim() !== ''));
        setRawRows(rows);

        // Smart auto-detect columns berdasarkan header template resmi & variasi
        const detected = {
          date: headers.find(h => /^tanggal|\bdate\b|\btgl\b/i.test(h)) || headers[0] || '',
          memberName: headers.find(h => /nama\s*anggota|\banggota\b|\bmember\b|\bpeserta\b/i.test(h) && !/agenda|kegiatan|acara/i.test(h)) || headers[1] || '',
          title: headers.find(h => /agenda|judul|kegiatan|acara/i.test(h) && !/anggota|member|peserta/i.test(h)) || headers[2] || '',
          akd: headers.find(h => /\bakd\b|komisi|badan|panitia|organizer/i.test(h)) || headers[3] || '',
          status: headers.find(h => /status|kehadiran|presensi/i.test(h)) || headers[4] || '',
          note: headers.find(h => /keterangan|catatan|alasan|note/i.test(h)) || headers[5] || '',
          checkInTime: headers.find(h => /masuk|check\s*in|jam\s*datang/i.test(h)) || headers[6] || '',
          checkOutTime: headers.find(h => /keluar|check\s*out|jam\s*pulang/i.test(h)) || headers[7] || '',
          category: headers.find(h => /jenis|kategori|tipe/i.test(h)) || '',
          nip: headers.find(h => /\bnip\b|id\s*digital|nomor/i.test(h)) || ''
        };
        setColumnMapping(detected);

        // Parse & Validate preview
        parseAndValidateRows(rows, headers, detected);
      } catch (err) {
        alert('Gagal membaca file Excel/CSV: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const parseAndValidateRows = (rows, headers, mapping) => {
    const dateIdx = headers.indexOf(mapping.date);
    const titleIdx = headers.indexOf(mapping.title);
    const akdIdx = headers.indexOf(mapping.akd);
    const catIdx = headers.indexOf(mapping.category);
    const memberNameIdx = headers.indexOf(mapping.memberName);
    const nipIdx = headers.indexOf(mapping.nip);
    const statusIdx = headers.indexOf(mapping.status);
    const inIdx = headers.indexOf(mapping.checkInTime);
    const outIdx = headers.indexOf(mapping.checkOutTime);
    const noteIdx = headers.indexOf(mapping.note);

    const parsed = rows.map((row, idx) => {
      const rawDate = dateIdx >= 0 ? String(row[dateIdx] || '').trim() : '';
      const rawMemberName = memberNameIdx >= 0 ? String(row[memberNameIdx] || '').trim() : '';
      const rawTitle = titleIdx >= 0 ? String(row[titleIdx] || '').trim() : '';
      const rawAKD = akdIdx >= 0 ? String(row[akdIdx] || '').trim() : '';
      const rawCat = catIdx >= 0 ? String(row[catIdx] || '').trim() : '';
      const rawNip = nipIdx >= 0 ? String(row[nipIdx] || '').trim() : '';
      const rawStatus = statusIdx >= 0 ? String(row[statusIdx] || '').trim() : '';
      const rawIn = inIdx >= 0 ? String(row[inIdx] || '').trim() : '';
      const rawOut = outIdx >= 0 ? String(row[outIdx] || '').trim() : '';
      const rawNote = noteIdx >= 0 ? String(row[noteIdx] || '').trim() : '';

      // Normalisasi Tanggal
      let normalizedDate = rawDate;
      if (rawDate.includes('T')) {
        normalizedDate = rawDate.split('T')[0];
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDate)) {
        const [d, m, y] = rawDate.split('/');
        normalizedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(rawDate)) {
        const [d, m, y] = rawDate.split('-');
        normalizedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      const isDateValid = Boolean(normalizedDate && !isNaN(new Date(normalizedDate).getTime()));

      // Pencocokan Nama Anggota (Robust Member Matching)
      let matchedMember = null;
      if (rawNip) {
        matchedMember = members.find(m => String(m.nip || '').trim() === rawNip);
      }
      if (!matchedMember && rawMemberName) {
        const cleanRaw = rawMemberName
          .toLowerCase()
          .replace(/\b(h\.|hj\.|dr\.|drs\.|s\.e\.|m\.si\.|s\.h\.|s\.pd\.|s\.sos\.|s\.ip\.|m\.h\.|m\.m\.|m\.ba\.)\b/g, '')
          .replace(/[^a-z0-9]/g, '');

        matchedMember = members.find(m => {
          const cleanDB = String(m.name || '')
            .toLowerCase()
            .replace(/\b(h\.|hj\.|dr\.|drs\.|s\.e\.|m\.si\.|s\.h\.|s\.pd\.|s\.sos\.|s\.ip\.|m\.h\.|m\.m\.|m\.ba\.)\b/g, '')
            .replace(/[^a-z0-9]/g, '');
          return cleanDB === cleanRaw || (cleanDB.length > 3 && (cleanDB.includes(cleanRaw) || cleanRaw.includes(cleanDB)));
        });
      }

      // Normalisasi & Validasi Status
      let normalizedStatus = 'Hadir';
      let isStatusValid = true;
      const stLower = rawStatus.toLowerCase();
      if (stLower.includes('terlambat')) normalizedStatus = 'Terlambat';
      else if (stLower.includes('izin') || stLower.includes('ijin')) normalizedStatus = 'Izin';
      else if (stLower.includes('sakit')) normalizedStatus = 'Sakit';
      else if (stLower.includes('dinas')) normalizedStatus = 'Dinas Luar';
      else if (stLower.includes('alpha') || stLower.includes('alpa') || stLower.includes('tidak hadir') || stLower.includes('absen')) normalizedStatus = 'Alpha';
      else if (stLower.includes('hadir') || stLower.includes('on time') || stLower === 'present') normalizedStatus = 'Hadir';
      else if (rawStatus.trim() !== '') isStatusValid = false;

      // Spasifikasi Alasan Error
      const errors = [];
      const warnings = [];

      if (!isDateValid) errors.push('Format tanggal tidak valid (gunakan YYYY-MM-DD)');
      if (!matchedMember) errors.push(`Nama anggota "${rawMemberName || rawNip || 'Kosong'}" tidak ditemukan di sistem`);
      if (!rawTitle) errors.push('Nama agenda tidak diisi / kosong');
      if (!rawAKD && !matchedMember?.komisi) errors.push('AKD / Komisi tidak diisi');
      if (!isStatusValid) errors.push(`Status "${rawStatus}" tidak valid (Gunakan: Hadir, Terlambat, Izin, Sakit, Dinas Luar, Alpha)`);

      // Cek duplikasi dengan log yang sudah ada
      let isDuplicate = false;
      if (matchedMember && normalizedDate && rawTitle) {
        const existingAct = activities.find(a =>
          a.date === normalizedDate &&
          a.title?.trim().toLowerCase() === rawTitle.toLowerCase()
        );
        if (existingAct) {
          const duplicateLog = logs.find(l => l.activityId === existingAct.id && l.memberId === matchedMember.id);
          if (duplicateLog) {
            isDuplicate = true;
            warnings.push('Absensi anggota dan agenda ini sudah pernah tercatat di database.');
          }
        }
      }

      const isValid = errors.length === 0;

      return {
        rowIndex: idx + 2,
        date: normalizedDate,
        title: rawTitle || 'Rapat Kegiatan DPRD',
        akd: rawAKD || (matchedMember ? matchedMember.komisi : 'Komisi I'),
        category: rawCat || 'Rapat Kerja',
        memberId: matchedMember?.id || null,
        memberName: matchedMember?.name || rawMemberName || 'Tidak Diketahui',
        memberFraksi: matchedMember?.fraksi || '-',
        nip: matchedMember?.nip || rawNip || '-',
        status: normalizedStatus,
        checkInTime: rawIn || '09:00',
        checkOutTime: rawOut || null,
        note: rawNote || 'Migrasi Data Absensi Manual Lama',
        isValid,
        isDuplicate,
        errors,
        warnings,
      };
    });

    setParsedPreview(parsed);
  };

  const handleColumnMappingChange = (key, value) => {
    const updated = { ...columnMapping, [key]: value };
    setColumnMapping(updated);
    if (rawRows.length > 0) {
      parseAndValidateRows(rawRows, fileHeaders, updated);
    }
  };

  const handleExecuteBatchImport = async () => {
    if (validRowsToImport.length === 0) {
      alert('Tidak ada data valid yang siap diimport.');
      return;
    }

    setIsImporting(true);
    const result = await batchImportLegacyAttendance(validRowsToImport, currentUser?.name || 'Petugas Sekretariat DPRD');
    setIsImporting(false);

    if (result.success) {
      setImportResult({
        success: true,
        message: `Berhasil mengimpor ${result.importedCount} data absensi manual lama dan ${result.activitiesCount} agenda kegiatan ke dalam SI-RAPORT & E-RAPORT.`
      });
      setImportFile(null);
      setParsedPreview([]);
      setRawRows([]);
    } else {
      setImportResult({
        success: false,
        message: result.message || 'Gagal melakukan import batch.'
      });
    }
  };

  // ─── Handler Edit & Koreksi Data Lama ───────────────────────────────────────
  const openEditModal = (log) => {
    const act = activities.find(a => a.id === log.activityId);
    setEditingLog({ log, activity: act });
    setEditForm({
      status: log.status || 'Hadir',
      checkInTime: log.checkInAt ? log.checkInAt.slice(11, 16) : '09:00',
      checkOutTime: log.checkOutAt ? log.checkOutAt.slice(11, 16) : '',
      note: log.note || '',
      changeReason: ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.changeReason.trim()) {
      alert('Alasan perubahan / koreksi wajib diisi untuk Audit Trail.');
      return;
    }

    setIsUpdating(true);
    const res = await updateLegacyAttendance(editingLog.log.id, {
      status: editForm.status,
      checkInTime: editForm.checkInTime,
      checkOutTime: editForm.checkOutTime || null,
      note: editForm.note,
      changeReason: editForm.changeReason
    });
    setIsUpdating(false);

    if (res.success) {
      setEditingLog(null);
    } else {
      alert(res.message || 'Gagal menyimpan perubahan.');
    }
  };

  const handleDeleteLog = async (logId) => {
    const res = await deleteLegacyAttendance(logId, deleteReason || 'Dihapus oleh admin/petugas');
    setShowDeleteConfirm(null);
    setDeleteReason('');
    if (!res.success) {
      alert(res.message || 'Gagal menghapus data.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full shadow-2xl text-slate-100 relative max-h-[94vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-amber-950/70 border border-amber-800 text-amber-400 shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wide">
                  Migrasi Data Historis
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                  Terintegrasi E-RAPORT
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">Migrasi & Input Absensi Manual Lama</h2>
              <p className="text-xs text-slate-400 hidden sm:block">
                Satukan seluruh riwayat absensi lama kertas/Excel ke dalam SI-RAPORT dan E-RAPORT Kedisiplinan per AKD.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="px-6 pt-3 pb-1 border-b border-slate-800/80 bg-slate-900/60 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'SINGLE', label: '1. Input Satu Data Manual', icon: Edit3 },
            { id: 'IMPORT', label: '2. Import Banyak (Excel / CSV)', icon: Upload },
            { id: 'LIST', label: `3. Data Manual Lama (${legacyLogs.length})`, icon: Database },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content Container ── */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: INPUT TUNGGAL ABSENSI LAMA */}
          {activeTab === 'SINGLE' && (
            <div className="max-w-3xl mx-auto space-y-5">
              
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-white">Prinsip Penyatuan Data E-RAPORT:</p>
                  <p>
                    Data yang dimasukkan akan diberi penanda <strong>"Manual Lama"</strong> namun otomatis dihitung bersama data QR dan Petugas dalam <strong>persentase kehadiran per AKD</strong> dan <strong>E-RAPORT Kedisiplinan</strong>.
                  </p>
                </div>
              </div>

              {singleFeedback.message && (
                <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border ${
                  singleFeedback.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-800 text-rose-300'
                }`}>
                  {singleFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{singleFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleSingleSubmit} className="space-y-4 text-xs">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tanggal Kegiatan */}
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Tanggal Kegiatan: <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={singleForm.date}
                      onChange={e => setSingleForm(p => ({ ...p, date: e.target.value }))}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* AKD / Kelengkapan Dewan */}
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-amber-400" />
                      Alat Kelengkapan DPRD (AKD): <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={singleForm.akd}
                      onChange={e => setSingleForm(p => ({ ...p, akd: e.target.value }))}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                    >
                      {AKD_CATEGORIES.filter(c => c !== 'ALL').map(akd => (
                        <option key={akd} value={akd}>{akd}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Nama Agenda Kegiatan */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">
                    Nama / Judul Agenda Rapat: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Rapat Kerja Komisi I Pembahasan LKPJ TA 2025"
                    value={singleForm.title}
                    onChange={e => setSingleForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Jenis Kegiatan */}
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">Jenis / Sifat Agenda:</label>
                    <select
                      value={singleForm.category}
                      onChange={e => setSingleForm(p => ({ ...p, category: e.target.value }))}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                    >
                      <option value="Rapat Kerja">Rapat Kerja</option>
                      <option value="Rapat Dengar Pendapat">Rapat Dengar Pendapat (RDP)</option>
                      <option value="Rapat Paripurna">Rapat Paripurna</option>
                      <option value="Rapat Panitia Khusus">Rapat Panitia Khusus</option>
                      <option value="FGD / Sosialisasi">FGD / Sosialisasi</option>
                      <option value="Kunjungan Kerja">Kunjungan Kerja</option>
                    </select>
                  </div>

                  {/* Pilih Anggota DPRD */}
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      Pilih Anggota DPRD: <span className="text-rose-400">*</span>
                    </label>
                    <select
                      required
                      value={singleForm.memberId}
                      onChange={e => setSingleForm(p => ({ ...p, memberId: e.target.value }))}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">— Pilih Anggota DPRD —</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.fraksi} • {m.komisi})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status Kehadiran */}
                <div>
                  <label className="block font-bold text-slate-300 mb-2">Status Kehadiran:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {ATTENDANCE_STATUS_OPTIONS.map(opt => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setSingleForm(p => ({ ...p, status: opt.value }))}
                        className={`p-2.5 rounded-xl font-bold text-xs transition border text-center ${
                          singleForm.status === opt.value
                            ? opt.color + ' shadow-md scale-[1.02]'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Waktu Check-In & Check-Out */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Waktu Check-In:
                    </label>
                    <input
                      type="time"
                      value={singleForm.checkInTime}
                      onChange={e => setSingleForm(p => ({ ...p, checkInTime: e.target.value }))}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Waktu Check-Out (Opsional):
                    </label>
                    <input
                      type="time"
                      value={singleForm.checkOutTime}
                      onChange={e => setSingleForm(p => ({ ...p, checkOutTime: e.target.value }))}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>

                {/* Keterangan */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">Keterangan / Nomor SPT / Catatan Tambahan:</label>
                  <input
                    type="text"
                    placeholder="Contoh: Berdasarkan buku presensi manual Sekretariat / SPT No..."
                    value={singleForm.note}
                    onChange={e => setSingleForm(p => ({ ...p, note: e.target.value }))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500"
                  />
                </div>

                {/* Penanda Sumber Data Badge Info */}
                <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-300">Sumber Data:</span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 inline-flex items-center gap-1.5">
                      <span>📜</span>
                      <span>Manual Lama</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Dicatat ke Audit Trail otomatis</span>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={singleLoading}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg transition"
                  >
                    {singleLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Menyimpan ke Sistem...</span></>
                    ) : (
                      <><Check className="w-4 h-4" /><span>Simpan Absensi Manual Lama</span></>
                    )}
                  </button>
                </div>

              </form>

            </div>
          )}

          {/* TAB 2: IMPORT BANYAK (EXCEL / CSV) */}
          {activeTab === 'IMPORT' && (
            <div className="space-y-5">
              
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-800 via-slate-800/80 to-slate-900 border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Migrasi Data Massal via Spreadsheet (Excel / CSV)</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Gunakan template resmi untuk mengimpor puluhan atau ratusan catatan absensi manual sebelum SI-RAPORT digunakan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplateExcel}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow shrink-0 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Template Excel (.xlsx)</span>
                </button>
              </div>

              {!importFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-slate-700 hover:border-amber-500 bg-slate-950/40 hover:bg-amber-950/10 transition cursor-pointer text-center space-y-3"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                  />
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">Klik atau Tarik File Excel / CSV ke Sini</p>
                    <p className="text-xs text-slate-400 mt-1">Mendukung format .xlsx, .xls, dan .csv</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white">{importFile.name}</h4>
                        <p className="text-[11px] text-slate-400">
                          {rawRows.length} baris data terbaca • {validRowsToImport.length} data siap diimpor
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setImportFile(null);
                        setParsedPreview([]);
                        setRawRows([]);
                      }}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold"
                    >
                      Ganti File
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Pemetaan Kolom File Excel (Smart Mapping):</span>
                      </p>
                      <span className="text-[11px] text-slate-400">Otomatis Terdeteksi</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-xs">
                      {[
                        { key: 'date', label: '1. Tanggal (YYYY-MM-DD):' },
                        { key: 'memberName', label: '2. Nama Anggota:' },
                        { key: 'title', label: '3. Agenda Kegiatan:' },
                        { key: 'akd', label: '4. AKD / Komisi:' },
                        { key: 'status', label: '5. Status Kehadiran:' },
                        { key: 'note', label: '6. Keterangan:' },
                        { key: 'checkInTime', label: '7. Jam Masuk:' },
                        { key: 'checkOutTime', label: '8. Jam Keluar:' },
                      ].map(field => (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">{field.label}</label>
                          <select
                            value={columnMapping[field.key]}
                            onChange={e => handleColumnMappingChange(field.key, e.target.value)}
                            className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs font-semibold"
                          >
                            <option value="">— Pilih Kolom —</option>
                            {fileHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-center">
                      <span className="text-slate-400 text-[11px]">Total Baris:</span>
                      <p className="text-lg font-black text-white">{parsedPreview.length}</p>
                    </div>
                    <div className="p-3 bg-emerald-950/40 rounded-2xl border border-emerald-800/60 text-center">
                      <span className="text-emerald-300 text-[11px]">Siap Diimpor:</span>
                      <p className="text-lg font-black text-emerald-400">{validRowsToImport.length}</p>
                    </div>
                    <div className="p-3 bg-amber-950/40 rounded-2xl border border-amber-800/60 text-center">
                      <span className="text-amber-300 text-[11px]">Duplikat / Terdaftar:</span>
                      <p className="text-lg font-black text-amber-400">{parsedPreview.filter(p => p.isDuplicate).length}</p>
                    </div>
                    <div className="p-3 bg-rose-950/40 rounded-2xl border border-rose-800/60 text-center">
                      <span className="text-rose-300 text-[11px]">Gagal / Error:</span>
                      <p className="text-lg font-black text-rose-400">{parsedPreview.filter(p => !p.isValid).length}</p>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                    <div className="p-3 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <span className="font-bold text-white">Preview & Hasil Validasi ({parsedPreview.length} Baris):</span>
                      <div className="flex gap-1.5">
                        {['ALL', 'VALID', 'DUPLICATE', 'ERROR'].map(f => (
                          <button
                            key={f}
                            onClick={() => setFilterPreviewStatus(f)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition ${
                              filterPreviewStatus === f
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {f === 'ALL' ? 'Semua' : f === 'VALID' ? 'Siap Import' : f === 'DUPLICATE' ? 'Duplikat' : 'Error'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto text-xs">
                      <table className="w-full text-left text-slate-300">
                        <thead className="bg-slate-800/90 text-slate-300 font-bold sticky top-0 text-[11px]">
                          <tr>
                            <th className="p-2.5 w-12 text-center">Baris</th>
                            <th className="p-2.5">Tanggal</th>
                            <th className="p-2.5">Nama Anggota</th>
                            <th className="p-2.5">Agenda & AKD</th>
                            <th className="p-2.5 text-center">Status</th>
                            <th className="p-2.5">Keterangan</th>
                            <th className="p-2.5 text-center">Status Validasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {parsedPreview
                            .filter(row => {
                              if (filterPreviewStatus === 'VALID') return row.isValid && !row.isDuplicate;
                              if (filterPreviewStatus === 'DUPLICATE') return row.isDuplicate;
                              if (filterPreviewStatus === 'ERROR') return !row.isValid;
                              return true;
                            })
                            .map((row, idx) => (
                              <tr key={idx} className={`hover:bg-slate-800/40 ${!row.isValid ? 'bg-rose-950/20' : row.isDuplicate ? 'bg-amber-950/20' : ''}`}>
                                <td className="p-2.5 text-center font-mono text-slate-500">{row.rowIndex}</td>
                                <td className="p-2.5 font-mono text-[11px] whitespace-nowrap">{row.date || '-'}</td>
                                <td className="p-2.5 font-semibold text-white whitespace-nowrap">
                                  {row.memberName}
                                  <span className="block text-[10px] text-slate-400">{row.memberFraksi}</span>
                                </td>
                                <td className="p-2.5 max-w-[200px] truncate">
                                  <span className="font-semibold text-slate-200">{row.title}</span>
                                  <span className="block text-[10px] text-amber-400 font-bold">{row.akd}</span>
                                </td>
                                <td className="p-2.5 text-center whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                                    {row.status}
                                  </span>
                                </td>
                                <td className="p-2.5 text-[11px] text-slate-400 truncate max-w-[150px]">{row.note}</td>
                                <td className="p-2.5 text-center whitespace-nowrap">
                                  {row.isValid && !row.isDuplicate ? (
                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center gap-1">
                                      <span>✅</span><span>Siap Import</span>
                                    </span>
                                  ) : row.isDuplicate ? (
                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center gap-1" title={row.warnings.join(', ')}>
                                      <span>⚠️</span><span>Duplikat</span>
                                    </span>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 inline-flex items-center gap-1">
                                        <span>❌</span><span>Error</span>
                                      </span>
                                      <span className="block text-[9.5px] text-rose-400 max-w-[140px] truncate font-medium" title={row.errors.join(' • ')}>
                                        {row.errors[0]}
                                      </span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={isImporting || validRowsToImport.length === 0}
                      onClick={handleExecuteBatchImport}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition"
                    >
                      {isImporting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /><span>Mengimpor Data Massal...</span></>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4" /><span>Konfirmasi Import ({validRowsToImport.length} Data Valid)</span></>
                      )}
                    </button>
                  </div>

                </div>
              )}

              {importResult && (
                <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 border ${
                  importResult.success
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-800 text-rose-300'
                }`}>
                  {importResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <span>{importResult.message}</span>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: DAFTAR & KOREKSI DATA MANUAL LAMA */}
          {activeTab === 'LIST' && (
            <div className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama anggota, agenda, status, atau catatan..."
                    value={listSearch}
                    onChange={e => setListSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <select
                    value={listAKDFilter}
                    onChange={e => setListAKDFilter(e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-amber-400 font-bold"
                  >
                    {AKD_CATEGORIES.map(akd => (
                      <option key={akd} value={akd}>{akd === 'ALL' ? 'Semua AKD / Paripurna' : akd}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                <div className="max-h-96 overflow-y-auto text-xs">
                  <table className="w-full text-left text-slate-300">
                    <thead className="bg-slate-800 text-slate-200 font-bold sticky top-0 text-[11px]">
                      <tr>
                        <th className="p-3">Tanggal & Waktu</th>
                        <th className="p-3">Nama Anggota</th>
                        <th className="p-3">Agenda & AKD</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Sumber</th>
                        <th className="p-3">Keterangan / Audit</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredLegacyLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                            Belum ada data absensi manual lama yang tersimpan sesuai filter.
                          </td>
                        </tr>
                      ) : (
                        filteredLegacyLogs.map(log => {
                          const act = activities.find(a => a.id === log.activityId);
                          const statusBadge = getStatusBadge(log.status);
                          const sourceBadge = getSourceBadge(log);

                          return (
                            <tr key={log.id} className="hover:bg-slate-800/40">
                              <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                                {log.checkInAt ? log.checkInAt.slice(0, 10) : act?.date || '-'}
                                <span className="block text-[10px] text-slate-400">
                                  {log.checkInAt ? log.checkInAt.slice(11, 16) : '09:00'} WIB
                                </span>
                              </td>
                              <td className="p-3 font-semibold text-white whitespace-nowrap">
                                {log.memberName}
                                <span className="block text-[10px] text-slate-400">{log.memberFraksi}</span>
                              </td>
                              <td className="p-3 max-w-[220px]">
                                <p className="font-semibold text-slate-200 truncate">{act?.title || log.activityId}</p>
                                <span className="text-[10px] text-amber-400 font-bold">{act?.akd || act?.category || log.memberKomisi || 'Komisi'}</span>
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${statusBadge.bg}`}>
                                  {statusBadge.label}
                                </span>
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${sourceBadge.badgeClass}`}>
                                  {sourceBadge.icon} {sourceBadge.label}
                                </span>
                              </td>
                              <td className="p-3 text-[11px] text-slate-400 max-w-[180px]">
                                <p className="truncate">{log.note || 'Migrasi Manual'}</p>
                                {log.lastCorrectedBy && (
                                  <span className="block text-[9px] text-cyan-400 truncate">
                                    Diedit: {log.lastCorrectedBy} ({log.lastCorrectionReason})
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditModal(log)}
                                    className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition"
                                    title="Koreksi Data Absensi"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(log)}
                                    className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition"
                                    title="Hapus Data Absensi"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Setiap penambahan & koreksi data dicatat di Jejak Audit (Audit Trail).</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* ── Modal Koreksi / Edit ── */}
      {editingLog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Koreksi Data Absensi Manual Lama</span>
              </h3>
              <button onClick={() => setEditingLog(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-xl space-y-1">
              <p className="font-bold text-white">{editingLog.log.memberName}</p>
              <p className="text-slate-400">{editingLog.activity?.title || editingLog.log.activityId}</p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Status Kehadiran:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {ATTENDANCE_STATUS_OPTIONS.map(opt => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setEditForm(p => ({ ...p, status: opt.value }))}
                      className={`p-2 rounded-lg font-bold text-xs border ${
                        editForm.status === opt.value
                          ? opt.color
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Jam Masuk:</label>
                  <input
                    type="time"
                    value={editForm.checkInTime}
                    onChange={e => setEditForm(p => ({ ...p, checkInTime: e.target.value }))}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Jam Keluar:</label>
                  <input
                    type="time"
                    value={editForm.checkOutTime}
                    onChange={e => setEditForm(p => ({ ...p, checkOutTime: e.target.value }))}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Keterangan:</label>
                <input
                  type="text"
                  value={editForm.note}
                  onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-300 mb-1">
                  Alasan Koreksi / Perubahan (Wajib Audit): <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Kesalahan input nama agenda pada arsip buku manual..."
                  value={editForm.changeReason}
                  onChange={e => setEditForm(p => ({ ...p, changeReason: e.target.value }))}
                  className="w-full p-2 bg-slate-800 border border-amber-600/50 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold rounded-xl flex items-center gap-1.5"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
                  <span>Simpan Koreksi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Hapus Confirm ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-900/50 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs text-slate-200">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-black text-sm text-white">Hapus Data Absensi Manual Lama?</h3>
            </div>

            <p className="text-slate-300">
              Data absensi <strong>{showDeleteConfirm.memberName}</strong> pada agenda <strong>{showDeleteConfirm.activityId}</strong> akan dihapus dan tercatat di jejak audit.
            </p>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Alasan Penghapusan (Opsional):</label>
              <input
                type="text"
                placeholder="Contoh: Duplikasi catatan manual..."
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteLog(showDeleteConfirm.id)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function SaveIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

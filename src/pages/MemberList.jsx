import React, { useState, useRef } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Camera,
  Upload,
  Loader2,
  Lock,
  QrCode,
  FileSpreadsheet
} from 'lucide-react';
import { compressImage } from '../utils/geoUtils';
import * as XLSX from 'xlsx';

const FRAKSI_LIST = [
  'Fraksi PDI Perjuangan',
  'Fraksi PKB',
  'Fraksi Gerindra',
  'Fraksi Golkar',
  'Fraksi PKS',
  'Fraksi NasDem',
  'Fraksi Demokrat',
  'Fraksi PAN',
];

const KOMISI_LIST = [
  'Komisi I (Hukum & Pemerintahan)',
  'Komisi II (Perekonomian & Keuangan)',
  'Komisi III (Pembangunan & Infrastruktur)',
  'Komisi IV (Kesejahteraan Rakyat & Pendidikan)',
  'Badan Kehormatan (BK)',
  'Badan Pembentukan Peraturan Daerah (Bapemperda)',
  'Badan Anggaran (Banggar)',
  'Badan Musyawarah (Banmus)',
  'Panitia Khusus (Pansus 1)',
  'Panitia Khusus (Pansus 2)',
  'Panitia Khusus (Pansus 3)',
  'Panitia Khusus (Pansus 4)',
  'Pimpinan DPRD',
];

const AKD_MEMBERSHIP_LIST = [
  'Pimpinan DPRD', 'Komisi I', 'Komisi II', 'Komisi III', 'Komisi IV',
  'Koordinator Komisi I', 'Koordinator Komisi II', 'Koordinator Komisi III', 'Koordinator Komisi IV',
  'Badan Kehormatan (BK)', 'Badan Anggaran (Banggar)', 'Badan Musyawarah (Banmus)',
  'Bapemperda', 'Fasgarwas', 'Pansus I', 'Pansus II', 'Pansus III', 'Pansus IV'
];

const EMPTY_FORM = {
  name: '',
  nip: '',
  username: '',
  password: '',
  fraksi: 'Fraksi PDI Perjuangan',
  komisi: '',
  akdMemberships: [],
  jabatan: 'Anggota DPRD',
  phone: '',
  email: '',
  photo: '',
  statusActive: true,
  termStart: '',
  termEnd: '',
};

export default function MemberList({ onNavigate }) {
  const {
    members,
    addMember,
    updateMember,
    deleteMember,
    setActiveMemberId,
    currentRole,
    isAdmin,
    isBK,
    loading,
  } = useAttendance();

  // Hanya Admin Sekretariat dan Petugas BK yang bisa tambah/edit/hapus
  const canManageMembers = isAdmin || isBK;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterFraksi, setFilterFraksi] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState('');
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, duplicates: 0, errors: 0 });
  const importInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const openAdd = () => {
    if (!canManageMembers) return;
    setEditMember(null);
    setFormData(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview('');
    setSaveMsg('');
    setIsFormOpen(true);
  };

  const openEdit = (member) => {
    if (!canManageMembers) return;
    setEditMember(member);
    setFormData({
      name: member.name || '',
      nip: member.nip || '',
      username: member.username || '',
      password: member.password || '',
      fraksi: member.fraksi || FRAKSI_LIST[0],
      komisi: member.komisi || '',
      akdMemberships: Array.isArray(member.akdMemberships) ? member.akdMemberships : [],
      jabatan: member.jabatan || 'Anggota DPRD',
      phone: member.phone || '',
      email: member.email || '',
      photo: member.photo || '',
      statusActive: member.statusActive !== false,
      termStart: member.termStart || '',
      termEnd: member.termEnd || '',
    });
    setPhotoFile(null);
    setPhotoPreview(member.photo || '');
    setSaveMsg('');
    setIsFormOpen(true);
  };

  const closeModal = () => {
    setIsFormOpen(false);
    setEditMember(null);
    setFormData(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview('');
    setSaveMsg('');
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 600, 0.85);
      setPhotoFile(compressed);
      const previewUrl = URL.createObjectURL(compressed);
      setPhotoPreview(previewUrl);
    } catch {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageMembers) return;
    if (!formData.name.trim()) {
      setSaveMsg('Nama anggota wajib diisi.');
      return;
    }
    if (!formData.fraksi.trim()) {
      setSaveMsg('Fraksi wajib diisi.');
      return;
    }
    const sanitizedFormData = {
      ...formData,
      name: formData.name.trim(),
      nip: formData.nip.trim(),
      username: formData.username?.trim() || '',
      password: formData.password?.trim() || '',
      fraksi: formData.fraksi.trim(),
      komisi: formData.komisi?.trim() || '',
      akdMemberships: (formData.akdMemberships || []).map(item => item.trim()).filter(Boolean),
      jabatan: formData.jabatan?.trim() || '',
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      photo: formData.photo?.trim() || '',
    };
    setSaveMsg('');
    setIsSaving(true);
    const result = editMember
      ? await updateMember(editMember.id, sanitizedFormData, photoFile)
      : await addMember(sanitizedFormData, photoFile);
    setIsSaving(false);
    if (result?.success) {
      setSaveMsg('success');
      setTimeout(closeModal, 1500);
    } else {
      setSaveMsg(result?.message || 'Gagal menyimpan data anggota.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!canManageMembers) return;
    if (!window.confirm(`Hapus anggota "${name}"?`)) return;
    setDeletingId(id);
    await deleteMember(id);
    setDeletingId(null);
  };

  const toggleMembership = (membership) => {
    setFormData(previous => {
      const current = previous.akdMemberships || [];
      return {
        ...previous,
        akdMemberships: current.includes(membership)
          ? current.filter(item => item !== membership)
          : [...current, membership]
      };
    });
  };

  const normalizeImportRow = (row) => {
    const value = (keys) => {
      const key = Object.keys(row).find(item => keys.includes(item.toLowerCase().replace(/[\s_-]/g, '')));
      return key ? String(row[key] ?? '').trim() : '';
    };
    const importedMemberships = value(['keanggotaanakd', 'akdanggota', 'akdmembership'])
      .split(/[,;|]/).map(item => item.trim()).filter(Boolean);
    return {
      name: value(['nama', 'namalengkap', 'namaanggota']),
      nip: value(['nip', 'nomorinduk']),
      fraksi: value(['fraksi']) || '',
      komisi: value(['komisi', 'akd']) || '',
      akdMemberships: importedMemberships.length ? importedMemberships : [],
      jabatan: value(['jabatan']) || 'Anggota DPRD',
      phone: value(['phone', 'nohp', 'nomorhp', 'whatsapp']),
      email: value(['email', 'emaildinas']),
      termStart: value(['periodemulai', 'awalperiode', 'termstart']),
      termEnd: value(['periodeakhir', 'akhirperiode', 'termend']),
      statusActive: true,
    };
  };

  const buildImportPreview = (rows = [], existingRecords = []) => {
    const sourceRows = rows.filter(row => Object.values(row || {}).some(value => String(value ?? '').trim() !== ''));

    const seenNames = new Set();
    const seenNips = new Set();
    const preview = sourceRows.map(row => {
      const normalized = normalizeImportRow(row);
      const errors = [];

      if (!normalized.name.trim()) {
        errors.push('Nama wajib diisi.');
      }

      if (!normalized.fraksi.trim()) {
        errors.push('Fraksi wajib diisi.');
      }

      if (!normalized.jabatan.trim()) {
        errors.push('Jabatan wajib diisi.');
      }

      const nameKey = normalized.name.trim().toLowerCase();
      if (nameKey) {
        const duplicateName = seenNames.has(nameKey) || existingRecords.some(item => String(item.name || '').trim().toLowerCase() === nameKey);
        if (duplicateName) {
          seenNames.add(nameKey);
          return {
            ...normalized,
            errors,
            status: errors.length ? 'error' : 'duplicate',
            duplicateReason: 'Nama sudah terdaftar.',
          };
        }
        seenNames.add(nameKey);
      }

      const nipKey = normalized.nip.trim().toLowerCase();
      if (nipKey) {
        const duplicateNip = seenNips.has(nipKey) || existingRecords.some(item => String(item.nip || '').trim().toLowerCase() === nipKey);
        if (duplicateNip) {
          seenNips.add(nipKey);
          return {
            ...normalized,
            errors,
            status: errors.length ? 'error' : 'duplicate',
            duplicateReason: 'NIP sudah terdaftar.',
          };
        }
        seenNips.add(nipKey);
      }

      return {
        ...normalized,
        errors,
        status: errors.length ? 'error' : 'valid',
      };
    });

    const valid = preview.filter(row => row.status === 'valid').length;
    const duplicates = preview.filter(row => row.status === 'duplicate').length;
    const errors = preview.filter(row => row.status === 'error').length;

    return {
      preview,
      stats: {
        total: preview.length,
        valid,
        duplicates,
        errors,
      },
    };
  };

  const downloadMemberTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Nama', 'NIP', 'Fraksi', 'Komisi / AKD', 'Jabatan', 'No. HP / WhatsApp', 'Email', 'Status'],
      ['Ahmad', '123456', 'Fraksi PDI Perjuangan', 'Komisi I (Hukum & Pemerintahan)', 'Anggota DPRD', '0812xxxx', 'ahmad@dprd.go.id', 'Aktif'],
      ['Budi', '123457', 'Fraksi Gerindra', 'Komisi II (Perekonomian & Keuangan)', 'Anggota DPRD', '0813xxxx', 'budi@dprd.go.id', 'Aktif'],
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Anggota DPRD');
    XLSX.writeFile(workbook, 'template-anggotadprd.xlsx');
  };

  const getValidImportRows = (rows = []) => rows.filter(row => {
    if (row.status === 'valid') return true;
    if (row.status === 'duplicate' || row.status === 'error') return false;
    return Array.isArray(row.errors) ? row.errors.length === 0 : true;
  });

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const lines = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          content.items.forEach(item => { if (item.str?.trim()) lines.push(item.str.trim()); });
        }
        if (lines.length === 0) {
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('ind');
          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            const result = await worker.recognize(canvas.toDataURL('image/png'));
            result.data.text.split(/\r?\n/).forEach(line => { if (line.trim()) lines.push(line.trim()); });
          }
          await worker.terminate();
        }
        const rows = lines
          .filter(line => line.length > 3 && !/^(daftar|anggota|nip|fraksi|komisi|jabatan|no\.?$)/i.test(line))
          .map(line => ({ Nama: line }));

        const preview = buildImportPreview(rows, members);
        setImportRows(preview.preview);
        setImportStats(preview.stats);
        setIsImportOpen(true);
      } catch {
        setSaveMsg('PDF tidak dapat diekstrak. Pastikan PDF berisi teks, bukan hasil scan gambar.');
      }
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = loadEvent => {
      try {
        const workbook = XLSX.read(loadEvent.target.result, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const preview = buildImportPreview(rows, members);
        setImportRows(preview.preview);
        setImportStats(preview.stats);
        setIsImportOpen(true);
      } catch {
        setSaveMsg('File tidak dapat dibaca. Gunakan Excel atau CSV dengan kolom Nama, Fraksi, Komisi, Jabatan.');
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const handleImportSave = async () => {
    setIsImporting(true);

    const validRows = getValidImportRows(importRows);

    if (validRows.length === 0) {
      setImportFeedback('Tidak ada data valid untuk disimpan. Periksa kembali preview import Anda.');
      setIsImporting(false);
      return;
    }

    let firstError = null;

    for (const row of validRows) {
      const result = await addMember(row);
      if (!result?.success) {
        firstError = result?.message || `Gagal menyimpan ${row.name || 'data anggota'}.`;
        break;
      }
    }

    setIsImporting(false);

    if (firstError) {
      setImportFeedback(firstError);
      return;
    }

    setImportRows([]);
    setImportStats({ total: 0, valid: 0, duplicates: 0, errors: 0 });
    setIsImportOpen(false);
    setImportFeedback(`Berhasil mengimport ${validRows.length} data anggota.`);
  };

  const updateImportRow = (index, field, value) => {
    setImportRows(previous => {
      const updatedRows = previous.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row);
      const refreshedPreview = buildImportPreview(updatedRows, members);
      setImportStats(refreshedPreview.stats);
      return refreshedPreview.preview;
    });
  };

  // Navigasi ke Halaman Kartu Anggota
  const handleViewCard = (memberId) => {
    setActiveMemberId(memberId);
    if (onNavigate) {
      onNavigate('member_qr');
    }
  };

  const normalizeText = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const fraksiOptions = Array.from(new Set([
    ...FRAKSI_LIST,
    ...members
      .map(member => member.fraksi)
      .filter(Boolean)
      .map(value => String(value).trim())
  ])).sort((a, b) => a.localeCompare(b));

  const filtered = members.filter(m => {
    const q = normalizeText(searchQuery);
    const memberName = normalizeText(m.name);
    const memberFraksi = normalizeText(m.fraksi);
    const memberNip = normalizeText(m.nip);

    const matchSearch = !q
      || memberName.includes(q)
      || memberFraksi.includes(q)
      || memberNip.includes(q);

    const normalizedFilter = normalizeText(filterFraksi);
    const normalizedFilterNoPrefix = normalizedFilter.replace(/^fraksi\s+/, '');
    const memberFraksiNoPrefix = memberFraksi.replace(/^fraksi\s+/, '');

    const matchFraksi = filterFraksi === 'ALL'
      || memberFraksi === normalizedFilter
      || memberFraksiNoPrefix === normalizedFilterNoPrefix
      || memberFraksi.includes(normalizedFilter)
      || memberFraksiNoPrefix.includes(normalizedFilterNoPrefix);

    return matchSearch && matchFraksi;
  });

  const roleLabel = {
    SECRETARIAT_ADMIN: 'Admin Sekretariat',
    PETUGAS_BK: 'Badan Kehormatan (BK)',
    PETUGAS_SCAN: 'Operator Scan',
    ANGGOTA_DPRD: 'Anggota DPRD',
  }[currentRole] || currentRole;

  return (
    <div className="space-y-5">

      {/* Header */}
      {importFeedback && (
        <div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950 text-emerald-300 text-xs font-semibold">
          {importFeedback}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Master Data Anggota DPRD</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {canManageMembers
              ? 'Kelola profil, foto, fraksi, komisi, dan cetak Kartu ID Anggota.'
              : <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><Lock className="w-3 h-3" />Mode {roleLabel} — hanya dapat melihat data anggota</span>
            }
          </p>
        </div>
        {canManageMembers && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <button onClick={downloadMemberTemplate}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow">
              <FileSpreadsheet className="w-4 h-4" /> Download Template Excel
            </button>
            <button onClick={() => importInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow">
              <FileSpreadsheet className="w-4 h-4" /> Import Excel/CSV/PDF
            </button>
            <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv,.tsv,.pdf" onChange={handleImportFile} className="hidden" />
            <button onClick={openAdd}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow">
              <Plus className="w-4 h-4" /> Tambah Anggota DPRD
            </button>
          </div>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input type="text" placeholder="Cari nama anggota atau fraksi..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500" />
        </div>
        <select value={filterFraksi} onChange={e => setFilterFraksi(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500">
          <option value="ALL">Semua Fraksi ({members.length})</option>
          {fraksiOptions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="ml-3 text-slate-400 text-sm">Memuat dari Firestore...</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-semibold">
            {searchQuery || filterFraksi !== 'ALL' ? 'Tidak ada anggota yang sesuai' : 'Belum ada data anggota'}
          </p>
          {canManageMembers && !(searchQuery || filterFraksi !== 'ALL') && (
            <button onClick={openAdd} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs">
              + Tambah Anggota Sekarang
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(m => (
          <div key={m.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="p-4 flex items-start gap-3">
              <div className="shrink-0">
                {m.photo
                  ? <img src={m.photo} alt={m.name} className="w-16 h-20 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm" />
                  : <div className="w-16 h-20 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 flex items-center justify-center text-2xl font-black text-white">{m.name?.charAt(0)}</div>
                }
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-tight">{m.name}</h4>
                <p className="text-[10px] text-slate-400 font-mono">NIP: {m.nip || '—'}</p>
                <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-[10px]">{m.fraksi}</span>
                <p className="text-[10px] text-slate-500">{m.jabatan}</p>
                <p className="text-[10px] text-slate-400">{(m.akdMemberships || [m.komisi]).join(' • ')}</p>
              </div>
            </div>
            <div className="px-4 pb-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                onClick={() => handleViewCard(m.id)}
                className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Buka / Cetak Kartu</span>
              </button>
              {/* Edit/Hapus hanya untuk Admin & BK */}
              {canManageMembers && (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(m)}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-950/40 rounded-lg transition" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(m.id, m.name)}
                    disabled={deletingId === m.id}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition disabled:opacity-50" title="Hapus">
                    {deletingId === m.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tambah / Edit */}
      {isFormOpen && canManageMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl text-white max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <div>
                <h3 className="font-bold text-base">{editMember ? 'Edit Data Anggota' : 'Tambah Anggota DPRD Baru'}</h3>
                <p className="text-xs text-slate-400">Disimpan ke Cloud Firestore — foto dikompres otomatis</p>
              </div>
              <button onClick={closeModal} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">

              {/* Foto */}
              <div>
                <label className="block text-slate-400 mb-2 font-semibold">Foto Anggota:</label>
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-20 h-24 rounded-xl border-2 border-dashed border-slate-700 overflow-hidden flex items-center justify-center bg-slate-800">
                    {photoPreview
                      ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                      : <div className="text-center p-2"><Camera className="w-6 h-6 text-slate-600 mx-auto" /></div>
                    }
                  </div>
                  <div className="flex-1 space-y-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-600 rounded-xl font-semibold flex items-center justify-center gap-2 transition">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>{photoFile ? photoFile.name.substring(0, 22) + '...' : 'Pilih Foto dari Komputer'}</span>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    <p className="text-slate-500 text-[10px]">Foto dikompres otomatis (JPEG) — tidak butuh Firebase Storage.</p>
                    <input type="url" value={formData.photo}
                      onChange={e => { setFormData(p => ({ ...p, photo: e.target.value })); setPhotoPreview(e.target.value); }}
                      placeholder="Atau masukkan URL foto..."
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg placeholder-slate-600" />
                  </div>
                </div>
              </div>

              {/* Nama & NIP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nama Lengkap & Gelar *</label>
                  <input type="text" required value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Contoh: H. Ahmad Fauzi, S.H."
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">NIP / Nomor Induk</label>
                  <input type="text" value={formData.nip}
                    onChange={e => setFormData(p => ({ ...p, nip: e.target.value }))}
                    placeholder="Contoh: 19750821 200501 2 004"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Username Login</label>
                  <input type="text" value={formData.username}
                    onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                    placeholder="Contoh: ahmad.fauzi"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Password Login</label>
                  <input type="password" value={formData.password}
                    onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                    placeholder="Masukkan password akun"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white" />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Keanggotaan AKD (dapat lebih dari satu)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-3 bg-slate-800 rounded-xl border border-slate-700">
                  {AKD_MEMBERSHIP_LIST.map(membership => {
                    const selected = formData.akdMemberships?.includes(membership);
                    return <label key={membership} className={`flex items-center gap-1.5 p-1.5 rounded-lg text-[10px] cursor-pointer ${selected ? 'bg-emerald-600/20 text-emerald-300' : 'text-slate-400'}`}><input type="checkbox" checked={selected} onChange={() => toggleMembership(membership)} className="accent-emerald-500" />{membership}</label>;
                  })}
                </div>
              </div>

              {/* Fraksi & Komisi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Fraksi</label>
                  <select value={formData.fraksi}
                    onChange={e => setFormData(p => ({ ...p, fraksi: e.target.value }))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white">
                    {FRAKSI_LIST.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Komisi / AKD (opsional)</label>
                  <select value={formData.komisi}
                    onChange={e => setFormData(p => ({ ...p, komisi: e.target.value }))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white">
                    <option value="">Belum ditentukan / kosong</option>
                    {KOMISI_LIST.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>

              {/* Jabatan */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Jabatan Kedewanan</label>
                <input type="text" value={formData.jabatan}
                  onChange={e => setFormData(p => ({ ...p, jabatan: e.target.value }))}
                  placeholder="Contoh: Anggota Komisi I / Wakil Ketua BK"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2"><label className="block text-slate-400 mb-1 font-semibold">Periode Jabatan</label><div className="grid grid-cols-2 gap-2"><input type="date" value={formData.termStart} onChange={e => setFormData(p => ({ ...p, termStart: e.target.value }))} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white" /><input type="date" value={formData.termEnd} onChange={e => setFormData(p => ({ ...p, termEnd: e.target.value }))} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white" /></div></div>
                <label className="flex items-center gap-2 self-end p-2.5 text-slate-300 font-semibold"><input type="checkbox" checked={formData.statusActive !== false} onChange={e => setFormData(p => ({ ...p, statusActive: e.target.checked }))} className="accent-emerald-500" /> Anggota aktif</label>
              </div>

              {/* Kontak */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">No. HP / WhatsApp</label>
                  <input type="tel" value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Email Dinas</label>
                  <input type="email" value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="nama@dprd.cirebonkab.go.id"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white" />
                </div>
              </div>

              {saveMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${saveMsg === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                  {saveMsg === 'success' ? '✓ Data anggota berhasil disimpan!' : saveMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition">
                  Batal
                </button>
                <button type="submit" disabled={isSaving}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Simpan Data'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {isImportOpen && canManageMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl text-white max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="font-bold">Preview Import Data Anggota</h3>
                <p className="text-xs text-slate-400">Periksa data sebelum disimpan ke database.</p>
              </div>
              <button onClick={() => setIsImportOpen(false)} className="p-2 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/60">
              <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
                <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-300">Total Data: {importStats.total}</span>
                <span className="px-2 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">Valid: {importStats.valid}</span>
                <span className="px-2 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800">Duplikat: {importStats.duplicates}</span>
                <span className="px-2 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800">Error: {importStats.errors}</span>
              </div>
            </div>
            <div className="p-5 overflow-auto max-h-[60vh]">
              <table className="w-full text-xs"><thead><tr className="text-left text-slate-400 border-b border-slate-700"><th className="p-2">Nama</th><th className="p-2">Fraksi</th><th className="p-2">Komisi / AKD</th><th className="p-2">Jabatan</th><th className="p-2">Kontak</th><th className="p-2">Status</th></tr></thead><tbody>{importRows.map((row, index) => <tr key={`${row.name}-${index}`} className={`border-b border-slate-800 ${row.status === 'error' ? 'bg-rose-950/20' : row.status === 'duplicate' ? 'bg-amber-950/20' : 'bg-emerald-950/10'}`}><td className="p-2"><input value={row.name} onChange={event => updateImportRow(index, 'name', event.target.value)} className="w-40 p-1.5 bg-slate-800 border border-slate-700 rounded" /></td><td className="p-2"><input value={row.fraksi} onChange={event => updateImportRow(index, 'fraksi', event.target.value)} className="w-40 p-1.5 bg-slate-800 border border-slate-700 rounded" /></td><td className="p-2"><input value={row.komisi} onChange={event => updateImportRow(index, 'komisi', event.target.value)} className="w-44 p-1.5 bg-slate-800 border border-slate-700 rounded" /></td><td className="p-2"><input value={row.jabatan} onChange={event => updateImportRow(index, 'jabatan', event.target.value)} className="w-36 p-1.5 bg-slate-800 border border-slate-700 rounded" /></td><td className="p-2 text-slate-400">{row.phone || row.email || '-'}</td><td className="p-2 text-[10px]">{row.status === 'error' ? <span className="text-rose-300 font-bold">{row.errors[0]}</span> : row.status === 'duplicate' ? <span className="text-amber-300 font-bold">Duplikat</span> : <span className="text-emerald-300 font-bold">Valid</span>}</td></tr>)}</tbody></table>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-between items-center"><span className="text-xs text-slate-400">{importStats.valid} baris valid siap diimport</span><div className="flex gap-2"><button onClick={() => setIsImportOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold">Batal</button><button onClick={handleImportSave} disabled={isImporting || getValidImportRows(importRows).length === 0} className="px-4 py-2 rounded-xl bg-emerald-600 text-xs font-bold disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed">{isImporting ? 'Menyimpan...' : 'Simpan Semua'}</button></div></div>
          </div>
        </div>
      )}

    </div>
  );
}

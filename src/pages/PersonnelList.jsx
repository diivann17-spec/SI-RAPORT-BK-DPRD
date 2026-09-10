import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
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
  ShieldCheck,
  Building2
} from 'lucide-react';
import { compressImage } from '../utils/geoUtils';

const EMPTY_FORM = {
  name: '',
  nip: '',
  jabatan: '',
  pangkat: '',
  unit: '',
  phone: '',
  email: '',
  photo: '',
  statusActive: true,
};

const UNIT_LIST = [
  'Sekretariat DPRD',
  'Bagian Umum',
  'Bagian Humas & Protokol',
  'Bagian Keuangan',
  'Bagian Program & Penganggaran',
  'Bagian Perlengkapan',
  'Bagian Persidangan',
  'Bagian Administrasi Fraksi',
  'Bagian Kepegawaian',
  'Bagian Tata Usaha',
];

export default function PersonnelList() {
  const {
    personnel,
    addPersonnel,
    updatePersonnel,
    deletePersonnel,
    currentRole,
    isAdmin,
    isBK,
    loading,
  } = useAttendance();

  const canManagePersonnel = isAdmin || isBK;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnit, setFilterUnit] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, duplicates: 0, errors: 0 });
  const fileInputRef = useRef(null);
  const importInputRef = useRef(null);

  const openAdd = () => {
    if (!canManagePersonnel) return;
    setEditItem(null);
    setFormData(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview('');
    setSaveMsg('');
    setIsFormOpen(true);
  };

  const openEdit = (item) => {
    if (!canManagePersonnel) return;
    setEditItem(item);
    setFormData({
      name: item.name || '',
      nip: item.nip || '',
      jabatan: item.jabatan || '',
      pangkat: item.pangkat || '',
      unit: item.unit || UNIT_LIST[0],
      phone: item.phone || '',
      email: item.email || '',
      photo: item.photo || '',
      statusActive: item.statusActive !== false,
    });
    setPhotoFile(null);
    setPhotoPreview(item.photo || '');
    setSaveMsg('');
    setIsFormOpen(true);
  };

  const closeModal = () => {
    setIsFormOpen(false);
    setEditItem(null);
    setFormData(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview('');
    setSaveMsg('');
  };

  const buildImportPreview = (rows = [], existingRecords = []) => {
    const sourceRows = rows.filter(row => Object.values(row || {}).some(value => String(value ?? '').trim() !== ''));
    const seenNames = new Set();
    const seenNips = new Set();

    const preview = sourceRows.map(row => {
      const normalized = {
        name: String(row.Nama || row.nama || row.name || '').trim(),
        nip: String(row.NIP || row.nip || row['Nomor Induk'] || '').trim(),
        jabatan: String(row.Jabatan || row.jabatan || row['Jabatan/Posisi'] || '').trim(),
        pangkat: String(row['Pangkat/Golongan'] || row.pangkat || row['Golongan'] || '').trim(),
        unit: String(row['Bagian/Unit Kerja'] || row.Unit || row.unit || '').trim(),
        phone: String(row['No. HP / WhatsApp'] || row.phone || row['Nomor Kontak'] || '').trim(),
        email: String(row.Email || row.email || '').trim(),
        statusActive: String(row.Status || row.status || 'Aktif').toLowerCase() !== 'nonaktif',
      };

      const errors = [];
      if (!normalized.name) errors.push('Nama wajib diisi.');
      if (!normalized.jabatan) errors.push('Jabatan wajib diisi.');
      if (!normalized.unit) errors.push('Unit kerja wajib diisi.');

      const nameKey = normalized.name.toLowerCase();
      if (nameKey) {
        const duplicateName = seenNames.has(nameKey) || existingRecords.some(item => String(item.name || '').trim().toLowerCase() === nameKey);
        if (duplicateName) errors.push('Nama sudah terdaftar.');
        seenNames.add(nameKey);
      }

      const nipKey = normalized.nip.toLowerCase();
      if (nipKey) {
        const duplicateNip = seenNips.has(nipKey) || existingRecords.some(item => String(item.nip || '').trim().toLowerCase() === nipKey);
        if (duplicateNip) errors.push('NIP sudah terdaftar.');
        seenNips.add(nipKey);
      }

      return { ...normalized, errors };
    });

    const valid = preview.filter(row => row.errors.length === 0).length;
    const duplicates = preview.filter(row => row.errors.some(error => error.includes('sudah terdaftar'))).length;

    return {
      preview,
      stats: {
        total: preview.length,
        valid,
        duplicates,
        errors: preview.length - valid,
      },
    };
  };

  const downloadPersonnelTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Nama', 'NIP', 'Jabatan', 'Pangkat/Golongan', 'Bagian/Unit Kerja', 'No. HP / WhatsApp', 'Email', 'Status'],
      ['Ahmad', '123456', 'Staff Administrasi', 'Penata, III/c', 'Bagian Umum', '0812xxxx', 'ahmad@dprd.go.id', 'Aktif'],
      ['Budi', '123457', 'Staf Persidangan', 'Penata Muda, III/a', 'Bagian Persidangan', '0813xxxx', 'budi@dprd.go.id', 'Aktif'],
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Personel');
    XLSX.writeFile(workbook, 'template-personel-sekretariat.xlsx');
  };

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

        const rows = lines
          .filter(line => line.length > 3)
          .map(line => ({ Nama: line }));

        const preview = buildImportPreview(rows, personnel);
        setImportRows(preview.preview);
        setImportStats(preview.stats);
        setIsImportOpen(true);
      } catch {
        setSaveMsg('PDF tidak dapat diekstrak. Pastikan PDF berisi data yang dapat terbaca.');
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
        const preview = buildImportPreview(rows, personnel);
        setImportRows(preview.preview);
        setImportStats(preview.stats);
        setIsImportOpen(true);
      } catch {
        setSaveMsg('File tidak dapat dibaca. Gunakan Excel atau CSV dengan kolom Nama, NIP, Jabatan, Pangkat/Golongan, Bagian/Unit Kerja.');
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const handleImportSave = async () => {
    setIsImporting(true);
    const refreshedPreview = buildImportPreview(importRows, personnel);
    const validRows = refreshedPreview.preview.filter(row => row.errors.length === 0);

    if (validRows.length === 0) {
      setImportStats(refreshedPreview.stats);
      setSaveMsg('Tidak ada data valid untuk disimpan. Periksa kembali preview import Anda.');
      setIsImporting(false);
      return;
    }

    let firstError = null;

    for (const row of validRows) {
      const result = await addPersonnel(row);
      if (!result?.success) {
        firstError = result?.message || `Gagal menyimpan ${row.name || 'data personel'}.`;
        break;
      }
    }

    setIsImporting(false);

    if (firstError) {
      setImportStats(refreshedPreview.stats);
      setSaveMsg(firstError);
      return;
    }

    setImportRows([]);
    setImportStats({ total: 0, valid: 0, duplicates: 0, errors: 0 });
    setIsImportOpen(false);
    setSaveMsg('');
  };


  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 600, 0.85);
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManagePersonnel) return;
    if (!formData.name.trim()) {
      setSaveMsg('Nama personel wajib diisi.');
      return;
    }

    setSaveMsg('');
    setIsSaving(true);
    const result = editItem
      ? await updatePersonnel(editItem.id, formData, photoFile)
      : await addPersonnel(formData, photoFile);
    setIsSaving(false);

    if (result?.success) {
      setSaveMsg('success');
      setTimeout(closeModal, 1200);
    } else {
      setSaveMsg(result?.message || 'Gagal menyimpan data personel.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!canManagePersonnel) return;
    if (!window.confirm(`Hapus personel "${name}"?`)) return;
    setDeletingId(id);
    await deletePersonnel(id);
    setDeletingId(null);
  };

  const filtered = personnel.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchSearch = !query || [item.name, item.nip, item.jabatan, item.unit, item.pangkat].some(value => String(value || '').toLowerCase().includes(query));
    const matchUnit = filterUnit === 'ALL' || item.unit === filterUnit;
    return matchSearch && matchUnit;
  });

  const uniqueUnits = Array.from(new Set(personnel.map(item => item.unit).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const roleLabel = {
    SECRETARIAT_ADMIN: 'Admin Sekretariat',
    PETUGAS_BK: 'Badan Kehormatan (BK)',
    PETUGAS_SCAN: 'Operator Scan',
    ANGGOTA_DPRD: 'Anggota DPRD',
  }[currentRole] || currentRole;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Master Data Personel Sekretariat DPRD</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {canManagePersonnel
              ? 'Kelola data pegawai sekretariat, unit kerja, jabatan, pangkat, serta foto profil.'
              : <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><Lock className="w-3 h-3" />Mode {roleLabel} — hanya dapat melihat data personel</span>
            }
          </p>
        </div>
        {canManagePersonnel && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <button onClick={downloadPersonnelTemplate}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow">
              <ShieldCheck className="w-4 h-4" /> Download Template Excel
            </button>
            <button onClick={() => importInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow">
              <Building2 className="w-4 h-4" /> Import Excel/CSV/PDF
            </button>
            <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv,.tsv,.pdf" onChange={handleImportFile} className="hidden" />
            <button onClick={openAdd}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow">
              <Plus className="w-4 h-4" /> Tambah Personel
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama, NIP, jabatan, unit kerja..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={filterUnit}
          onChange={e => setFilterUnit(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="ALL">Semua Unit ({personnel.length})</option>
          {uniqueUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="ml-3 text-slate-400 text-sm">Memuat data personel...</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-semibold">
            {searchQuery || filterUnit !== 'ALL' ? 'Tidak ada personel yang sesuai' : 'Belum ada data personel sekretariat'}
          </p>
          {canManagePersonnel && !(searchQuery || filterUnit !== 'ALL') && (
            <button onClick={openAdd} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs">
              + Tambah Personel Sekarang
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="p-4 flex items-start gap-3">
              <div className="shrink-0">
                {item.photo
                  ? <img src={item.photo} alt={item.name} className="w-16 h-20 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm" />
                  : <div className="w-16 h-20 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-800 flex items-center justify-center text-2xl font-black text-white">{item.name?.charAt(0)}</div>
                }
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-tight">{item.name}</h4>
                <p className="text-[10px] text-slate-400 font-mono">NIP: {item.nip || '—'}</p>
                <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">{item.unit || 'Unit belum diatur'}</span>
                <p className="text-[10px] text-slate-500">{item.jabatan || '—'}</p>
                <p className="text-[10px] text-slate-400">{item.pangkat || '—'}</p>
              </div>
            </div>

            <div className="px-4 pb-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="text-[10px] text-slate-400">
                {item.statusActive === false ? 'Nonaktif' : 'Aktif'}
              </div>
              {canManagePersonnel && (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-950/40 rounded-lg transition" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item.id, item.name)} disabled={deletingId === item.id} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition disabled:opacity-50" title="Hapus">
                    {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isImportOpen && canManagePersonnel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl text-white max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="font-bold">Preview Import Data Personel</h3>
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
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-700">
                    <th className="p-2">Nama</th>
                    <th className="p-2">NIP</th>
                    <th className="p-2">Jabatan</th>
                    <th className="p-2">Unit</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row, index) => (
                    <tr key={`${row.name}-${index}`} className={`border-b border-slate-800 ${row.errors.length ? 'bg-rose-950/20' : 'bg-emerald-950/10'}`}>
                      <td className="p-2"><input value={row.name} onChange={event => setImportRows(previous => previous.map((item, idx) => idx === index ? { ...item, name: event.target.value } : item))} className="w-40 p-1.5 bg-slate-800 border border-slate-700 rounded" /></td>
                      <td className="p-2"><input value={row.nip} onChange={event => setImportRows(previous => previous.map((item, idx) => idx === index ? { ...item, nip: event.target.value } : item))} className="w-36 p-1.5 bg-slate-800 border border-slate-700 rounded" /></td>
                      <td className="p-2"><input value={row.jabatan} onChange={event => setImportRows(previous => previous.map((item, idx) => idx === index ? { ...item, jabatan: event.target.value } : item))} className="w-36 p-1.5 bg-slate-800 border border-slate-700 rounded" /></td>
                      <td className="p-2"><input value={row.unit} onChange={event => setImportRows(previous => previous.map((item, idx) => idx === index ? { ...item, unit: event.target.value } : item))} className="w-40 p-1.5 bg-slate-800 border border-slate-700 rounded" /></td>
                      <td className="p-2 text-[10px]">{row.errors.length ? <span className="text-rose-300 font-bold">{row.errors[0]}</span> : <span className="text-emerald-300 font-bold">Valid</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-5 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400">{importRows.length} baris siap dipreview</span>
              <div className="flex gap-2">
                <button onClick={() => setIsImportOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold">Batal</button>
                <button onClick={handleImportSave} disabled={isImporting} className="px-4 py-2 rounded-xl bg-emerald-600 text-xs font-bold">{isImporting ? 'Menyimpan...' : 'Simpan Semua'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && canManagePersonnel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl text-white max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <div>
                <h3 className="font-bold text-base">{editItem ? 'Edit Data Personel' : 'Tambah Personel Sekretariat Baru'}</h3>
                <p className="text-xs text-slate-400">Data terpisah dari Anggota DPRD dan disimpan secara lokal/Firestore</p>
              </div>
              <button onClick={closeModal} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-2 font-semibold">Foto Profil:</label>
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-20 h-24 rounded-xl border-2 border-dashed border-slate-700 overflow-hidden flex items-center justify-center bg-slate-800">
                    {photoPreview
                      ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                      : <div className="text-center p-2"><Camera className="w-6 h-6 text-slate-600 mx-auto" /></div>
                    }
                  </div>
                  <div className="flex-1 space-y-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-600 rounded-xl font-semibold flex items-center justify-center gap-2 transition">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>{photoFile ? photoFile.name.substring(0, 22) + '...' : 'Pilih Foto dari Komputer'}</span>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    <input
                      type="url"
                      value={formData.photo}
                      onChange={e => { setFormData(p => ({ ...p, photo: e.target.value })); setPhotoPreview(e.target.value); }}
                      placeholder="Atau masukkan URL foto..."
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg placeholder-slate-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nama Lengkap *</label>
                  <input type="text" required value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Contoh: Rina Rahmawati, S.IP"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">NIP</label>
                  <input type="text" value={formData.nip}
                    onChange={e => setFormData(p => ({ ...p, nip: e.target.value }))}
                    placeholder="Contoh: 19750821 200501 2 004"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Jabatan</label>
                  <input type="text" value={formData.jabatan}
                    onChange={e => setFormData(p => ({ ...p, jabatan: e.target.value }))}
                    placeholder="Contoh: Staff Ahli Administrasi"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Pangkat / Golongan</label>
                  <input type="text" value={formData.pangkat}
                    onChange={e => setFormData(p => ({ ...p, pangkat: e.target.value }))}
                    placeholder="Contoh: Penata, III/c"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Bagian / Unit Kerja</label>
                <select value={formData.unit}
                  onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                >
                  {UNIT_LIST.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nomor Kontak</label>
                  <input type="tel" value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Email</label>
                  <input type="email" value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="nama@dprd.cirebonkab.go.id"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 p-2.5 text-slate-300 font-semibold bg-slate-800 border border-slate-700 rounded-xl">
                <input type="checkbox" checked={formData.statusActive !== false} onChange={e => setFormData(p => ({ ...p, statusActive: e.target.checked }))} className="accent-emerald-500" />
                Personel aktif
              </label>

              {saveMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${saveMsg === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                  {saveMsg === 'success' ? '✓ Data personel berhasil disimpan!' : saveMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition">
                  Batal
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

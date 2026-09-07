import React, { useState, useRef } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  Users, Plus, Search, QrCode, Edit2, Trash2, X,
  Loader2, CheckCircle, AlertCircle, Camera, Upload, Lock
} from 'lucide-react';

const EMPTY_FORM = {
  name: '', nip: '',
  fraksi: 'Fraksi Golkar',
  komisi: 'Komisi I (Hukum & Pemerintahan)',
  jabatan: 'Anggota DPRD',
  phone: '', email: '', photo: '',
};

const FRAKSI_LIST = [
  'Fraksi Golkar','Fraksi PDI Perjuangan','Fraksi Gerindra',
  'Fraksi PKB','Fraksi PKS','Fraksi Demokrat','Fraksi NasDem',
  'Fraksi PPP','Fraksi Hanura','Fraksi PAN',
];
const KOMISI_LIST = [
  'Komisi I (Hukum & Pemerintahan)',
  'Komisi II (Pembangunan & Infrastruktur)',
  'Komisi III (Keuangan & Asset)',
  'Komisi IV (Kesejahteraan Rakyat)',
];
const JABATAN_LIST = [
  'Ketua DPRD','Wakil Ketua DPRD','Ketua Komisi',
  'Wakil Ketua Komisi','Sekretaris Komisi','Anggota DPRD',
];

export default function MemberList() {
  const {
    members, addMember, updateMember, deleteMember,
    setActiveMemberId, loading,
    canManageMembers, currentRole,
  } = useAttendance();

  const [searchQuery,  setSearchQuery]  = useState('');
  const [filterFraksi, setFilterFraksi] = useState('ALL');
  const [isFormOpen,   setIsFormOpen]   = useState(false);
  const [editMember,   setEditMember]   = useState(null);
  const [formData,     setFormData]     = useState(EMPTY_FORM);
  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSaving,     setIsSaving]     = useState(false);
  const [deletingId,   setDeletingId]   = useState(null);
  const [saveMsg,      setSaveMsg]      = useState('');
  const fileInputRef = useRef(null);

  const openAdd = () => {
    if (!canManageMembers) return;
    setFormData(EMPTY_FORM); setEditMember(null);
    setPhotoFile(null); setPhotoPreview(''); setSaveMsg('');
    setIsFormOpen(true);
  };
  const openEdit = (m) => {
    if (!canManageMembers) return;
    setFormData({ ...m }); setEditMember(m);
    setPhotoFile(null); setPhotoPreview(m.photo || ''); setSaveMsg('');
    setIsFormOpen(true);
  };
  const closeModal = () => {
    setIsFormOpen(false); setEditMember(null);
    setPhotoFile(null); setPhotoPreview(''); setSaveMsg('');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Ukuran foto max 10MB'); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result || '');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveMsg(''); setIsSaving(true);
    const result = editMember
      ? await updateMember(editMember.id, formData, photoFile)
      : await addMember(formData, photoFile);
    setIsSaving(false);
    if (result?.success) {
      setSaveMsg('success');
      setTimeout(closeModal, 1500);
    } else {
      setSaveMsg(result?.message || 'Gagal menyimpan. Periksa Firestore Rules di Firebase Console.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!canManageMembers) return;
    if (!window.confirm(`Hapus anggota "${name}"?`)) return;
    setDeletingId(id);
    await deleteMember(id);
    setDeletingId(null);
  };

  const filtered = members.filter(m => {
    const q = searchQuery.toLowerCase();
    const matchSearch = m.name?.toLowerCase().includes(q)
      || m.fraksi?.toLowerCase().includes(q)
      || m.nip?.includes(q);
    const matchFraksi = filterFraksi === 'ALL' || m.fraksi === filterFraksi;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Master Data Anggota DPRD</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {canManageMembers
              ? 'Kelola profil, foto, fraksi, komisi, dan QR Code anggota.'
              : <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><Lock className="w-3 h-3" />Mode {roleLabel} — hanya dapat melihat data anggota</span>
            }
          </p>
        </div>
        {canManageMembers && (
          <button onClick={openAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow shrink-0">
            <Plus className="w-4 h-4" /> Tambah Anggota DPRD
          </button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input type="text" placeholder="Cari nama, fraksi, NIP..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500" />
        </div>
        <select value={filterFraksi} onChange={e => setFilterFraksi(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500">
          <option value="ALL">Semua Fraksi ({members.length})</option>
          {FRAKSI_LIST.map(f => <option key={f} value={f}>{f}</option>)}
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
          <div key={m.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="shrink-0">
                {m.photo
                  ? <img src={m.photo} alt={m.name} className="w-16 h-20 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700" />
                  : <div className="w-16 h-20 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-2xl font-black text-white">{m.name?.charAt(0)}</div>
                }
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-tight">{m.name}</h4>
                <p className="text-[10px] text-slate-400 font-mono">NIP: {m.nip || '—'}</p>
                <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-[10px]">{m.fraksi}</span>
                <p className="text-[10px] text-slate-500">{m.jabatan}</p>
                <p className="text-[10px] text-slate-400">{m.komisi?.replace(/\(.*?\)/, '').trim()}</p>
              </div>
            </div>
            <div className="px-4 pb-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <button onClick={() => setActiveMemberId(m.id)}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline">
                <QrCode className="w-3.5 h-3.5" /> Lihat Kartu QR
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

      {/* Modal Tambah / Edit — hanya untuk Admin & BK */}
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

              {/* Nama */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nama Lengkap & Gelar *</label>
                <input type="text" required value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="H. Budi Santoso, S.H., M.H."
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 placeholder-slate-600" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">NIP / No. Anggota</label>
                  <input type="text" value={formData.nip}
                    onChange={e => setFormData(p => ({ ...p, nip: e.target.value }))}
                    placeholder="DPRD-001"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono placeholder-slate-600" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Jabatan *</label>
                  <select value={formData.jabatan} onChange={e => setFormData(p => ({ ...p, jabatan: e.target.value }))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500">
                    {JABATAN_LIST.map(j => <option key={j}>{j}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Fraksi *</label>
                  <select value={formData.fraksi} onChange={e => setFormData(p => ({ ...p, fraksi: e.target.value }))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500">
                    {FRAKSI_LIST.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Komisi *</label>
                  <select value={formData.komisi} onChange={e => setFormData(p => ({ ...p, komisi: e.target.value }))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500">
                    {KOMISI_LIST.map(k => <option key={k}>{k}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">No. HP</label>
                  <input type="tel" value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="08xxxxxxxxxx"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 placeholder-slate-600" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Email</label>
                  <input type="email" value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="nama@dprd.go.id"
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 placeholder-slate-600" />
                </div>
              </div>

              {/* Feedback */}
              {saveMsg === 'success' && (
                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{editMember ? 'Data berhasil diperbarui!' : 'Anggota berhasil ditambahkan!'}</span>
                </div>
              )}
              {saveMsg && saveMsg !== 'success' && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Gagal menyimpan:</p>
                    <p className="text-[11px] opacity-80 mt-0.5">{saveMsg}</p>
                    <p className="text-[11px] opacity-60 mt-1">Pastikan Firestore Rules: <code>allow read, write: if true;</code></p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-slate-300">
                  Batal
                </button>
                <button type="submit" disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 rounded-xl font-bold flex items-center gap-2">
                  {isSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Menyimpan...</span></>
                    : <span>{editMember ? 'Update Data' : 'Simpan Anggota Baru'}</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
  QrCode
} from 'lucide-react';
import { compressImage } from '../utils/geoUtils';

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

const EMPTY_FORM = {
  name: '',
  nip: '',
  fraksi: 'Fraksi PDI Perjuangan',
  komisi: 'Komisi I (Hukum & Pemerintahan)',
  jabatan: 'Anggota DPRD',
  phone: '',
  email: '',
  photo: '',
  statusActive: true,
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
      fraksi: member.fraksi || FRAKSI_LIST[0],
      komisi: member.komisi || KOMISI_LIST[0],
      jabatan: member.jabatan || 'Anggota DPRD',
      phone: member.phone || '',
      email: member.email || '',
      photo: member.photo || '',
      statusActive: member.statusActive !== false,
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
    setSaveMsg('');
    setIsSaving(true);
    const result = editMember
      ? await updateMember(editMember.id, formData, photoFile)
      : await addMember(formData, photoFile);
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

  // Navigasi ke Halaman Kartu Anggota
  const handleViewCard = (memberId) => {
    setActiveMemberId(memberId);
    if (onNavigate) {
      onNavigate('member_qr');
    }
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
              ? 'Kelola profil, foto, fraksi, komisi, dan cetak Kartu ID Anggota.'
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
                <p className="text-[10px] text-slate-400">{m.komisi?.replace(/\(.*?\)/, '').trim()}</p>
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
                  <label className="block text-slate-400 mb-1 font-semibold">Komisi / AKD</label>
                  <select value={formData.komisi}
                    onChange={e => setFormData(p => ({ ...p, komisi: e.target.value }))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white">
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

    </div>
  );
}

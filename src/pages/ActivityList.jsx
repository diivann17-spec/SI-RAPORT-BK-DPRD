import React, { useState, useCallback } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  Calendar, Plus, MapPin, X, Edit2, Trash2,
  Loader2, CheckCircle, AlertCircle, Clock, ChevronDown
} from 'lucide-react';

const EMPTY_FORM = {
  title: '',
  category: 'Paripurna',
  date: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  endTime: '12:00',
  locationName: 'Ruang Rapat Utama Gedung DPRD',
  targetLat: -6.200000,
  targetLng: 106.816666,
  radiusMeters: 150,
  description: '',
  status: 'ACTIVE',
};

const CATEGORY_COLORS = {
  Paripurna: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  Komisi: 'bg-blue-950 text-blue-300 border-blue-800',
  Banmus: 'bg-purple-950 text-purple-300 border-purple-800',
  Banggar: 'bg-amber-950 text-amber-300 border-amber-800',
  Reses: 'bg-cyan-950 text-cyan-300 border-cyan-800',
  'Kunjungan Kerja': 'bg-rose-950 text-rose-300 border-rose-800',
};

export default function ActivityList() {
  const { activities, addActivity, updateActivity, deleteActivity, logs, loading } = useAttendance();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editActivity, setEditActivity] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');

  const openAdd = () => { setFormData(EMPTY_FORM); setEditActivity(null); setIsAddOpen(true); setSaveMsg(''); };
  const openEdit = (a) => { setFormData({ ...a }); setEditActivity(a); setIsAddOpen(true); setSaveMsg(''); };
  const closeModal = () => { setIsAddOpen(false); setEditActivity(null); setSaveMsg(''); };

  const handleChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveMsg('');
    setIsSaving(true);
    let result;
    if (editActivity) {
      result = await updateActivity(editActivity.id, formData);
    } else {
      result = await addActivity(formData);
    }
    setIsSaving(false);
    if (result?.success) {
      setSaveMsg('success');
      setTimeout(closeModal, 1200);
    } else {
      setSaveMsg(result?.message || 'Gagal menyimpan ke Firestore.');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Hapus kegiatan "${title}"? Data absensi terkait tidak ikut terhapus.`)) return;
    setDeletingId(id);
    await deleteActivity(id);
    setDeletingId(null);
  };

  const filtered = filterCategory === 'ALL'
    ? activities
    : activities.filter(a => a.category === filterCategory);

  const getAttendanceCount = useCallback((activityId) =>
    logs.filter(l => l.activityId === activityId).length,
    [logs]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Agenda & Kegiatan DPRD</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola jadwal rapat, koordinat GPS geofence, dan status kegiatan.</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Agenda Baru</span>
        </button>
      </div>

      {/* Filter kategori */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'Paripurna', 'Komisi', 'Banmus', 'Banggar', 'Reses', 'Kunjungan Kerja'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              filterCategory === cat
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-500'
            }`}
          >
            {cat === 'ALL' ? `Semua (${activities.length})` : cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="ml-3 text-slate-400 text-sm">Memuat data dari Firestore...</span>
        </div>
      )}

      {/* Kosong */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-semibold">Belum ada agenda kegiatan</p>
          <p className="text-slate-400 text-xs mt-1">Klik "Buat Agenda Baru" untuk menambahkan kegiatan pertama.</p>
          <button onClick={openAdd} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs">
            + Buat Agenda Sekarang
          </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {filtered.map(a => {
          const absensiCount = getAttendanceCount(a.id);
          const colorClass = CATEGORY_COLORS[a.category] || 'bg-slate-900 text-slate-300 border-slate-700';
          return (
            <div key={a.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold ${colorClass}`}>
                      {a.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{a.date}</span>
                    <span className="text-xs text-slate-400">{a.startTime} – {a.endTime}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      a.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {a.status === 'ACTIVE' ? '● Aktif' : '○ Selesai'}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{a.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{a.locationName}</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Radius GPS: {a.radiusMeters}m</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{absensiCount} Absensi Tercatat</span>
                  </div>
                  {a.description && <p className="text-xs text-slate-400 italic">{a.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(a)}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-950/40 rounded-lg transition"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id, a.title)}
                    disabled={deletingId === a.id}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition disabled:opacity-50"
                    title="Hapus"
                  >
                    {deletingId === a.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl text-white max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <div>
                <h3 className="font-bold text-base">{editActivity ? 'Edit Agenda Kegiatan' : 'Buat Agenda Kegiatan Baru'}</h3>
                <p className="text-xs text-slate-400">Data disimpan langsung ke Cloud Firestore</p>
              </div>
              <button onClick={closeModal} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {/* Judul */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Judul Kegiatan *</label>
                <input
                  type="text" required value={formData.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="Contoh: Rapat Paripurna Penetapan Perda No. 3 Tahun 2026"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Kategori */}
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Jenis Kegiatan *</label>
                  <select value={formData.category} onChange={e => handleChange('category', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500">
                    <option>Paripurna</option>
                    <option>Komisi</option>
                    <option>Banmus</option>
                    <option>Banggar</option>
                    <option>Reses</option>
                    <option>Kunjungan Kerja</option>
                  </select>
                </div>
                {/* Status */}
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Status</label>
                  <select value={formData.status} onChange={e => handleChange('status', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500">
                    <option value="ACTIVE">Aktif</option>
                    <option value="COMPLETED">Selesai</option>
                    <option value="CANCELLED">Dibatalkan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Tanggal *</label>
                  <input type="date" required value={formData.date} onChange={e => handleChange('date', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Mulai</label>
                  <input type="time" value={formData.startTime} onChange={e => handleChange('startTime', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Selesai</label>
                  <input type="time" value={formData.endTime} onChange={e => handleChange('endTime', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              {/* Lokasi */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nama Lokasi *</label>
                <input type="text" required value={formData.locationName} onChange={e => handleChange('locationName', e.target.value)}
                  placeholder="Ruang Rapat Utama Gedung DPRD"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 placeholder-slate-600" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Latitude</label>
                  <input type="number" step="any" value={formData.targetLat}
                    onChange={e => handleChange('targetLat', parseFloat(e.target.value))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Longitude</label>
                  <input type="number" step="any" value={formData.targetLng}
                    onChange={e => handleChange('targetLng', parseFloat(e.target.value))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Radius GPS (m)</label>
                  <input type="number" value={formData.radiusMeters}
                    onChange={e => handleChange('radiusMeters', Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold" />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Deskripsi (opsional)</label>
                <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)}
                  rows={2} placeholder="Agenda rapat, topik pembahasan..."
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 resize-none placeholder-slate-600" />
              </div>

              {/* Feedback */}
              {saveMsg === 'success' && (
                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Berhasil disimpan ke Firestore!</span>
                </div>
              )}
              {saveMsg && saveMsg !== 'success' && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-slate-300">
                  Batal
                </button>
                <button type="submit" disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 rounded-xl font-bold flex items-center gap-2">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Menyimpan...</span></> : <span>{editActivity ? 'Update Kegiatan' : 'Simpan Agenda'}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

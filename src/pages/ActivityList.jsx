import React, { useState, useCallback, useMemo } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { formatLiveTimestamp } from '../utils/raportUtils';
import ActivityQRModal from '../components/ActivityQRModal';
import LPJViewerModal from '../components/LPJViewerModal';
import GuestAttendanceModal from '../components/GuestAttendanceModal';
import {
  Calendar, Plus, MapPin, X, Edit2, Trash2, RotateCcw,
  Loader2, CheckCircle, AlertCircle, Clock, ChevronDown,
  ChevronRight, Building2, QrCode, FileSpreadsheet, UserPlus, Users
} from 'lucide-react';

const EMPTY_FORM = {
  title: '',
  category: 'Paripurna',
  activityNumber: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  endTime: '12:00',
  toleranceMinutes: 30,
  locationName: 'Ruang Rapat Paripurna Utama Gedung DPRD',
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
  const { activities, addActivity, updateActivity, deleteActivity, clearActivityAttendance, logs, members, loading } = useAttendance();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editActivity, setEditActivity] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const [filterCategory, setFilterCategory] = useState('ALL');
  const [expandedAttendees, setExpandedAttendees] = useState({});

  // Modals state
  const [activeQRActivity, setActiveQRActivity] = useState(null);
  const [activeLPJActivityId, setActiveLPJActivityId] = useState(null);
  const [activeGuestActivityId, setActiveGuestActivityId] = useState(null);

  const openAdd = () => {
    setFormData({
      ...EMPTY_FORM,
      activityNumber: `${String(activities.length + 1).padStart(3, '0')}/DPRD/IX/2026`
    });
    setEditActivity(null);
    setIsAddOpen(true);
    setSaveMsg('');
  };

  const openEdit = (a) => {
    setFormData({ ...a });
    setEditActivity(a);
    setIsAddOpen(true);
    setSaveMsg('');
  };

  const closeModal = () => {
    setIsAddOpen(false);
    setEditActivity(null);
    setSaveMsg('');
  };

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
      setTimeout(closeModal, 1000);
    } else {
      setSaveMsg(result?.message || 'Gagal menyimpan agenda.');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Hapus agenda "${title}"? Data presensi terkait pada agenda ini juga akan dibersihkan.`)) return;
    setDeletingId(id);
    await deleteActivity(id);
    setDeletingId(null);
  };

  const handleResetAttendance = async (id, title) => {
    if (!window.confirm(`Reset presensi agenda "${title}" menjadi 0? Seluruh peserta yang tercatat hadir di sesi ini akan dikosongkan.`)) return;
    await clearActivityAttendance(id);
  };


  const filtered = filterCategory === 'ALL'
    ? activities
    : activities.filter(a => a.category === filterCategory);

  const getAttendanceMetrics = useCallback((activityId) => {
    const actLogs = logs.filter(l => l.activityId === activityId);
    const internalCount = actLogs.filter(l => l.participantType !== 'EXTERNAL').length;
    const externalCount = actLogs.filter(l => l.participantType === 'EXTERNAL').length;
    return {
      total: actLogs.length,
      internalCount,
      externalCount,
      actLogs
    };
  }, [logs]);

  return (
    <div className="space-y-4 sm:space-y-5">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              Manajemen Terpadu
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">Agenda & Jadwal Kegiatan</h1>
          <p className="text-xs text-slate-500 mt-0.5">Satu Agenda → Satu QR Code Khusus → Validasi GPS & Perangkat → LPJ Digital.</p>
        </div>
        <button
          onClick={openAdd}
          className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Agenda Baru</span>
        </button>
      </div>

      {/* Filter Categories Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['ALL', 'Paripurna', 'Komisi', 'Banmus', 'Banggar', 'Reses', 'Kunjungan Kerja'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              filterCategory === cat
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cat === 'ALL' ? 'Semua Kategori' : cat}
          </button>
        ))}
      </div>

      {/* Activities Grid / Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(activity => {
          const metrics = getAttendanceMetrics(activity.id);
          const colorClass = CATEGORY_COLORS[activity.category] || 'bg-slate-800 text-slate-200 border-slate-700';

          return (
            <div
              key={activity.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-emerald-500/40 transition flex flex-col justify-between gap-4"
            >
              {/* Card Top */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${colorClass}`}>
                      {activity.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">#{activity.activityNumber || activity.id}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleResetAttendance(activity.id, activity.title)}
                      className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition"
                      title="Reset Peserta Hadir (Jadikan 0)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEdit(activity)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                      title="Edit Agenda"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(activity.id, activity.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                      title="Hapus Agenda"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug line-clamp-2">
                  {activity.title}
                </h3>

                {/* Info Badges */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{activity.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{activity.startTime} - {activity.endTime} WIB</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{activity.locationName} (Radius {activity.radiusMeters || 150}m)</span>
                  </div>
                </div>

                {/* Tolerance & Attendee Metrics */}
                <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl text-[11px]">
                  <button
                    type="button"
                    onClick={() => setExpandedAttendees(prev => ({ ...prev, [activity.id]: !prev[activity.id] }))}
                    className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-400 transition"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dewan: <strong className="text-emerald-400">{metrics.internalCount}</strong> / {members.length}</span>
                    <span className="mx-1">•</span>
                    <span>OPD: <strong className="text-cyan-400">{metrics.externalCount}</strong></span>
                    <span className="text-[10px] text-emerald-500 underline ml-1">
                      ({expandedAttendees[activity.id] ? 'Tutup Daftar' : 'Lihat Siapa Saja'})
                    </span>
                  </button>
                  <span className="text-[10px] font-mono text-amber-500 font-bold">
                    Toleransi: {activity.toleranceMinutes || 30}m
                  </span>
                </div>

                {/* Expandable Live Attendee List for this Agenda */}
                {expandedAttendees[activity.id] && (
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-300">
                      <span>Daftar Peserta Hadir ({metrics.total}):</span>
                      <span className="text-[10px] text-slate-500">Live Timestamp</span>
                    </div>
                    {metrics.actLogs.length === 0 ? (
                      <p className="text-slate-500 text-[11px] py-1 text-center">Belum ada peserta yang mengisi absen di agenda ini.</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 divide-y divide-slate-800/80 pr-1">
                        {metrics.actLogs.map(log => {
                          const isExt = log.participantType === 'EXTERNAL';
                          return (
                            <div key={log.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${isExt ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                                  {isExt ? (log.guestAgency || 'OPD') : (log.memberFraksi || 'Dewan')}
                                </span>
                                <span className="text-slate-200 font-semibold truncate text-[11px]">
                                  {log.memberName || log.guestName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-mono text-slate-400">
                                  {formatLiveTimestamp(log.timestamp)}
                                </span>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${log.status === 'Terlambat' || log.status === 'LATE' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                  {log.status || 'Hadir'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Actions Footer */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                {/* 1. Tampilkan QR Code */}
                <button
                  onClick={() => setActiveQRActivity(activity)}
                  className="py-2 px-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Agenda</span>
                </button>

                {/* 2. Presensi Tamu OPD */}
                <button
                  onClick={() => setActiveGuestActivityId(activity.id)}
                  className="py-2 px-2 bg-teal-600/15 hover:bg-teal-600/25 border border-teal-500/30 text-teal-300 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Tamu OPD</span>
                </button>

                {/* 3. Lembar LPJ Digital */}
                <button
                  onClick={() => setActiveLPJActivityId(activity.id)}
                  className="py-2 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                  <span>LPJ Digital</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal Buat / Edit Agenda */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl text-slate-100 relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <h3 className="font-bold text-base text-white">
                {editActivity ? 'Edit Agenda Kegiatan' : 'Buat Agenda Kegiatan Baru'}
              </h3>
              <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
              
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nama / Judul Kegiatan:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rapat Paripurna Ke-13 Pembahasan Ranperda..."
                  value={formData.title}
                  onChange={e => handleChange('title', e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Nomor Berita Acara / Agenda:</label>
                  <input
                    type="text"
                    placeholder="005/PARIPURNA/DPRD/IX/2026"
                    value={formData.activityNumber}
                    onChange={e => handleChange('activityNumber', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Kategori Agenda:</label>
                  <select
                    value={formData.category}
                    onChange={e => handleChange('category', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs font-bold"
                  >
                    <option value="Paripurna">Paripurna</option>
                    <option value="Komisi">Komisi</option>
                    <option value="Banmus">Banmus</option>
                    <option value="Banggar">Banggar</option>
                    <option value="Reses">Reses</option>
                    <option value="Kunjungan Kerja">Kunjungan Kerja</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Tanggal Kegiatan:</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => handleChange('date', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Jam Mulai:</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={e => handleChange('startTime', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Jam Selesai:</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={e => handleChange('endTime', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Toleransi Waktu & Radius GPS */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-800/50 rounded-2xl border border-slate-700">
                <div>
                  <label className="block font-bold text-amber-400 mb-1">Toleransi Keterlambatan:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={formData.toleranceMinutes}
                      onChange={e => handleChange('toleranceMinutes', Number(e.target.value))}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold"
                    />
                    <span className="text-slate-400 text-xs">Menit</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-cyan-400 mb-1">Radius GPS Maksimal:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="50"
                      max="5000"
                      value={formData.radiusMeters}
                      onChange={e => handleChange('radiusMeters', Number(e.target.value))}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold"
                    />
                    <span className="text-slate-400 text-xs">Meter</span>
                  </div>
                </div>
              </div>

              {/* Lokasi Rapat */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nama Tempat / Ruang Sidang:</label>
                <input
                  type="text"
                  placeholder="Contoh: Ruang Rapat Paripurna Utama Gedung DPRD"
                  value={formData.locationName}
                  onChange={e => handleChange('locationName', e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs"
                />
              </div>

              {/* Catatan / Keterangan Agenda */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Keterangan / Deskripsi Agenda:</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan urgensi agenda sidang..."
                  value={formData.description}
                  onChange={e => handleChange('description', e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs"
                />
              </div>

              {saveMsg && (
                <div className={`p-3 rounded-xl flex items-center gap-2 ${saveMsg === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-rose-950/60 text-rose-300 border border-rose-800'}`}>
                  {saveMsg === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{saveMsg === 'success' ? 'Agenda & QR Code Berhasil Disimpan!' : saveMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>{editActivity ? 'Simpan Perubahan Agenda' : 'Terbitkan Agenda & Buat QR Code'}</span>
              </button>

            </form>
          </div>
        </div>
      )}

      {/* Modal QR Code Agenda */}
      {activeQRActivity && (
        <ActivityQRModal
          isOpen={!!activeQRActivity}
          onClose={() => setActiveQRActivity(null)}
          activity={activeQRActivity}
        />
      )}

      {/* Modal LPJ Digital */}
      {activeLPJActivityId && (
        <LPJViewerModal
          isOpen={!!activeLPJActivityId}
          onClose={() => setActiveLPJActivityId(null)}
          activityId={activeLPJActivityId}
        />
      )}

      {/* Modal Presensi Tamu OPD */}
      {activeGuestActivityId && (
        <GuestAttendanceModal
          isOpen={!!activeGuestActivityId}
          onClose={() => setActiveGuestActivityId(null)}
          activityId={activeGuestActivityId}
        />
      )}

    </div>
  );
}

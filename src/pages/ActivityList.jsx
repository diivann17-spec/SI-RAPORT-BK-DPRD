import React, { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAttendance } from '../context/AttendanceContext';
import { formatLiveTimestamp } from '../utils/raportUtils';
import ActivityQRModal from '../components/ActivityQRModal';
import LPJViewerModal from '../components/LPJViewerModal';
import GuestAttendanceModal from '../components/GuestAttendanceModal';
import InvitationGeneratorModal from '../components/InvitationGeneratorModal';
import {
  Calendar, Plus, MapPin, X, Edit2, Trash2, RotateCcw,
  Loader2, CheckCircle, AlertCircle, Clock, ChevronDown,
  ChevronRight, Building2, QrCode, FileSpreadsheet, UserPlus, Users,
  UserCheck, UserMinus
} from 'lucide-react';

import { AKD_LIST, AKD_CATEGORIES, AKD_BADGE_COLORS, matchAKDCategory } from '../utils/akdUtils';

const memberMatchesAKD = (member, category) =>
  (member.akdMemberships || [member.komisi]).some(membership => matchAKDCategory(membership, category));

const getLocalDateInputValue = () => {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
};

const EMPTY_FORM = {
  title: '',
  category: 'Komisi I',
  akdOrganizer: 'Komisi I',
  activityNumber: '',
  date: getLocalDateInputValue(),
  startTime: '09:00',
  endTime: '12:00',
  toleranceMinutes: 30,
  locationName: '',
  roomId: 'ROOM-KOMISI-I',
  targetLat: -6.760700,
  targetLng: 108.482200,
  radiusMeters: 150,
  gpsRequired: false,
  description: '',
  status: 'ACTIVE',
  participantMemberIds: [],
  participantStatuses: {},
  participantSelectionMode: 'MANUAL',
  invitedGuests: [],
  attendanceMethods: ['QR_AGENDA', 'QR_WEBCAM', 'GPS_ONLINE', 'MANUAL_OVERRIDE'],
};

export default function ActivityList() {
  const { activities, addActivity, updateActivity, deleteActivity, clearActivityAttendance, logs, members, rooms, loading } = useAttendance();
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
  const [activeInvitationActivity, setActiveInvitationActivity] = useState(null);
  const [draggedMemberId, setDraggedMemberId] = useState(null);
  const [externalDraft, setExternalDraft] = useState({ agency: '', invitedName: '', position: '', category: 'OPD/INSTANSI' });
  const participantImportRef = React.useRef(null);
  const participantsLocked = Boolean(editActivity && Array.isArray(editActivity.participantMemberIds));

  const openAdd = () => {
    setFormData({
      ...EMPTY_FORM,
      locationName: rooms.find(room => room.id === EMPTY_FORM.roomId)?.name || '',
      activityNumber: `${String(activities.length + 1).padStart(3, '0')}/DPRD/IX/2026`,
      participantMemberIds: [],
      participantStatuses: {},
      participantSelectionMode: 'MANUAL',
    });
    setEditActivity(null);
    setIsAddOpen(true);
    setSaveMsg('');
  };

  const openEdit = (a) => {
    const legacyRoom = rooms.find(room => room.name === a.locationName || room.name === a.roomName);
    const existingParticipantIds = Array.isArray(a.participantMemberIds) ? a.participantMemberIds : [];
    const existingStatuses = a.participantStatuses || Object.fromEntries(existingParticipantIds.map(id => [id, 'WAJIB_HADIR']));
    setFormData({ ...a, roomId: a.roomId || legacyRoom?.id || '', participantMemberIds: existingParticipantIds, participantStatuses: existingStatuses, participantSelectionMode: a.participantSelectionMode || 'MANUAL' });
    setEditActivity(a);
    setIsAddOpen(true);
    setSaveMsg('');
  };

  const closeModal = () => {
    setIsAddOpen(false);
    setEditActivity(null);
    setSaveMsg('');
  };

  const handleChange = (field, value) => setFormData(previous => {
    if (field !== 'startTime') return { ...previous, [field]: value };

    const [startHour, startMinute] = String(value).split(':').map(Number);
    const [endHour, endMinute] = String(previous.endTime || '').split(':').map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    if (!Number.isFinite(startTotal) || !Number.isFinite(endTotal) || endTotal > startTotal) {
      return { ...previous, [field]: value };
    }

    const adjustedEnd = Math.min(startTotal + 120, 23 * 60 + 59);
    return {
      ...previous,
      [field]: value,
      endTime: `${String(Math.floor(adjustedEnd / 60)).padStart(2, '0')}:${String(adjustedEnd % 60).padStart(2, '0')}`,
    };
  });

  const handleRoomChange = (roomId) => handleChange('roomId', roomId);

  const captureAgendaLocation = () => {
    if (!navigator.geolocation) {
      setSaveMsg('Perangkat/browser tidak mendukung GPS untuk menetapkan titik lokasi.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        handleChange('targetLat', Number(position.coords.latitude.toFixed(6)));
        handleChange('targetLng', Number(position.coords.longitude.toFixed(6)));
        setSaveMsg('Titik lokasi agenda berhasil diambil dari perangkat ini.');
      },
      () => setSaveMsg('Gagal mengambil lokasi. Izinkan akses GPS terlebih dahulu.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const toggleParticipant = (memberId) => {
    setFormData(previous => {
      const current = previous.participantMemberIds || [];
      const next = current.includes(memberId)
        ? current.filter(id => id !== memberId)
        : [...current, memberId];
      return { ...previous, participantMemberIds: next, participantStatuses: { ...previous.participantStatuses, ...(next.includes(memberId) ? { [memberId]: previous.participantStatuses?.[memberId] || 'WAJIB_HADIR' } : {}) } };
    });
  };

  const selectParticipantsByAKD = () => {
    const selected = members
      .filter(member => memberMatchesAKD(member, formData.category))
      .map(member => member.id);
    handleChange('participantMemberIds', selected);
    handleChange('participantSelectionMode', 'STRUCTURE');
  };

  const selectParticipantsByMode = (mode) => {
    let selected = [];
    if (mode === 'ALL') selected = members.map(member => member.id);
    if (mode === 'STRUCTURE') selected = members.filter(member => memberMatchesAKD(member, formData.category)).map(member => member.id);
    if (mode === 'COMMISSION') selected = members.filter(member => String(member.komisi || '').toLowerCase() === String(formData.category || '').toLowerCase()).map(member => member.id);
    if (mode === 'BANGGAR') selected = members.filter(member => /banggar|anggaran/i.test(`${member.komisi || ''} ${member.akdMemberships || ''}`)).map(member => member.id);
    if (mode === 'BK') selected = members.filter(member => /kehormatan|\bbk\b/i.test(`${member.komisi || ''} ${member.akdMemberships || ''} ${member.jabatan || ''}`)).map(member => member.id);
    handleChange('participantMemberIds', selected);
    handleChange('participantStatuses', Object.fromEntries(selected.map(id => [id, 'WAJIB_HADIR'])));
    handleChange('participantSelectionMode', mode);
  };

  const moveParticipant = (targetMemberId) => {
    if (!draggedMemberId || draggedMemberId === targetMemberId) return;
    setFormData(previous => {
      const current = [...(previous.participantMemberIds || [])];
      const fromIndex = current.indexOf(draggedMemberId);
      const toIndex = current.indexOf(targetMemberId);
      if (fromIndex < 0 || toIndex < 0) return previous;
      current.splice(fromIndex, 1);
      current.splice(toIndex, 0, draggedMemberId);
      return { ...previous, participantMemberIds: current };
    });
    setDraggedMemberId(null);
  };

  const importParticipants = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = loadEvent => {
      const workbook = XLSX.read(loadEvent.target.result, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
      const names = rows.flat().map(value => String(value).trim()).filter(value => value.length > 2);
      const importedIds = members.filter(member => names.some(name => name.toLowerCase() === member.name?.toLowerCase() || name.toLowerCase().includes(member.name?.toLowerCase()))).map(member => member.id);
      handleChange('participantMemberIds', Array.from(new Set([...(formData.participantMemberIds || []), ...importedIds])));
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const addExternalParticipant = () => {
    if (!externalDraft.agency.trim() || !externalDraft.invitedName.trim()) return;
    handleChange('invitedGuests', [...(formData.invitedGuests || []), { ...externalDraft, id: `GST-${Date.now()}` }]);
    setExternalDraft({ agency: '', invitedName: '', position: '', category: 'OPD/INSTANSI' });
  };

  const removeExternalParticipant = (id) => {
    handleChange('invitedGuests', (formData.invitedGuests || []).filter(guest => guest.id !== id));
  };

  const toggleAttendanceMethod = (method) => {
    const current = formData.attendanceMethods || [];
    handleChange('attendanceMethods', current.includes(method) ? current.filter(item => item !== method) : [...current, method]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveMsg('');
    if (!Array.isArray(formData.participantMemberIds) || formData.participantMemberIds.length === 0) {
      setSaveMsg('Pilih minimal satu Anggota DPRD sebagai peserta wajib agenda.');
      return;
    }
    if (formData.endTime <= formData.startTime) {
      setSaveMsg('Jam selesai harus lebih akhir dari jam mulai agar QR dapat digunakan.');
      return;
    }
    setIsSaving(true);
    const payload = {
      ...formData,
      locationName: rooms.find(room => room.id === formData.roomId)?.name || formData.locationName,
    };
    let result;
    if (editActivity) {
      result = await updateActivity(editActivity.id, payload);
    } else {
      result = await addActivity(payload);
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
    : activities.filter(a => matchAKDCategory(a.category, filterCategory));

  const getAttendanceMetrics = useCallback((activityId) => {
    const activity = activities.find(item => item.id === activityId);
    const actLogs = logs.filter(l => l.activityId === activityId);
    const participantIds = activity?.participantMemberIds;
    const participantMembers = Array.isArray(participantIds)
      ? members.filter(member => participantIds.includes(member.id))
      : [];
    const internalLogs = actLogs.filter(l => l.participantType !== 'EXTERNAL');
    const internalLogByMember = new Map(internalLogs.filter(log => log.memberId).map(log => [log.memberId, log]));
    const statusCounts = { hadir: 0, belumHadir: 0, izin: 0, sakit: 0, dinasLuar: 0, tanpaKeterangan: 0 };
    participantMembers.forEach(member => {
      const status = (internalLogByMember.get(member.id)?.status || '').toLowerCase();
      if (!status) statusCounts.belumHadir += 1;
      else if (status.includes('izin')) statusCounts.izin += 1;
      else if (status.includes('sakit')) statusCounts.sakit += 1;
      else if (status.includes('dinas')) statusCounts.dinasLuar += 1;
      else if (status.includes('tanpa') || status.includes('alpa') || status.includes('alpha')) statusCounts.tanpaKeterangan += 1;
      else statusCounts.hadir += 1;
    });
    const externalCount = actLogs.filter(l => l.participantType === 'EXTERNAL').length;
    return {
      total: actLogs.length,
      participantCount: participantMembers.length,
      internalCount: internalLogs.length,
      externalCount,
      actLogs,
      statusCounts,
      attendancePercentage: participantMembers.length
        ? Math.round((statusCounts.hadir / participantMembers.length) * 100)
        : 0,
    };
  }, [activities, logs, members]);

  return (
    <div className="space-y-4 sm:space-y-5">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              Struktur AKD Terpadu
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">Agenda & Jadwal Kegiatan AKD</h1>
          <p className="text-xs text-slate-500 mt-0.5">Komisi I-IV • BK • Bapemperda • Banggar • Banmus • Pansus 1-4 • Pimpinan • Paripurna</p>
        </div>

        <button
          onClick={openAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Agenda Baru</span>
        </button>
      </div>

      {/* Filter Categories AKD Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
        {AKD_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition shrink-0 whitespace-nowrap ${
              filterCategory === cat
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cat === 'ALL' ? 'Semua AKD' : cat}
          </button>
        ))}
      </div>

      {/* Activities Grid / Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(activity => {
          const metrics = getAttendanceMetrics(activity.id);
          const colorClass = AKD_BADGE_COLORS[activity.category] || 'bg-slate-800 text-slate-200 border-slate-700';

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
                    <span>Dewan: <strong className="text-emerald-400">{metrics.statusCounts.hadir}</strong> / {metrics.participantCount}</span>
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

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10px]">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
                    <UserCheck className="w-3.5 h-3.5 mx-auto text-emerald-400 mb-1" />
                    <strong className="block text-emerald-300">{metrics.statusCounts.hadir}</strong>
                    <span className="text-slate-400">Hadir</span>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2 text-center">
                    <Clock className="w-3.5 h-3.5 mx-auto text-amber-400 mb-1" />
                    <strong className="block text-amber-300">{metrics.statusCounts.belumHadir}</strong>
                    <span className="text-slate-400">Belum</span>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2 text-center">
                    <span className="block text-blue-300 font-bold mb-1">{metrics.statusCounts.izin}</span>
                    <span className="text-slate-400">Izin</span>
                  </div>
                  <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-2 text-center">
                    <span className="block text-cyan-300 font-bold mb-1">{metrics.statusCounts.sakit}</span>
                    <span className="text-slate-400">Sakit</span>
                  </div>
                  <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-2 text-center">
                    <span className="block text-violet-300 font-bold mb-1">{metrics.statusCounts.dinasLuar}</span>
                    <span className="text-slate-400">Dinas</span>
                  </div>
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-2 text-center">
                    <UserMinus className="w-3.5 h-3.5 mx-auto text-rose-400 mb-1" />
                    <strong className="block text-rose-300">{metrics.statusCounts.tanpaKeterangan}</strong>
                    <span className="text-slate-400">Alpa</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Persentase kehadiran</span>
                  <strong className={metrics.attendancePercentage >= 75 ? 'text-emerald-400' : 'text-amber-400'}>
                    {metrics.attendancePercentage}%
                  </strong>
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
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${String(log.status || '').toLowerCase().includes('terlambat') ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
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

                <button
                  onClick={() => setActiveInvitationActivity(activity)}
                  className="py-2 px-2 bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/30 text-amber-300 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Undangan</span>
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
                  <label className="block font-bold text-slate-300 mb-1">Penyelenggara / Kategori AKD:</label>
                  <select
                    value={formData.category}
                    onChange={e => handleChange('category', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs font-bold"
                  >
                    <optgroup label="Komisi-Komisi">
                      <option value="Komisi I">Komisi I (Hukum & Pemerintahan)</option>
                      <option value="Komisi II">Komisi II (Perekonomian & Keuangan)</option>
                      <option value="Komisi III">Komisi III (Pembangunan & Infrastruktur)</option>
                      <option value="Komisi IV">Komisi IV (Kesejahteraan Rakyat)</option>
                    </optgroup>
                    <optgroup label="Badan-Badan">
                      <option value="Badan Kehormatan (BK)">Badan Kehormatan (BK)</option>
                      <option value="Badan Pembentukan Peraturan Daerah (Bapemperda)">Bapemperda</option>
                      <option value="Badan Anggaran (Banggar)">Badan Anggaran (Banggar)</option>
                      <option value="Badan Musyawarah (Banmus)">Badan Musyawarah (Banmus)</option>
                    </optgroup>
                    <optgroup label="Panitia Khusus (Pansus)">
                      <option value="Panitia Khusus (Pansus 1)">Pansus 1</option>
                      <option value="Panitia Khusus (Pansus 2)">Pansus 2</option>
                      <option value="Panitia Khusus (Pansus 3)">Pansus 3</option>
                      <option value="Panitia Khusus (Pansus 4)">Pansus 4</option>
                    </optgroup>
                    <optgroup label="Pimpinan & Paripurna">
                      <option value="Pimpinan DPRD">Pimpinan DPRD</option>
                      <option value="Rapat Paripurna">Rapat Paripurna (Seluruh Anggota)</option>
                    </optgroup>
                    <optgroup label="Kegiatan Lainnya">
                      <option value="Reses">Reses / Kunjungan Dapil</option>
                      <option value="Kunjungan Kerja">Kunjungan Kerja (Kunker)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-slate-300">Anggota DPRD Peserta Agenda {participantsLocked && <span className="text-amber-400">(Dikunci)</span>}</label>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {formData.participantMemberIds?.length || 0} dari {members.length} anggota dipilih
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" disabled={participantsLocked} onClick={() => selectParticipantsByMode('ALL')} className="px-2 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-[10px] font-bold disabled:opacity-40">Semua</button>
                    <button type="button" disabled={participantsLocked} onClick={() => selectParticipantsByMode('STRUCTURE')} className="px-2 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold disabled:opacity-40">Struktur</button>
                    <button type="button" disabled={participantsLocked} onClick={() => selectParticipantsByMode('COMMISSION')} className="px-2 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-[10px] font-bold disabled:opacity-40">Komisi</button>
                    <button type="button" disabled={participantsLocked} onClick={() => selectParticipantsByMode('BANGGAR')} className="px-2 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-[10px] font-bold disabled:opacity-40">Banggar</button>
                    <button type="button" disabled={participantsLocked} onClick={() => selectParticipantsByMode('BK')} className="px-2 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-[10px] font-bold disabled:opacity-40">BK</button>
                    <button type="button" disabled={participantsLocked} onClick={() => handleChange('participantSelectionMode', 'MANUAL')} className="px-2 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-[10px] font-bold disabled:opacity-40">Manual</button>
                    <button type="button" disabled={participantsLocked} onClick={() => handleChange('participantMemberIds', [])} className="px-2 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-[10px] font-bold disabled:opacity-40">
                      Kosongkan
                    </button>
                    <button type="button" disabled={participantsLocked} onClick={() => participantImportRef.current?.click()} className="px-2 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold disabled:opacity-40">
                      Import
                    </button>
                    <input ref={participantImportRef} type="file" accept=".xlsx,.xls,.csv,.tsv" onChange={importParticipants} className="hidden" />
                  </div>
                </div>
                <div className="max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                  {members.map(member => {
                    const selected = formData.participantMemberIds?.includes(member.id);
                    return (
                      <label key={member.id} draggable={selected} onDragStart={() => setDraggedMemberId(member.id)} onDragOver={event => event.preventDefault()} onDrop={() => moveParticipant(member.id)} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${selected ? 'bg-emerald-500/10 border-emerald-500/30' : 'border-slate-700 hover:border-slate-600'}`}>
                        <input type="checkbox" disabled={participantsLocked} checked={selected} onChange={() => toggleParticipant(member.id)} className="accent-emerald-500" />
                        <span className="min-w-0">
                          <span className="block text-[11px] text-slate-200 truncate">{member.name}</span>
                          <span className="block text-[9px] text-slate-500 truncate">{member.komisi || member.fraksi || 'Anggota DPRD'}</span>
                        </span>
                        {selected && <select value={formData.participantStatuses?.[member.id] || 'WAJIB_HADIR'} disabled={participantsLocked} onChange={event => handleChange('participantStatuses', { ...formData.participantStatuses, [member.id]: event.target.value })} onClick={event => event.stopPropagation()} className="ml-auto w-28 shrink-0 rounded bg-slate-900 border border-slate-700 p-1 text-[9px] text-slate-200">
                          <option value="WAJIB_HADIR">Wajib Hadir</option><option value="UNDANGAN">Peserta Undangan</option><option value="OPSIONAL">Opsional</option>
                        </select>}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between"><div><label className="block font-bold text-slate-300">Peserta Eksternal / Undangan</label><p className="text-[10px] text-slate-500">OPD, sekretariat, narasumber, dan tamu</p></div><span className="text-[10px] text-cyan-300 font-bold">{formData.invitedGuests?.length || 0} penerima</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input value={externalDraft.agency} onChange={e => setExternalDraft({ ...externalDraft, agency: e.target.value })} placeholder="Instansi / OPD" className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs" />
                  <input value={externalDraft.invitedName} onChange={e => setExternalDraft({ ...externalDraft, invitedName: e.target.value })} placeholder="Nama peserta / pejabat" className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs" />
                  <input value={externalDraft.position} onChange={e => setExternalDraft({ ...externalDraft, position: e.target.value })} placeholder="Jabatan" className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs" />
                  <select value={externalDraft.category} onChange={e => setExternalDraft({ ...externalDraft, category: e.target.value })} className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"><option>OPD/INSTANSI</option><option>SEKRETARIAT/ASN</option><option>NARASUMBER</option><option>TAMU/UNDANGAN</option></select>
                </div>
                <button type="button" onClick={addExternalParticipant} className="px-3 py-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">+ Tambahkan Peserta Eksternal</button>
                {(formData.invitedGuests || []).length > 0 && <div className="space-y-1">{formData.invitedGuests.map(guest => <div key={guest.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 text-[10px]"><span className="truncate"><strong>{guest.invitedName}</strong> • {guest.agency} • {guest.category || 'OPD/INSTANSI'}</span><button type="button" onClick={() => removeExternalParticipant(guest.id)} className="text-rose-300">Hapus</button></div>)}</div>}
              </div>

              <div className="p-3.5 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-2">
                <label className="block font-bold text-slate-300">Metode Absensi yang Diaktifkan</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[['QR_AGENDA', 'QR Agenda / HP'], ['QR_WEBCAM', 'Scan Petugas'], ['GPS_ONLINE', 'GPS Mobile'], ['MANUAL_OVERRIDE', 'Manual Admin']].map(([method, label]) => <label key={method} className="flex items-center gap-1.5 text-[10px] text-slate-300"><input type="checkbox" checked={(formData.attendanceMethods || []).includes(method)} onChange={() => toggleAttendanceMethod(method)} className="accent-emerald-500" />{label}</label>)}
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

              <label className="flex items-center gap-2 rounded-xl border border-cyan-800/60 bg-cyan-950/30 p-3 text-xs text-cyan-100">
                <input
                  type="checkbox"
                  checked={Boolean(formData.gpsRequired)}
                  onChange={event => handleChange('gpsRequired', event.target.checked)}
                  className="accent-cyan-500"
                />
                <span>
                  <strong>Wajibkan GPS untuk absensi mandiri</strong>
                  <span className="block text-[10px] text-cyan-300/70">Jika tidak dicentang, QR tetap dapat digunakan tanpa lokasi perangkat.</span>
                </span>
              </label>

              {/* Master Ruangan */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Pilih Ruangan:</label>
                <select required value={formData.roomId || ''} onChange={e => handleRoomChange(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs">
                  <option value="">Pilih ruangan master</option>
                  {rooms.filter(room => room.active !== false).map(room => <option key={room.id} value={room.id}>{room.name} - {room.description}</option>)}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Ruangan yang bentrok pada tanggal dan jam yang sama akan ditolak sistem.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-[10px] text-slate-400">Latitude<input type="number" step="0.000001" value={formData.targetLat} onChange={e => handleChange('targetLat', Number(e.target.value))} className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white" /></label>
                  <label className="text-[10px] text-slate-400">Longitude<input type="number" step="0.000001" value={formData.targetLng} onChange={e => handleChange('targetLng', Number(e.target.value))} className="mt-1 w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white" /></label>
                </div>
                <button type="button" onClick={captureAgendaLocation} className="mt-2 w-full py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">Gunakan Lokasi Perangkat Ini sebagai Titik Agenda</button>
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

      {activeInvitationActivity && (
        <InvitationGeneratorModal
          isOpen={!!activeInvitationActivity}
          onClose={() => setActiveInvitationActivity(null)}
          activity={activeInvitationActivity}
          members={members}
          updateActivity={updateActivity}
        />
      )}

    </div>
  );
}

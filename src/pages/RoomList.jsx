import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { DoorOpen, Plus, Trash2, Edit2, CalendarDays } from 'lucide-react';

export default function RoomList() {
  const { rooms, activities, addRoom, updateRoom, deleteRoom, isAdmin } = useAttendance();
  const [form, setForm] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');

  const saveRoom = async event => {
    event.preventDefault();
    const result = editingId ? await updateRoom(editingId, form) : await addRoom(form);
    setMessage(result.message || (result.success ? 'Ruangan tersimpan.' : 'Gagal menyimpan ruangan.'));
    if (result.success) { setForm({ name: '', description: '' }); setEditingId(null); }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-800/40 text-white shadow-xl flex items-center justify-between"><div><span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Master Data</span><h1 className="text-xl font-black mt-1">Master Ruangan</h1><p className="text-xs text-slate-300 mt-1">Kelola ruangan dan pantau jadwal penggunaannya.</p></div><DoorOpen className="w-9 h-9 text-indigo-300" /></div>
      {isAdmin && <form onSubmit={saveRoom} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-2"><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama ruangan" className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs" /><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Keterangan" className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs" /><button className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> {editingId ? 'Simpan Perubahan' : 'Tambah Ruangan'}</button></form>}
      {message && <p className="text-xs text-indigo-500">{message}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{rooms.map(room => {
        const roomActivities = activities.filter(activity => activity.roomId === room.id).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
        const active = roomActivities.find(activity => activity.status === 'ACTIVE' && activity.date === new Date().toISOString().slice(0, 10));
        return <article key={room.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3"><div className="flex justify-between gap-2"><div><h2 className="font-bold text-sm text-slate-900 dark:text-white">{room.name}</h2><p className="text-xs text-slate-500 mt-1">{room.description || 'Tanpa keterangan'}</p></div><span className={`h-fit px-2 py-1 rounded-full text-[10px] font-bold ${active ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{active ? 'Sedang digunakan' : 'Tersedia'}</span></div><div className="flex items-center gap-1.5 text-[11px] text-slate-500"><CalendarDays className="w-3.5 h-3.5" />{roomActivities.length} agenda terjadwal</div>{roomActivities.slice(0, 3).map(activity => <div key={activity.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px]"><strong>{activity.date} {activity.startTime}-{activity.endTime}</strong><span className="block text-slate-500 truncate">{activity.title}</span></div>)}{isAdmin && <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"><button onClick={() => { setEditingId(room.id); setForm({ name: room.name, description: room.description || '' }); }} className="text-xs text-blue-500 flex items-center gap-1"><Edit2 className="w-3.5 h-3.5" /> Edit</button><button onClick={async () => { if (window.confirm(`Hapus ${room.name}?`)) setMessage((await deleteRoom(room.id)).message || 'Ruangan dihapus.'); }} className="text-xs text-rose-500 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Hapus</button></div>}</article>;
      })}</div>
    </div>
  );
}

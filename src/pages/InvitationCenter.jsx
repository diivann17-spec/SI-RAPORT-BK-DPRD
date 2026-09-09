import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import InvitationGeneratorModal from '../components/InvitationGeneratorModal';
import { Calendar, Mail, Search, Users } from 'lucide-react';

export default function InvitationCenter() {
  const { activities, members, updateActivity } = useAttendance();
  const [query, setQuery] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const filteredActivities = activities.filter(activity =>
    `${activity.title} ${activity.category} ${activity.activityNumber}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border border-amber-800/40 text-white shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div><span className="text-[10px] font-black uppercase tracking-wider text-amber-300">Administrasi Surat</span><h1 className="text-xl font-black mt-1">Pusat Undangan Kegiatan</h1><p className="text-xs text-slate-300 mt-1">Buat surat undangan individual, QR peserta, dan cetak amplop dari satu tempat.</p></div>
          <Mail className="w-8 h-8 text-amber-300 shrink-0" />
        </div>
      </div>
      <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari kegiatan atau nomor surat..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs" /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredActivities.map(activity => {
          const participantCount = Array.isArray(activity.participantMemberIds) ? activity.participantMemberIds.length : 0;
          return <article key={activity.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div><div className="flex justify-between gap-2"><span className="text-[10px] font-bold text-amber-500 uppercase">{activity.category}</span><span className="text-[10px] font-mono text-slate-400">#{activity.activityNumber || activity.id}</span></div><h2 className="font-black text-sm text-slate-900 dark:text-white mt-2">{activity.title}</h2></div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-500" />{activity.date}</span><span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-500" />{participantCount} peserta</span></div>
            <button onClick={() => setSelectedActivity(activity)} className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2"><Mail className="w-4 h-4" /> Kelola Undangan & Amplop</button>
          </article>;
        })}
      </div>
      {selectedActivity && <InvitationGeneratorModal isOpen={!!selectedActivity} onClose={() => setSelectedActivity(null)} activity={selectedActivity} members={members} updateActivity={updateActivity} />}
    </div>
  );
}

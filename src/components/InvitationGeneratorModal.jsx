import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Mail, Printer, X, FileText, Archive, Building2, Plus } from 'lucide-react';
import dprdLogo from '../logo.png';

const envelopeTemplates = [
  { id: 1, name: 'Formal Resmi', className: 'envelope-formal' },
  { id: 2, name: 'Elegan Gold', className: 'envelope-gold' },
  { id: 3, name: 'Mega Mendung', className: 'envelope-mega' },
  { id: 4, name: 'Modern Biru', className: 'envelope-modern' },
  { id: 5, name: 'Minimalis Premium', className: 'envelope-premium' },
  { id: 6, name: 'Rapat Dinas', className: 'envelope-dinas' },
  { id: 7, name: 'Rapat Pimpinan', className: 'envelope-pimpinan' },
  { id: 8, name: 'Rapat Komisi', className: 'envelope-komisi' },
  { id: 9, name: 'Rapat Paripurna', className: 'envelope-paripurna' },
  { id: 10, name: 'VIP / Tamu Khusus', className: 'envelope-vip' }
];

function formatDate(value) {
  if (!value) return '-';
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

export default function InvitationGeneratorModal({ isOpen, onClose, activity, members, updateActivity }) {
  const [view, setView] = useState('invitation');
  const [recipientType, setRecipientType] = useState('members');
  const [envelopeTemplate, setEnvelopeTemplate] = useState(1);
  const [envelopeSide, setEnvelopeSide] = useState('front');
  const [opdRecipients, setOpdRecipients] = useState(() => activity?.invitedGuests || []);
  const [opdForm, setOpdForm] = useState({ agency: '', invitedName: '', position: '', address: '' });
  const selectedMembers = useMemo(() => {
    const ids = activity?.participantMemberIds;
    return Array.isArray(ids) ? members.filter(member => ids.includes(member.id)) : [];
  }, [activity, members]);

  if (!isOpen || !activity) return null;

  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const getQrValue = (member) => `${baseUrl}?absen=${activity.id}&token=${encodeURIComponent(`${activity.qrToken || activity.id}:${member.id}`)}`;
  const getOpdQrValue = (recipient) => `${baseUrl}?absen=${activity.id}&type=opd&guestId=${encodeURIComponent(recipient.id)}&category=OPD/INSTANSI&agency=${encodeURIComponent(recipient.agency)}&name=${encodeURIComponent(recipient.invitedName)}&position=${encodeURIComponent(recipient.position || '')}&token=${encodeURIComponent(`${activity.qrToken || activity.id}:${recipient.id}`)}`;
  const addOpdRecipient = async (event) => {
    event.preventDefault();
    if (!opdForm.agency.trim() || !opdForm.invitedName.trim()) return;
    const recipient = { ...opdForm, id: `OPD-${Date.now()}` };
    const nextRecipients = [...opdRecipients, recipient];
    setOpdRecipients(nextRecipients);
    if (updateActivity) await updateActivity(activity.id, { invitedGuests: nextRecipients });
    setOpdForm({ agency: '', invitedName: '', position: '', address: '' });
  };

  return (
    <div className="invitation-generator-modal fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[94vh] overflow-hidden text-slate-100 shadow-2xl">
        <div className="no-print flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300"><Mail className="w-5 h-5" /></div>
            <div><h2 className="font-black text-sm">Generator Undangan Anggota & OPD</h2><p className="text-[11px] text-slate-400">{recipientType === 'members' ? `${selectedMembers.length} anggota terpilih` : `${opdRecipients.length} OPD terdaftar`}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5"><Printer className="w-4 h-4" /> Cetak</button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="no-print flex gap-2 p-4 border-b border-slate-800">
          <button onClick={() => { setView('invitation'); setRecipientType('members'); }} className={`px-3 py-2 rounded-xl text-xs font-bold ${view === 'invitation' && recipientType === 'members' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}><FileText className="inline w-3.5 h-3.5 mr-1" /> Anggota DPRD</button>
          <button onClick={() => { setView('invitation'); setRecipientType('opd'); }} className={`px-3 py-2 rounded-xl text-xs font-bold ${view === 'invitation' && recipientType === 'opd' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}><Building2 className="inline w-3.5 h-3.5 mr-1" /> OPD</button>
          <button onClick={() => setView('envelope')} className={`px-3 py-2 rounded-xl text-xs font-bold ${view === 'envelope' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}><Archive className="inline w-3.5 h-3.5 mr-1" /> Cetak Amplop</button>
        </div>
        <div className="p-5 sm:p-8 overflow-y-auto max-h-[78vh] space-y-6 print:bg-white print:text-black print:max-h-none">
          {view === 'invitation' && recipientType === 'members' && selectedMembers.map(member => (
            <article key={member.id} className="invitation-page border border-slate-700 print:border-black p-6 sm:p-10 space-y-5 print:break-after-page">
              <div className="text-center border-b-2 border-slate-300 pb-4">
                <h1 className="text-base font-black uppercase">Dewan Perwakilan Rakyat Daerah</h1>
                <h2 className="text-sm font-bold">Sekretariat DPRD</h2>
                <p className="text-[10px] text-slate-500">Undangan Resmi Nomor {activity.activityNumber || activity.id}</p>
              </div>
              <div className="flex justify-between gap-5">
                <div className="text-xs leading-relaxed">
                  <p>Kepada Yth.</p><p className="font-bold">{member.jabatan} {member.name}</p><p>{member.komisi || member.fraksi}</p>
                  <p className="mt-4">Dengan hormat, kami mengundang Saudara/i untuk menghadiri:</p>
                  <p className="font-black text-sm mt-3">{activity.title}</p>
                  <p className="mt-3">Hari/Tanggal: <strong>{formatDate(activity.date)}</strong></p>
                  <p>Waktu: <strong>{activity.startTime} - {activity.endTime} WIB</strong></p>
                  <p>Tempat: <strong>{activity.locationName}</strong></p>
                </div>
                <div className="shrink-0 text-center"><QRCodeSVG value={getQrValue(member)} size={128} /><p className="text-[9px] mt-1">QR Undangan {member.id}</p></div>
              </div>
              <p className="text-xs leading-relaxed">Demikian undangan ini disampaikan. Kehadiran Saudara/i sangat diharapkan.</p>
              <div className="text-right text-xs pt-5"><p>Sekretariat DPRD</p><p className="mt-10 font-bold">Petugas Administrasi</p></div>
            </article>
          ))}
          {view === 'invitation' && recipientType === 'opd' && <div className="space-y-5">
            <form onSubmit={addOpdRecipient} className="no-print grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 rounded-2xl bg-slate-800 border border-slate-700">
              <input value={opdForm.agency} onChange={event => setOpdForm({ ...opdForm, agency: event.target.value })} placeholder="Nama instansi / OPD" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs" required />
              <input value={opdForm.invitedName} onChange={event => setOpdForm({ ...opdForm, invitedName: event.target.value })} placeholder="Nama pejabat yang diundang" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs" required />
              <input value={opdForm.position} onChange={event => setOpdForm({ ...opdForm, position: event.target.value })} placeholder="Jabatan" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs" />
              <input value={opdForm.address} onChange={event => setOpdForm({ ...opdForm, address: event.target.value })} placeholder="Alamat tujuan" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs" />
              <button className="sm:col-span-2 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold"><Plus className="inline w-3.5 h-3.5 mr-1" /> Tambahkan OPD</button>
            </form>
            {opdRecipients.map(recipient => <article key={recipient.id} className="invitation-page border border-slate-700 print:border-black p-6 sm:p-10 space-y-5 print:break-after-page">
              <div className="text-center border-b-2 border-slate-300 pb-4"><h1 className="text-base font-black uppercase">Dewan Perwakilan Rakyat Daerah</h1><h2 className="text-sm font-bold">Sekretariat DPRD</h2><p className="text-[10px] text-slate-500">Undangan Resmi Nomor {activity.activityNumber || activity.id}</p></div>
              <div className="flex justify-between gap-5"><div className="text-xs leading-relaxed"><p>Kepada Yth.</p><p className="font-bold">{recipient.invitedName}</p><p>{recipient.position || 'Pejabat/Pimpinan'} - {recipient.agency}</p><p>{recipient.address || 'Di tempat'}</p><p className="mt-5">Dengan hormat, kami mengundang Bapak/Ibu untuk menghadiri:</p><p className="font-black text-sm mt-3">{activity.title}</p><p className="mt-3">Hari/Tanggal: <strong>{formatDate(activity.date)}</strong></p><p>Waktu: <strong>{activity.startTime} - {activity.endTime} WIB</strong></p><p>Tempat: <strong>{activity.locationName}</strong></p></div><div className="shrink-0 text-center"><QRCodeSVG value={getOpdQrValue(recipient)} size={128} /><p className="text-[9px] mt-1">QR Undangan OPD</p></div></div>
              <p className="text-xs leading-relaxed">Demikian undangan ini disampaikan. Kehadiran Bapak/Ibu sangat diharapkan.</p><div className="text-right text-xs pt-5"><p>Sekretariat DPRD</p><p className="mt-10 font-bold">Petugas Administrasi</p></div>
            </article>)}
          </div>}
          {view === 'envelope' && <div className="envelope-workspace">
            <div className="no-print envelope-template-picker">
              <div className="flex items-center justify-between gap-3 mb-3"><div><p className="text-sm font-black text-white">Pilih Template Amplop</p><p className="text-[11px] text-slate-400">Gaya ini akan dipakai untuk semua penerima yang dicetak.</p></div><span className="text-[10px] text-amber-300 font-bold">{envelopeTemplates.length} pilihan</span></div>
              <div className="envelope-template-grid">{envelopeTemplates.map(template => <button type="button" key={template.id} onClick={() => setEnvelopeTemplate(template.id)} className={`envelope-template-option ${envelopeTemplate === template.id ? 'is-selected' : ''}`}><span className={`envelope-mini ${template.className}`}><span className="envelope-mini-flap" /><img src={dprdLogo} alt="" /></span><span className="envelope-template-number">{template.id}</span><span className="envelope-template-name">{template.name}</span></button>)}</div>
              <div className="envelope-side-toggle"><span className="text-[11px] font-bold text-slate-400">Sisi amplop</span><button type="button" onClick={() => setEnvelopeSide('front')} className={envelopeSide === 'front' ? 'is-active' : ''}>Depan</button><button type="button" onClick={() => setEnvelopeSide('back')} className={envelopeSide === 'back' ? 'is-active' : ''}>Belakang</button></div>
            </div>
            <div className="envelope-output-grid">{(recipientType === 'opd' ? opdRecipients : selectedMembers).map(recipient => {
            const isOpd = recipientType === 'opd';
            const template = envelopeTemplates.find(item => item.id === envelopeTemplate) || envelopeTemplates[0];
            return (
            <article key={recipient.id} className={`envelope-page ${template.className} envelope-${envelopeSide} print:break-inside-avoid`}>
              {envelopeSide === 'back' ? <><div className="envelope-back-flap" /><div className="envelope-back-seal"><img src={dprdLogo} alt="Logo DPRD" /><span>Sekretariat DPRD</span></div><div className="envelope-back-lines" /></> : <><div className="envelope-flap" /><div className="envelope-bottom-fold" /><div className="envelope-corner envelope-corner-left" /><div className="envelope-corner envelope-corner-right" /><div className="envelope-content"><img src={dprdLogo} alt="Logo DPRD" className="envelope-logo" /><p className="envelope-label">Kepada Yth.</p><h3>{isOpd ? recipient.invitedName : recipient.name}</h3><p>{isOpd ? recipient.position : recipient.jabatan}</p><p className="envelope-muted">{isOpd ? recipient.agency : `${recipient.fraksi || 'DPRD'} • ${recipient.komisi || 'Kabupaten Cirebon'}`}</p><p className="envelope-office">Sekretariat DPRD Kabupaten Cirebon</p></div></>}
            </article>);
          })}</div>
          </div>}
        </div>
      </div>
    </div>
  );
}

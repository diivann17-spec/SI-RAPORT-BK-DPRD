import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAttendance } from '../context/AttendanceContext';
import { getMemberAKDs } from '../utils/akdUtils';
import dprdLogo from '../logo.png';
import { CheckSquare, Filter, Printer, QrCode, Search, Square, UserRound } from 'lucide-react';

const MEMBER_QR_PREFIX = 'MEMBER:';

function memberQrValue(member) {
  return `${MEMBER_QR_PREFIX}${member.id}`;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function DigitalMemberCard({ member }) {
  const akds = getMemberAKDs(member);

  return (
    <article className="digital-member-card relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-slate-300 bg-white text-slate-900">
      <div className="flex items-center justify-between border-b border-emerald-800 bg-emerald-950 px-3 py-2 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <img src={dprdLogo} alt="Logo DPRD" className="h-8 w-8 object-contain" />
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-300">SI-RAPORT BK DPRD</p>
            <p className="truncate text-[10px] font-black uppercase">Kartu QR Digital Anggota</p>
          </div>
        </div>
        <QrCode className="h-5 w-5 shrink-0 text-amber-300" />
      </div>

      <div className="flex flex-1 gap-3 p-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-14 w-11 shrink-0 overflow-hidden rounded border border-slate-300 bg-slate-100">
              {member.photo ? <img src={member.photo} alt={member.name} className="h-full w-full object-cover" /> : <UserRound className="m-auto h-full w-6 text-slate-400" />}
            </div>
            <div className="min-w-0">
              <h2 className="break-words text-[11px] font-black leading-tight">{member.name}</h2>
              <p className="mt-1 text-[9px] font-semibold text-slate-600">{member.jabatan || 'Anggota DPRD'}</p>
            </div>
          </div>
          <dl className="space-y-1.5 text-[9px] leading-tight">
            <div><dt className="inline text-slate-500">Fraksi: </dt><dd className="inline font-bold">{member.fraksi || '-'}</dd></div>
            <div>
              <dt className="mb-1 block text-slate-500">Keanggotaan AKD:</dt>
              <dd className="flex flex-wrap gap-1">
                {akds.length ? akds.map(akd => <span key={akd} className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-900">{akd}</span>) : <span className="text-slate-500">Belum diatur</span>}
              </dd>
            </div>
            <div><dt className="inline text-slate-500">ID: </dt><dd className="inline font-mono font-bold">{member.id}</dd></div>
          </dl>
        </div>

        <div className="flex w-[82px] shrink-0 flex-col items-center justify-center">
          <div className="rounded border border-slate-300 bg-white p-1">
            <QRCodeSVG value={memberQrValue(member)} size={72} level="M" includeMargin />
          </div>
          <p className="mt-1 text-center text-[7px] font-bold uppercase leading-tight text-emerald-900">QR Anggota<br />Absensi & Verifikasi</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-3 py-1.5 text-[8px]">
        <span className={`font-black uppercase ${member.statusActive === false ? 'text-rose-700' : 'text-emerald-700'}`}>
          {member.statusActive === false ? 'Tidak Aktif' : 'Aktif'}
        </span>
        <span className="font-mono text-slate-500">QR ANGGOTA • BUKAN QR AGENDA</span>
      </div>
    </article>
  );
}

function DigitalMemberCardBack({ member }) {
  return (
    <article className="digital-member-card digital-member-card-back relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-slate-300 bg-white text-slate-900">
      <div className="border-b border-emerald-800 bg-emerald-950 px-4 py-3 text-white">
        <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-300">SI-RAPORT BK DPRD</p>
        <h2 className="mt-1 text-[13px] font-black uppercase tracking-wide">Ketentuan Kartu QR Digital</h2>
      </div>
      <div className="flex flex-1 flex-col justify-between p-4 text-[9px] leading-relaxed">
        <div>
          <p className="mb-2 font-bold text-slate-800">Kartu ini digunakan untuk:</p>
          <ol className="list-decimal space-y-1 pl-4 text-slate-600">
            <li>Identifikasi anggota pada proses absensi.</li>
            <li>Verifikasi data melalui sistem SI-RAPORT.</li>
            <li>Check-in dan check-out pada agenda terpilih.</li>
          </ol>
          <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-[8px] text-amber-900">
            <strong>Catatan penting:</strong> QR Anggota hanya mengenali identitas anggota. QR Agenda tetap digunakan untuk mengenali agenda rapat.
          </div>
        </div>
        <div className="border-t border-slate-200 pt-2 text-[8px] text-slate-500">
          <p className="font-bold text-slate-700">{member.name}</p>
          <p>ID Anggota: <span className="font-mono">{member.id}</span></p>
          <p className="mt-1">Apabila kartu hilang, laporkan kepada Sekretariat DPRD Kabupaten Cirebon.</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-[8px] font-bold text-slate-500">
        <span>KARTU DIGITAL RESMI</span>
        <span>BUKAN QR AGENDA</span>
      </div>
    </article>
  );
}

export default function MemberQRCard() {
  const { members, activeMemberId, isAdmin, isBK, currentRole } = useAttendance();
  const [mode, setMode] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState(() => activeMemberId ? [activeMemberId] : []);
  const [filterFraksi, setFilterFraksi] = useState('ALL');
  const [filterAKD, setFilterAKD] = useState('ALL');
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState('6');

  const fraksiOptions = useMemo(() => uniqueValues(members.map(member => member.fraksi)), [members]);
  const akdOptions = useMemo(() => uniqueValues(members.flatMap(member => getMemberAKDs(member))), [members]);

  const filteredMembers = useMemo(() => members.filter(member => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [member.name, member.id, member.nip, member.fraksi].some(value => String(value || '').toLowerCase().includes(query));
    const matchesFraksi = filterFraksi === 'ALL' || member.fraksi === filterFraksi;
    const matchesAKD = filterAKD === 'ALL' || getMemberAKDs(member).some(akd => akd.toLowerCase() === filterAKD.toLowerCase());
    return matchesSearch && matchesFraksi && matchesAKD;
  }), [members, search, filterFraksi, filterAKD]);

  const printableMembers = mode === 'SELECTED'
    ? members.filter(member => selectedIds.includes(member.id))
    : filteredMembers;

  const toggleMember = (memberId) => {
    setSelectedIds(previous => previous.includes(memberId)
      ? previous.filter(id => id !== memberId)
      : [...previous, memberId]);
  };

  const selectFiltered = () => setSelectedIds(previous => [...new Set([...previous, ...filteredMembers.map(member => member.id)])]);
  const clearSelection = () => setSelectedIds([]);
  const handlePrint = () => {
    if (printableMembers.length) window.print();
  };
  const isOperator = isAdmin || isBK || currentRole === 'PETUGAS_SCAN';

  return (
    <div className="space-y-5">
      <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white"><QrCode className="h-5 w-5 text-emerald-600" /> Kartu QR Digital Anggota DPRD</h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">QR unik berbasis ID anggota untuk identifikasi absensi dan verifikasi. QR Agenda tetap digunakan untuk mengenali agenda.</p>
          </div>
          <button onClick={handlePrint} disabled={!printableMembers.length} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white shadow hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"><Printer className="h-4 w-4" /> Cetak Kartu QR Digital</button>
        </div>

        <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-5">
          <label className="relative sm:col-span-2 lg:col-span-1"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nama / ID" className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-2 text-xs dark:border-slate-700 dark:bg-slate-800" /></label>
          <select value={mode} onChange={event => setMode(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"><option value="ALL">Cetak semua anggota</option><option value="SELECTED">Cetak anggota terpilih</option></select>
          <select value={filterFraksi} onChange={event => setFilterFraksi(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="ALL">Semua fraksi</option>{fraksiOptions.map(value => <option key={value} value={value}>{value}</option>)}</select>
          <select value={filterAKD} onChange={event => setFilterAKD(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="ALL">Semua Komisi / AKD</option>{akdOptions.map(value => <option key={value} value={value}>{value}</option>)}</select>
          <select value={layout} onChange={event => setLayout(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"><option value="5">Layout 5 kartu / F4</option><option value="6">Layout 6 kartu / F4</option></select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-bold text-slate-600 dark:text-slate-300"><Filter className="mr-1 inline h-3.5 w-3.5" />{printableMembers.length} kartu siap dicetak</span>
          <button onClick={selectFiltered} className="rounded-lg border border-slate-300 px-2 py-1 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"><CheckSquare className="mr-1 inline h-3.5 w-3.5" />Pilih hasil filter</button>
          <button onClick={clearSelection} className="rounded-lg border border-slate-300 px-2 py-1 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"><Square className="mr-1 inline h-3.5 w-3.5" />Kosongkan pilihan</button>
          <span className="text-slate-500">Simpan sebagai PDF: pilih printer “Save as PDF” dan ukuran kertas F4.</span>
        </div>
      </section>

      {isOperator && mode === 'SELECTED' && (
        <section className="no-print grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map(member => (
            <label key={member.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs ${selectedIds.includes(member.id) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
              <input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => toggleMember(member.id)} className="h-4 w-4 accent-emerald-600" />
              <span className="min-w-0"><strong className="block truncate">{member.name}</strong><span className="text-slate-500">{member.fraksi || '-'} • {member.id}</span></span>
            </label>
          ))}
        </section>
      )}

      <div className="no-print text-xs font-black uppercase tracking-wider text-slate-500">Tampilan depan kartu</div>
      <section className={`digital-card-print-page digital-card-grid cards-per-${layout}`}>
        {printableMembers.length ? printableMembers.map(member => <DigitalMemberCard key={member.id} member={member} />) : <div className="no-print col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Belum ada anggota yang dipilih untuk dicetak.</div>}
      </section>

      {printableMembers.length > 0 && (
        <>
          <div className="no-print text-xs font-black uppercase tracking-wider text-slate-500">Tampilan belakang kartu</div>
          <section className={`digital-card-print-page digital-card-grid cards-per-${layout}`}>
            {printableMembers.map(member => <DigitalMemberCardBack key={`back-${member.id}`} member={member} />)}
          </section>
        </>
      )}
    </div>
  );
}

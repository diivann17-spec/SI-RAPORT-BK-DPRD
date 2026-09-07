import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAttendance } from '../context/AttendanceContext';
import dprdLogo from '../logo.png';
import {
  CreditCard,
  Download,
  Printer,
  ShieldCheck,
  QrCode
} from 'lucide-react';

export default function MemberQRCard() {
  const { activeMemberId, getMemberById, members, setActiveMemberId, currentRole, isAdmin, isBK } = useAttendance();

  const isOperatorOrAdmin = isAdmin || isBK || currentRole === 'PETUGAS_SCAN';
  const member = getMemberById(activeMemberId) || members[0];
  const cardRef = useRef(null);

  const handlePrintCard = () => {
    window.print();
  };

  if (!member) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600 dark:text-slate-300 font-bold text-sm">Data Anggota DPRD belum tersedia.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Selector Box: Only visible for Admin, BK, or Petugas Scan */}
      {isOperatorOrAdmin ? (
        <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Kartu Anggota DPRD:</span>
            <p className="text-[11px] text-slate-400">Mode Admin / BK: Anda dapat memilih dan mencetak kartu anggota manapun.</p>
          </div>
          <select
            value={activeMemberId}
            onChange={(e) => setActiveMemberId(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-bold text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700"
          >
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.fraksi.replace('Fraksi ', '')})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="no-print bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-800/60 shadow-sm text-xs text-emerald-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Kartu Identitas Digital Resmi Anda (Gunakan QR Code ini saat presensi rapat dengan laptop operator).</span>
        </div>
      )}

      {/* Official Digital ID Card Container */}
      <div
        ref={cardRef}
        className="print-page bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-white rounded-3xl p-6 shadow-2xl border-2 border-emerald-500/40 relative overflow-hidden space-y-6"
      >
        {/* Background Decorative Seals */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Card Header Kop */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 flex items-center justify-center">
              <img
                src={dprdLogo}
                alt="Logo DPRD"
                className="w-11 h-11 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wider text-emerald-400 uppercase">DEWAN PERWAKILAN RAKYAT DAERAH</h3>
              <p className="text-[10px] text-slate-300 tracking-wide">KARTU IDENTITAS DIGITAL ANGGOTA DPRD & QR PRESENSI</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold border border-amber-500/40">
            OFFICIAL ID
          </span>
        </div>

        {/* Main Card Body */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center relative z-10">
          
          {/* Member Photo */}
          <div className="flex flex-col items-center text-center space-y-2">
            <img
              src={member.photo}
              alt={member.name}
              className="w-28 h-36 rounded-2xl object-cover border-2 border-emerald-400 shadow-xl"
            />
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-800">
              ID: {member.id}
            </span>
          </div>

          {/* Member Bio details */}
          <div className="sm:col-span-2 space-y-3">
            <div>
              <h2 className="text-base font-black text-white leading-snug">{member.name}</h2>
              <p className="text-xs text-emerald-400 font-medium">{member.jabatan}</p>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between border-b border-slate-800/80 pb-1">
                <span className="text-slate-400">NIP / No. Induk:</span>
                <span className="font-mono text-slate-200 font-bold">{member.nip}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1">
                <span className="text-slate-400">Fraksi:</span>
                <span className="font-semibold text-slate-200">{member.fraksi}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1">
                <span className="text-slate-400">Komisi:</span>
                <span className="font-semibold text-slate-200">{member.komisi}</span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="p-3 bg-white rounded-2xl border border-emerald-500/30 flex items-center justify-between text-slate-900 shadow-lg">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">QR Presensi Laptop</span>
                <p className="text-[10px] text-slate-500">Tunjukkan QR ke Kamera Laptop Petugas</p>
                <p className="font-mono text-[9px] text-slate-400 truncate max-w-[150px]">{member.qrToken}</p>
              </div>
              <QRCodeSVG
                value={member.qrToken}
                size={80}
                bgColor={"#ffffff"}
                fgColor={"#0f172a"}
                level={"H"}
                includeMargin={false}
              />
            </div>

          </div>

        </div>

        {/* Card Footer Security Tag */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 relative z-10">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Terverifikasi Sistem SI-RAPORT BK DPRD</span>
          </span>
          <span className="font-mono">VALID PERIODE 2026</span>
        </div>

      </div>

      {/* Action buttons */}
      <div className="no-print flex justify-center space-x-4">
        <button
          onClick={handlePrintCard}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Kartu Identitas Digital</span>
        </button>
      </div>

    </div>
  );
}

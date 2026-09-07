import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAttendance } from '../context/AttendanceContext';
import dprdLogo from '../logo.png';
import {
  CreditCard,
  Download,
  Printer,
  ShieldCheck,
  QrCode,
  Info,
  CheckCircle2
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
    <div className="max-w-xl mx-auto space-y-4 sm:space-y-6">
      
      {/* Selector Box: Only visible for Admin, BK, or Petugas Scan */}
      {isOperatorOrAdmin ? (
        <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Kartu Anggota DPRD:</span>
            <p className="text-[11px] text-slate-400">Pilih anggota untuk menampilkan atau mencetak kartu.</p>
          </div>
          <select
            value={activeMemberId}
            onChange={(e) => setActiveMemberId(e.target.value)}
            className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-bold text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700"
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
          <span>Kartu Identitas Digital Resmi Anda (Tunjukkan QR Code saat presensi).</span>
        </div>
      )}

      {/* ── MOBILE-OPTIMIZED DIGITAL CARD (Sesuai Mockup Mobile Screen 5) ── */}
      <div
        ref={cardRef}
        className="print-page bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-emerald-500/40 relative overflow-hidden space-y-5"
      >
        {/* Decorative Ambient Glow */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Card Title Kop */}
        <div className="text-center space-y-1 relative z-10 border-b border-slate-800 pb-3">
          <h3 className="font-extrabold text-sm sm:text-base text-emerald-400 tracking-wide uppercase">
            Kartu QR Digital Anggota
          </h3>
          <p className="text-[10px] text-slate-400">
            DPRD Kabupaten Cirebon • Masa Jabatan 2024–2029
          </p>
        </div>

        {/* Big Clean White QR Container (Centerpiece on Mobile) */}
        <div className="bg-white rounded-3xl p-6 text-slate-900 text-center shadow-2xl max-w-xs mx-auto space-y-4 relative z-10">
          <div className="flex justify-center p-2">
            <QRCodeSVG
              value={member.qrToken || `QR-${member.id}`}
              size={180}
              bgColor={"#ffffff"}
              fgColor={"#0f172a"}
              level={"H"}
              includeMargin={false}
            />
          </div>

          <div className="space-y-1">
            <h4 className="font-black text-sm text-slate-900 leading-snug">
              {member.name}
            </h4>
            <p className="text-[11px] font-bold text-emerald-700">
              {member.jabatan || 'Anggota DPRD'}
            </p>
            <p className="text-[10px] text-slate-500">
              {member.fraksi} • {member.komisi}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Aktif</span>
          </div>
        </div>

        {/* Info Note under QR Card (Sesuai Mockup Screen 5) */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5 relative z-10">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-slate-300">
            Kode QR ini digunakan untuk keperluan absensi dan verifikasi digital resmi Badan Kehormatan (BK) DPRD Kabupaten Cirebon.
          </p>
        </div>

        {/* Card Security Tag */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 relative z-10">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SI-RAPORT BK DPRD</span>
          </span>
          <span className="font-mono text-slate-400">NIP: {member.nip || '—'}</span>
        </div>

      </div>

      {/* Action buttons */}
      <div className="no-print flex justify-center space-x-4">
        <button
          onClick={handlePrintCard}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-950 transition active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>Simpan / Cetak Kartu QR</span>
        </button>
      </div>

    </div>
  );
}

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAttendance } from '../context/AttendanceContext';
import dprdLogo from '../logo.png';
import {
  CreditCard,
  Printer,
  ShieldCheck,
  User,
  Building2,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';

export default function MemberQRCard() {
  const { activeMemberId, getMemberById, members, setActiveMemberId, currentRole, isAdmin, isBK, currentUser } = useAttendance();

  // Mode tab: 'MEMBER_CARD' (Kartu Anggota) or 'OFFICER_ID' (ID Card Petugas)
  const [activeCardType, setActiveCardType] = useState('MEMBER_CARD');
  
  // Member selected
  const member = getMemberById(activeMemberId) || members[0];
  const isOperatorOrAdmin = isAdmin || isBK || currentRole === 'PETUGAS_SCAN';

  // Officer / Petugas data
  const officerName = currentUser?.name || 'Dede Ahmad Rivandi';
  const officerRole = currentUser?.roleLabel || (currentRole === 'PETUGAS_BK' ? 'Badan Kehormatan (BK)' : currentRole === 'PETUGAS_SCAN' ? 'Petugas / Admin' : 'Admin Sekretariat');
  const officerId = 'BKD-2025001';

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* ── CARD TYPE SELECTOR & MEMBER SELECTOR (No Print) ── */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-amber-400" />
              <span>Cetak Kartu Identitas & Presensi Resmi</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Format Standar CR-80 (86 x 54 mm) - Siap Cetak Kertas / PVC / PDF Tanpa Pecah.
            </p>
          </div>

          {/* Type Switcher Buttons */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveCardType('MEMBER_CARD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeCardType === 'MEMBER_CARD'
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Kartu Anggota DPRD</span>
            </button>
            <button
              onClick={() => setActiveCardType('OFFICER_ID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeCardType === 'OFFICER_ID'
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>ID Card Petugas</span>
            </button>
          </div>
        </div>

        {/* Member Selector dropdown (only for Member Card & Admin/BK/Operator) */}
        {activeCardType === 'MEMBER_CARD' && isOperatorOrAdmin && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Anggota Dewan:</span>
            <select
              value={activeMemberId}
              onChange={(e) => setActiveMemberId(e.target.value)}
              className="w-full sm:w-80 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.fraksi.replace('Fraksi ', '')})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tips Cetak */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span><strong>Panduan Cetak PDF:</strong> Pilih ukuran kertas <strong>A4</strong>, skala <strong>100% (Default)</strong>, dan centang <strong>"Background Graphics"</strong>.</span>
          </div>
          <button
            onClick={handlePrintCard}
            className="px-4 py-2 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF Sekarang</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          1. KARTU ANGGOTA DPRD (DEPAN & BELAKANG) - STANDAR UKURAN CR80 (86 x 54 mm)
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeCardType === 'MEMBER_CARD' && (
        <div className="id-card-print-sheet space-y-6 md:space-y-0 md:flex md:flex-row md:flex-wrap md:justify-center md:gap-8">
          
          {/* ── KARTU ANGGOTA DPRD (DEPAN) ── */}
          <div className="space-y-2 flex flex-col items-center">
            <div className="no-print flex items-center justify-between w-full max-w-[380px] text-xs font-extrabold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Kartu Anggota DPRD (Depan)
              </span>
              <span className="text-[10px] text-slate-400">86 mm x 54 mm</span>
            </div>

            {/* CARD CONTAINER FIXED RATIO & SIZE */}
            <div
              className="id-card-box-horizontal w-[360px] h-[225px] sm:w-[380px] sm:h-[238px] text-white rounded-2xl p-3.5 shadow-2xl border border-amber-500/50 relative overflow-hidden flex flex-col justify-between"
              style={{
                backgroundColor: '#0a192f',
                backgroundImage: 'linear-gradient(135deg, #0c2340 0%, #102a4e 50%, #081526 100%)',
                color: '#ffffff'
              }}
            >
              {/* Gold gradient top decorative line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500"></div>

              {/* Header: Logo & Title */}
              <div className="flex items-center justify-between border-b border-amber-500/40 pb-1.5 relative z-10">
                <div className="flex items-center space-x-2">
                  <img src={dprdLogo} alt="Logo DPRD" className="w-8 h-8 object-contain" />
                  <div>
                    <h3 className="font-black text-[11px] tracking-wider text-white uppercase leading-none">DPRD</h3>
                    <p className="text-[8px] font-bold text-amber-400 tracking-wider uppercase">KABUPATEN CIREBON</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[7.5px] font-extrabold tracking-widest text-amber-300 uppercase block">KARTU ANGGOTA DPRD</span>
                  <span className="text-[7.5px] text-slate-300 font-medium">Periode 2024 - 2029</span>
                </div>
              </div>

              {/* Body: Photo & Member Details */}
              <div className="flex items-center space-x-3 my-1 relative z-10">
                <div className="w-16 h-20 rounded-lg overflow-hidden border-2 border-amber-400/90 shadow-md shrink-0 bg-slate-800">
                  <img
                    src={member?.photo}
                    alt={member?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <h4 className="font-black text-[11px] sm:text-xs text-white leading-tight truncate">
                    {member?.name}
                  </h4>
                  <div className="grid grid-cols-[45px_4px_1fr] text-[8.5px] sm:text-[9px] text-slate-200 leading-tight">
                    <span className="text-slate-400">Fraksi</span>
                    <span>:</span>
                    <span className="font-semibold truncate text-slate-100">{member?.fraksi}</span>

                    <span className="text-slate-400">Komisi</span>
                    <span>:</span>
                    <span className="font-semibold truncate text-slate-100">{member?.komisi}</span>

                    <span className="text-slate-400">Jabatan</span>
                    <span>:</span>
                    <span className="font-semibold truncate text-slate-100">{member?.jabatan || 'Anggota DPRD'}</span>

                    <span className="text-slate-400">No. Anggota</span>
                    <span>:</span>
                    <span className="font-mono font-bold text-amber-300">{member?.nip ? member.nip.slice(-4) : '3201'}</span>
                  </div>
                </div>
              </div>

              {/* Footer: Barcode & Slogan */}
              <div className="pt-1.5 border-t border-slate-700/80 flex items-center justify-between relative z-10">
                {/* Visual Barcode Pattern */}
                <div className="bg-white px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                  <div className="h-3 w-1 bg-black"></div>
                  <div className="h-3 w-0.5 bg-black"></div>
                  <div className="h-3 w-1.5 bg-black"></div>
                  <div className="h-3 w-0.5 bg-black"></div>
                  <div className="h-3 w-1 bg-black"></div>
                  <div className="h-3 w-1.5 bg-black"></div>
                  <div className="h-3 w-0.5 bg-black"></div>
                  <div className="h-3 w-1 bg-black"></div>
                  <div className="h-3 w-0.5 bg-black"></div>
                  <div className="h-3 w-1 bg-black"></div>
                </div>
                <div className="text-right">
                  <span className="font-serif italic text-[8px] text-amber-300 font-medium">
                    Bersama Rakyat Membangun Daerah
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* ── KARTU ANGGOTA DPRD (BELAKANG) ── */}
          <div className="space-y-2 flex flex-col items-center">
            <div className="no-print flex items-center justify-between w-full max-w-[380px] text-xs font-extrabold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                Kartu Anggota DPRD (Belakang)
              </span>
              <span className="text-[10px] text-slate-400">86 mm x 54 mm</span>
            </div>

            {/* CARD CONTAINER FIXED RATIO & SIZE */}
            <div
              className="id-card-box-horizontal w-[360px] h-[225px] sm:w-[380px] sm:h-[238px] text-white rounded-2xl p-3.5 shadow-2xl border border-amber-500/50 relative overflow-hidden flex flex-col justify-between"
              style={{
                backgroundColor: '#071324',
                backgroundImage: 'linear-gradient(135deg, #0c2340 0%, #0f294a 50%, #071324 100%)',
                color: '#ffffff'
              }}
            >
              {/* Gold gradient top decorative line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500"></div>

              {/* Header: Logo & QR Scan Box */}
              <div className="flex items-start justify-between border-b border-amber-500/40 pb-1.5 relative z-10">
                <div className="flex items-center space-x-2">
                  <img src={dprdLogo} alt="Logo DPRD" className="w-7 h-7 object-contain" />
                  <div>
                    <h4 className="font-black text-[10px] text-white uppercase leading-none">DPRD</h4>
                    <p className="text-[7.5px] font-bold text-amber-400 uppercase">KABUPATEN CIREBON</p>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="p-0.5 rounded bg-white">
                    <QRCodeSVG
                      value={member?.qrToken || `QR-${member?.id}`}
                      size={40}
                      level="M"
                    />
                  </div>
                  <span className="text-[6.5px] text-slate-300 mt-0.5 font-medium">Verifikasi Anggota</span>
                </div>
              </div>

              {/* Terms of Use / Ketentuan Penggunaan */}
              <div className="my-1 space-y-0.5 text-[7.5px] sm:text-[8px] text-slate-200 leading-tight relative z-10">
                <p className="font-extrabold text-amber-300 text-[8px] uppercase tracking-wide">
                  KETENTUAN PENGGUNAAN :
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-300">
                  <li>Kartu ini adalah identitas resmi anggota DPRD Kabupaten Cirebon.</li>
                  <li>Wajib dibawa dan digunakan dalam setiap kegiatan kedewanan.</li>
                  <li>Tidak dapat dipindahtangankan kepada pihak lain.</li>
                  <li>Apabila hilang, segera melapor ke Sekretariat DPRD.</li>
                </ol>
              </div>

              {/* Footer Address */}
              <div className="pt-1 border-t border-slate-700/80 flex items-center justify-between text-[7.5px] text-slate-400 relative z-10">
                <div>
                  <p className="font-bold text-slate-200">Sekretariat DPRD Kabupaten Cirebon</p>
                  <p className="text-[7px]">Jl. Sunan Gunung Jati No. 7 Sumber - Cirebon</p>
                </div>
                <span className="font-mono text-[6.5px] text-amber-400">SI-RAPORT BK DPRD</span>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          2. ID CARD PETUGAS (DEPAN & BELAKANG) - FORMAT VERTIKAL LANYARD
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeCardType === 'OFFICER_ID' && (
        <div className="id-card-print-sheet space-y-6 md:space-y-0 md:flex md:flex-row md:flex-wrap md:justify-center md:gap-8">
          
          {/* ── ID CARD PETUGAS (DEPAN) ── */}
          <div className="space-y-2 flex flex-col items-center">
            <div className="no-print flex items-center justify-between w-full max-w-[260px] text-xs font-extrabold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                ID Card Petugas (Depan)
              </span>
              <span className="text-[10px] text-slate-400">54 mm x 86 mm</span>
            </div>

            {/* Lanyard Slot */}
            <div className="no-print flex justify-center -mb-2.5 relative z-20">
              <div className="w-10 h-3 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center">
                <div className="w-5 h-0.5 bg-slate-950 rounded-full"></div>
              </div>
            </div>

            {/* CARD CONTAINER FIXED RATIO & SIZE */}
            <div
              className="id-card-box-vertical w-[250px] h-[380px] text-white rounded-3xl p-4 shadow-2xl border border-amber-500/50 relative overflow-hidden flex flex-col justify-between text-center"
              style={{
                backgroundColor: '#081526',
                backgroundImage: 'linear-gradient(180deg, #0a1b33 0%, #0c2340 50%, #081526 100%)',
                color: '#ffffff'
              }}
            >
              {/* Top Accent */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500"></div>

              {/* Header */}
              <div className="space-y-0.5 relative z-10 pt-1">
                <img src={dprdLogo} alt="Logo DPRD" className="w-9 h-9 object-contain mx-auto" />
                <h4 className="font-black text-[9px] tracking-wider text-white uppercase leading-none">DPRD KABUPATEN CIREBON</h4>
                <div className="inline-block px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-[8px] tracking-wider uppercase mt-0.5">
                  SI-RAPORT BK DPRD
                </div>
              </div>

              {/* Photo Petugas */}
              <div className="my-1 relative z-10 flex flex-col items-center">
                <div className="w-18 h-22 rounded-xl overflow-hidden border-2 border-amber-400 shadow-lg bg-slate-800">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
                    alt={officerName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-black text-[11px] text-white mt-1.5 leading-tight">
                  {officerName}
                </h3>
                <p className="text-[9px] font-bold text-amber-300">
                  {officerRole}
                </p>
              </div>

              {/* QR Code & ID */}
              <div className="space-y-1 relative z-10 flex flex-col items-center">
                <div className="p-0.5 rounded bg-white shadow">
                  <QRCodeSVG
                    value={`PETUGAS-OFFICER-AUTH-${officerId}`}
                    size={48}
                    level="M"
                  />
                </div>
                <p className="font-mono text-[8px] text-slate-300 font-bold">ID : {officerId}</p>
              </div>

              {/* Footer Validity */}
              <div className="pt-1 border-t border-slate-700/80 flex items-center justify-between text-[7px] text-slate-400 relative z-10">
                <span>Berlaku s.d</span>
                <span className="font-bold text-slate-200">31 Des 2026</span>
              </div>

            </div>
          </div>

          {/* ── ID CARD PETUGAS (BELAKANG) ── */}
          <div className="space-y-2 flex flex-col items-center">
            <div className="no-print flex items-center justify-between w-full max-w-[260px] text-xs font-extrabold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                ID Card Petugas (Belakang)
              </span>
              <span className="text-[10px] text-slate-400">54 mm x 86 mm</span>
            </div>

            {/* Lanyard Slot */}
            <div className="no-print flex justify-center -mb-2.5 relative z-20">
              <div className="w-10 h-3 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center">
                <div className="w-5 h-0.5 bg-slate-950 rounded-full"></div>
              </div>
            </div>

            {/* CARD CONTAINER FIXED RATIO & SIZE */}
            <div
              className="id-card-box-vertical w-[250px] h-[380px] text-white rounded-3xl p-4 shadow-2xl border border-amber-500/50 relative overflow-hidden flex flex-col justify-between"
              style={{
                backgroundColor: '#081526',
                backgroundImage: 'linear-gradient(180deg, #0a1b33 0%, #0c2340 50%, #081526 100%)',
                color: '#ffffff'
              }}
            >
              {/* Top Accent */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500"></div>

              {/* Header */}
              <div className="text-center space-y-0.5 relative z-10 border-b border-amber-500/30 pb-1 pt-1">
                <img src={dprdLogo} alt="Logo DPRD" className="w-7 h-7 object-contain mx-auto" />
                <h4 className="font-black text-[8.5px] tracking-wider text-white uppercase">DPRD KABUPATEN CIREBON</h4>
              </div>

              {/* Detailed Information */}
              <div className="space-y-1.5 text-left text-[8.5px] relative z-10 my-1">
                <div className="flex items-start space-x-2">
                  <User className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[7px] text-slate-400 block uppercase">Nama Petugas</span>
                    <span className="font-bold text-white">{officerName}</span>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <CreditCard className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[7px] text-slate-400 block uppercase">NIP / Identitas</span>
                    <span className="font-mono text-slate-200">-</span>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[7px] text-slate-400 block uppercase">Jabatan</span>
                    <span className="font-bold text-white">{officerRole}</span>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[7px] text-slate-400 block uppercase">Unit Kerja</span>
                    <span className="text-slate-200">BK DPRD Kabupaten Cirebon</span>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[7px] text-slate-400 block uppercase">Masa Berlaku</span>
                    <span className="text-slate-200">01 Jan 2025 – 31 Des 2026</span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center relative z-10">
                <div className="p-0.5 rounded bg-white shadow">
                  <QRCodeSVG
                    value={`VERIFIKASI-ID-CARD-PETUGAS-${officerId}`}
                    size={44}
                    level="M"
                  />
                </div>
                <span className="text-[6.5px] text-slate-300 mt-0.5">Scan verifikasi keaslian</span>
              </div>

              {/* Footer */}
              <div className="pt-1 border-t border-slate-700/80 flex items-center justify-between text-[7px] text-slate-400 relative z-10">
                <div>
                  <span className="font-bold text-amber-400 block">SI-RAPORT BK DPRD</span>
                </div>
                <div className="text-right italic font-serif text-[7px] text-amber-300">
                  Integritas • Profesional
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}

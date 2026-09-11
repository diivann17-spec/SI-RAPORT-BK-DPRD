import React, { useMemo, useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { AKD_CATEGORIES, matchAKDCategory } from '../utils/akdUtils';
import { Search, Filter, Download, Eye, X, FileText, Image as ImageIcon, FolderArchive, CalendarDays } from 'lucide-react';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${dateString}T00:00:00`));
};

export default function ArchiveCenter() {
  const { activities } = useAttendance();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [previewDoc, setPreviewDoc] = useState(null);

  const years = useMemo(() => {
    const set = new Set(
      activities
        .map(activity => activity.date)
        .filter(Boolean)
        .map(date => new Date(`${date}T00:00:00`).getFullYear())
    );

    return Array.from(set).sort((a, b) => b - a);
  }, [activities]);

  const archiveEntries = useMemo(() => {
    return activities
      .map(activity => {
        const attachments = Array.isArray(activity.lpjSummary?.attachments) ? activity.lpjSummary.attachments : [];
        const photos = Array.isArray(activity.lpjSummary?.documentationPhotos) ? activity.lpjSummary.documentationPhotos : [];

        const docs = [
          ...attachments.map((file, index) => ({
            id: `${activity.id}-file-${index}`,
            type: file.type?.startsWith('image/') ? 'FOTO' : 'DOKUMEN',
            name: file.name || `Dokumen ${index + 1}`,
            dataUrl: file.dataUrl,
            mimeType: file.type || '',
            size: file.size,
            label: 'Dokumen LPJ',
            source: 'arsip-dokumen'
          })),
          ...photos.map((photo, index) => ({
            id: `${activity.id}-photo-${index}`,
            type: 'FOTO',
            name: `Dokumentasi Foto ${index + 1}`,
            dataUrl: typeof photo === 'string' ? photo : photo.dataUrl,
            mimeType: 'image/*',
            size: null,
            label: photo.isPrimary ? 'Foto Utama' : 'Dokumentasi Kegiatan',
            source: 'dokumentasi'
          }))
        ];

        return {
          id: activity.id,
          activity,
          docs
        };
      })
      .filter(entry => {
        const term = search.trim().toLowerCase();
        const matchesSearch = !term ||
          entry.activity.title.toLowerCase().includes(term) ||
          entry.docs.some(doc => doc.name.toLowerCase().includes(term));

        const matchesType = selectedType === 'ALL' || entry.docs.some(doc => doc.type === selectedType);
        const matchesCategory = selectedCategory === 'ALL' || matchAKDCategory(entry.activity.category, selectedCategory);
        const matchesYear = selectedYear === 'ALL' || new Date(`${entry.activity.date}T00:00:00`).getFullYear() === Number(selectedYear);

        return matchesSearch && matchesType && matchesCategory && matchesYear;
      });
  }, [activities, search, selectedType, selectedCategory, selectedYear]);

  const totalDocs = archiveEntries.reduce((sum, entry) => sum + entry.docs.length, 0);

  const isPreviewable = previewDoc?.type === 'FOTO' || previewDoc?.mimeType === 'application/pdf' || previewDoc?.name?.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-400">Arsip Digital</p>
            <h1 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Dokumen & Dokumentasi Agenda</h1>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-100 px-3 py-2 dark:bg-slate-800">
            <FolderArchive className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{totalDocs} dokumen tersimpan</span>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari agenda atau dokumen..."
              className="w-full rounded-xl border border-slate-700 bg-slate-100 py-2 pl-9 pr-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {['ALL', ...AKD_CATEGORIES.filter(item => item !== 'ALL')].map(category => (
              <option key={category} value={category}>{category === 'ALL' ? 'Semua AKD' : category}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">Semua Tahun</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">Semua Jenis</option>
            <option value="DOKUMEN">Dokumen</option>
            <option value="FOTO">Foto</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {archiveEntries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
            Tidak ada dokumen arsip yang cocok dengan filter saat ini.
          </div>
        ) : (
          archiveEntries.map(({ activity, docs }) => (
            <div key={activity.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-400">{activity.category}</p>
                  <h2 className="mt-1 text-base font-black text-slate-900 dark:text-white">{activity.title}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                    {formatDate(activity.date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-cyan-400" />
                    {activity.locationName || activity.roomName || '-'}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {docs.map(doc => (
                  <div key={doc.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-300">
                        {doc.type === 'FOTO' ? <ImageIcon className="w-4 h-4 text-cyan-400" /> : <FileText className="w-4 h-4 text-emerald-400" />}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{doc.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                          <span>{doc.type}</span>
                          <span>•</span>
                          <span>{doc.label}</span>
                          {doc.size && <><span>•</span><span>{Math.round(doc.size / 1024)} KB</span></>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {doc.dataUrl ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ ...doc, activityTitle: activity.title })}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-bold text-cyan-300"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Lihat
                          </button>
                          <a
                            href={doc.dataUrl}
                            download={doc.name}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </a>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-500">Belum tersedia</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black text-white">{previewDoc.name}</h2>
                <p className="truncate text-[10px] text-slate-400">{previewDoc.activityTitle} • {previewDoc.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={previewDoc.dataUrl} download={previewDoc.name} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-emerald-500">
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
                <button type="button" onClick={() => setPreviewDoc(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" title="Tutup pratinjau">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex min-h-[320px] flex-1 items-center justify-center overflow-auto bg-slate-950 p-4">
              {previewDoc.type === 'FOTO' ? (
                <img src={previewDoc.dataUrl} alt={previewDoc.name} className="max-h-[72vh] max-w-full rounded-lg object-contain" />
              ) : isPreviewable ? (
                <iframe src={previewDoc.dataUrl} title={previewDoc.name} className="h-[72vh] w-full rounded-lg bg-white" />
              ) : (
                <div className="max-w-md text-center text-sm text-slate-300">
                  <FileText className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
                  <p>Format dokumen ini belum dapat dipratinjau langsung di browser.</p>
                  <p className="mt-1 text-xs text-slate-500">Gunakan tombol Download untuk membuka file di perangkat.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

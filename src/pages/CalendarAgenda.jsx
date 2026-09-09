import React, { useMemo, useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { AKD_CATEGORIES, matchAKDCategory } from '../utils/akdUtils';
import { CalendarDays, Clock3, MapPin, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const toDateInputValue = (date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const isSameDay = (a, b) => toDateInputValue(a) === toDateInputValue(b);

const getStartOfWeek = (date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getWeekDates = (date) => {
  const start = getStartOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next;
  });
};

const getMonthDates = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const start = getStartOfWeek(first);
  const gridStart = new Date(start);
  const days = [];

  for (let i = 0; i < 42; i += 1) {
    const cell = new Date(gridStart);
    cell.setDate(gridStart.getDate() + i);
    days.push(cell);
  }

  return days;
};

const formatReadableDate = (date) =>
  new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);

const formatDayLabel = (date) =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: '2-digit', month: 'short' }).format(date);

export default function CalendarAgenda() {
  const { activities } = useAttendance();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState('week');

  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      if (filterCategory !== 'ALL' && !matchAKDCategory(activity.category, filterCategory)) {
        return false;
      }
      return true;
    });
  }, [activities, filterCategory]);

  const moveMonth = (direction) => {
    const next = new Date(selectedDate);
    next.setMonth(next.getMonth() + direction);
    setSelectedDate(next);
  };

  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(selectedDate);

  const dailyItems = useMemo(() => {
    const targetDate = toDateInputValue(selectedDate);
    return filteredActivities.filter(activity => activity.date === targetDate).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [filteredActivities, selectedDate]);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const weeklyItems = useMemo(() => {
    return weekDates.map(date => {
      const dateKey = toDateInputValue(date);
      const items = filteredActivities.filter(activity => activity.date === dateKey).sort((a, b) => a.startTime.localeCompare(b.startTime));
      return { date, items, dateKey };
    });
  }, [filteredActivities, weekDates]);

  const monthDates = useMemo(() => getMonthDates(selectedDate), [selectedDate]);

  const monthlyItems = useMemo(() => {
    return monthDates.map(date => {
      const dateKey = toDateInputValue(date);
      const items = filteredActivities.filter(activity => activity.date === dateKey).sort((a, b) => a.startTime.localeCompare(b.startTime));
      return { date, items, dateKey };
    });
  }, [filteredActivities, monthDates]);

  const renderActivityCard = (activity) => (
    <div key={activity.id} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3 text-left shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-300">{activity.category}</p>
          <h4 className="mt-1 text-sm font-bold text-white">{activity.title}</h4>
        </div>
        <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-300">
          {activity.status || 'ACTIVE'}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
          <span>{formatReadableDate(new Date(`${activity.date}T00:00:00`))}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock3 className="w-3.5 h-3.5 text-cyan-400" />
          <span>{activity.startTime} - {activity.endTime} WIB</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-rose-400" />
          <span>{activity.locationName || activity.roomName || '-'}</span>
        </div>
      </div>
    </div>
  );

  const renderDailyView = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Agenda Hari Ini</p>
            <h3 className="mt-1 text-lg font-black text-white">{formatReadableDate(selectedDate)}</h3>
          </div>
          <input
            type="date"
            value={toDateInputValue(selectedDate)}
            onChange={e => setSelectedDate(new Date(`${e.target.value}T00:00:00`))}
            className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs text-slate-200"
          />
        </div>
      </div>

      <div className="space-y-3">
        {dailyItems.length > 0 ? dailyItems.map(renderActivityCard) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
            Tidak ada agenda pada tanggal ini.
          </div>
        )}
      </div>
    </div>
  );

  const renderWeeklyView = () => (
    <div className="grid gap-3 lg:grid-cols-7">
      {weeklyItems.map(({ date, items, dateKey }) => (
        <div key={dateKey} className={`rounded-2xl border p-2 ${isSameDay(date, new Date()) ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/60'}`}>
          <div className="mb-2 border-b border-slate-800 pb-2 text-center">
            <p className="text-[10px] font-bold uppercase text-slate-400">{new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(date)}</p>
            <p className="text-xs font-black text-white">{date.getDate()}</p>
          </div>

          <div className="space-y-2">
            {items.length > 0 ? items.map(activity => (
              <div key={activity.id} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-left">
                <p className="text-[10px] font-bold text-emerald-300">{activity.category}</p>
                <p className="mt-1 text-[11px] font-semibold text-white">{activity.title}</p>
                <p className="mt-1 text-[10px] text-slate-400">{activity.startTime} - {activity.endTime}</p>
              </div>
            )) : (
              <div className="text-center text-[10px] text-slate-500 py-2">Kosong</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderMonthlyView = () => (
    <div className="grid grid-cols-7 gap-2">
      {monthDates.map(date => {
        const dateKey = toDateInputValue(date);
        const items = filteredActivities.filter(activity => activity.date === dateKey).sort((a, b) => a.startTime.localeCompare(b.startTime));
        const isCurrentMonth = date.getMonth() === selectedDate.getMonth();

        return (
          <div
            key={dateKey + '-cell'}
            className={`min-h-[110px] rounded-2xl border p-2 ${isCurrentMonth ? 'border-slate-700 bg-slate-900/60' : 'border-slate-800 bg-slate-950/40'} ${isSameDay(date, new Date()) ? 'ring-1 ring-emerald-500' : ''}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className={`text-[10px] font-bold ${isCurrentMonth ? 'text-slate-300' : 'text-slate-500'}`}>
                {date.getDate()}
              </span>
            </div>

            <div className="space-y-1">
              {items.slice(0, 2).map(activity => (
                <div key={activity.id} className="rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 text-[9px] text-slate-200">
                  <span className="font-bold text-emerald-300">{activity.category}</span>
                  <div className="truncate">{activity.title}</div>
                </div>
              ))}
              {items.length > 2 && (
                <div className="text-[9px] text-slate-400">+{items.length - 2} lainnya</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-400">Kalender Agenda</p>
          <h1 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Agenda DPRD</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode('day')}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-bold ${viewMode === 'day' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            Harian
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-bold ${viewMode === 'week' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            Mingguan
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-bold ${viewMode === 'month' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            Bulanan
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => moveMonth(-1)} className="rounded-xl border border-slate-700 bg-slate-100 p-2 dark:bg-slate-800">
              <ChevronLeft className="w-4 h-4 text-slate-300" />
            </button>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Periode</p>
              <h2 className="text-base font-black text-slate-900 dark:text-white">{monthLabel}</h2>
            </div>
            <button onClick={() => moveMonth(1)} className="rounded-xl border border-slate-700 bg-slate-100 p-2 dark:bg-slate-800">
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {AKD_CATEGORIES.map(category => (
                <option key={category} value={category}>{category === 'ALL' ? 'Semua AKD' : category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'day' && renderDailyView()}
      {viewMode === 'week' && renderWeeklyView()}
      {viewMode === 'month' && renderMonthlyView()}
    </div>
  );
}

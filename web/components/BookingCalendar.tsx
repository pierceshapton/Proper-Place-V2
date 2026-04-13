'use client';
import { useState, useMemo } from 'react';

interface BookingCalendarProps {
  checkIn: string;
  checkOut: string;
  unavailableDates: string[];
  onSelect: (checkIn: string, checkOut: string) => void;
}

export default function BookingCalendar({ checkIn, checkOut, unavailableDates, onSelect }: BookingCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selecting, setSelecting] = useState<'checkin' | 'checkout'>(checkIn ? 'checkout' : 'checkin');

  const unavailableSet = useMemo(() => new Set(unavailableDates), [unavailableDates]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Mon-start

  const toDateStr = (d: Date) => d.toISOString().split('T')[0];

  const handleDayClick = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(dateStr);
    if (dateObj < today) return;
    if (unavailableSet.has(dateStr)) return;

    if (selecting === 'checkin') {
      onSelect(dateStr, '');
      setSelecting('checkout');
    } else {
      if (dateStr <= checkIn) {
        // If user picks a date before or same as check-in, reset
        onSelect(dateStr, '');
        setSelecting('checkout');
      } else {
        // Check no unavailable dates in range
        const start = new Date(checkIn);
        let hasConflict = false;
        for (let d = new Date(start); d <= dateObj; d.setDate(d.getDate() + 1)) {
          if (unavailableSet.has(toDateStr(d))) { hasConflict = true; break; }
        }
        if (hasConflict) {
          onSelect(dateStr, '');
          setSelecting('checkout');
        } else {
          onSelect(checkIn, dateStr);
          setSelecting('checkin');
        }
      }
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const isInRange = (day: number) => {
    if (!checkIn || !checkOut) return false;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr > checkIn && dateStr < checkOut;
  };

  const isCheckIn = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === checkIn;
  };

  const isCheckOut = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === checkOut;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} disabled={!canGoPrev} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-600">&larr;</button>
        <span className="text-sm font-semibold text-gray-900">{monthName}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 text-gray-600">&rarr;</button>
      </div>
      <div className="grid grid-cols-7 gap-0 text-center text-xs font-medium text-gray-500 mb-1">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dateObj = new Date(dateStr);
          const isPast = dateObj < today;
          const isUnavailable = unavailableSet.has(dateStr);
          const disabled = isPast || isUnavailable;
          const selected = isCheckIn(day) || isCheckOut(day);
          const inRange = isInRange(day);

          return (
            <button
              key={day}
              onClick={() => !disabled && handleDayClick(day)}
              disabled={disabled}
              className={`
                h-9 text-sm rounded-md transition-colors
                ${disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'}
                ${isUnavailable && !isPast ? 'bg-red-50 text-red-300 line-through' : ''}
                ${selected ? 'bg-[#7BA7D8] text-white font-semibold' : ''}
                ${inRange ? 'bg-blue-50 text-[#7BA7D8]' : ''}
                ${!disabled && !selected && !inRange ? 'text-gray-900' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#7BA7D8] inline-block"></span> Selected</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 inline-block"></span> Range</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 inline-block"></span> Unavailable</span>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {selecting === 'checkin' ? 'Select check-in date' : 'Select check-out date'}
        {checkIn && <span className="ml-2">Check-in: <strong>{new Date(checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</strong></span>}
        {checkOut && <span className="ml-2">Check-out: <strong>{new Date(checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</strong></span>}
      </p>
    </div>
  );
}

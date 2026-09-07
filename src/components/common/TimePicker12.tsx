'use client';

import React from 'react';

interface TimePicker12Props {
  value: string; // 24-hr format like "09:30", "18:30", or "FLEXIBLE"
  onChange: (value: string) => void;
  disabled?: boolean;
}

// Convert "HH:mm" (24h) to 12h object
export function parseTimeTo12(time24: string) {
  if (!time24 || time24 === 'FLEXIBLE') {
    return { hour: '09', minute: '30', period: 'AM' as const };
  }
  const parts = time24.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] ? parts[1].padStart(2, '0') : '00';
  if (isNaN(h)) return { hour: '09', minute: '30', period: 'AM' as const };

  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;

  return {
    hour: h.toString().padStart(2, '0'),
    minute: m,
    period,
  };
}

// Convert 12h object to "HH:mm" (24h)
export function formatTime12To24(hour: string, minute: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour, 10);
  if (isNaN(h)) h = 9;
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

// Format "18:30" -> "06:30 PM", "09:30" -> "09:30 AM"
export function formatTo12Hour(time24: string): string {
  if (!time24) return '';
  if (time24 === 'FLEXIBLE') return 'Flexible Hours';
  const { hour, minute, period } = parseTimeTo12(time24);
  return `${hour}:${minute} ${period}`;
}

// Format Date object or ISO string to 12-hr string with AM/PM (e.g. "10:34 PM" or "11:10:08 PM")
export function formatClockTime(dateInput: string | Date | null | undefined, includeSeconds = false): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
    hour12: true,
  });
}

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export const TimePicker12: React.FC<TimePicker12Props> = ({ value, onChange, disabled }) => {
  const { hour, minute, period } = parseTimeTo12(value);

  const handleHourChange = (newHour: string) => {
    onChange(formatTime12To24(newHour, minute, period));
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(formatTime12To24(hour, newMinute, period));
  };

  const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
    onChange(formatTime12To24(hour, minute, newPeriod));
  };

  return (
    <div
      className={`flex items-center gap-1.5 p-1.5 bg-slate-950 border border-slate-800 rounded-xl transition ${
        disabled ? 'opacity-40 pointer-events-none' : 'focus-within:border-teal-500'
      }`}
    >
      {/* Hour Dropdown */}
      <select
        value={hour}
        onChange={(e) => handleHourChange(e.target.value)}
        disabled={disabled}
        className="bg-transparent text-white font-mono font-bold text-xs px-1.5 py-1 rounded focus:outline-none cursor-pointer hover:bg-slate-900"
      >
        {HOURS.map((h) => (
          <option key={h} value={h} className="bg-slate-900 text-white">
            {h}
          </option>
        ))}
      </select>

      <span className="text-teal-400 font-bold font-mono text-xs">:</span>

      {/* Minute Dropdown */}
      <select
        value={minute}
        onChange={(e) => handleMinuteChange(e.target.value)}
        disabled={disabled}
        className="bg-transparent text-white font-mono font-bold text-xs px-1.5 py-1 rounded focus:outline-none cursor-pointer hover:bg-slate-900"
      >
        {MINUTES.includes(minute) ? (
          MINUTES.map((m) => (
            <option key={m} value={m} className="bg-slate-900 text-white">
              {m}
            </option>
          ))
        ) : (
          <>
            <option value={minute} className="bg-slate-900 text-white">
              {minute}
            </option>
            {MINUTES.map((m) => (
              <option key={m} value={m} className="bg-slate-900 text-white">
                {m}
              </option>
            ))}
          </>
        )}
      </select>

      {/* AM / PM Toggle Pill */}
      <div className="ml-auto flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handlePeriodChange('AM')}
          className={`px-2 py-0.5 text-[11px] font-extrabold rounded transition ${
            period === 'AM'
              ? 'bg-growth-teal text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          AM
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handlePeriodChange('PM')}
          className={`px-2 py-0.5 text-[11px] font-extrabold rounded transition ${
            period === 'PM'
              ? 'bg-growth-teal text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          PM
        </button>
      </div>
    </div>
  );
};

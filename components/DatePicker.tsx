import React, { useState, useRef, useEffect } from 'react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function formatDisplay(dateStr: string): string {
  if (!dateStr) return 'Select Date';
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(() =>
    value ? new Date(value + 'T00:00:00') : new Date()
  );

  useEffect(() => {
    if (value) setViewDate(new Date(value + 'T00:00:00'));
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const generateGrid = () => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const cells: React.ReactNode[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<span key={`empty-${i}`} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = dateStr === value;
      const isToday =
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

      cells.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          className={`w-8 h-8 text-xs flex items-center justify-center rounded-full transition-colors
            ${isSelected ? 'bg-indigo-600 text-white font-bold' : ''}
            ${!isSelected && isToday ? 'text-indigo-600 font-bold bg-indigo-50' : ''}
            ${!isSelected && !isToday ? 'hover:bg-slate-100 text-slate-700' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    return cells;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 bg-white border rounded-xl px-3 py-2 transition-all shadow-sm
          ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-1' : 'border-slate-300 hover:border-slate-400'}
        `}
      >
        <span className="text-slate-700 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">
          {formatDisplay(value)}
        </span>
        <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_today</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 shadow-xl p-4 w-64 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <button onClick={handlePrevMonth} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600">
              <span className="material-symbols-outlined text-[18px]">navigate_before</span>
            </button>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-800">
              {MONTHS[month]} {year}
            </span>
            <button onClick={handleNextMonth} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600">
              <span className="material-symbols-outlined text-[18px]">navigate_next</span>
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2 text-center">
            {DAYS.map(d => (
              <span key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 justify-items-center">
            {generateGrid()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;

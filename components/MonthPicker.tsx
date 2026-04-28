import React, { useState, useRef, useEffect } from 'react';

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDisplay(monthStr: string): string {
  if (!monthStr) return 'Select Month';
  const [year, month] = monthStr.split('-');
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

const MonthPicker: React.FC<MonthPickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [viewYear, setViewYear] = useState(() =>
    value ? parseInt(value.split('-')[0]) : new Date().getFullYear()
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMonthClick = (idx: number) => {
    const monthStr = `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
    onChange(monthStr);
    setIsOpen(false);
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
        <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_month</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 shadow-xl p-4 w-56 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setViewYear(y => y - 1)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600">
              <span className="material-symbols-outlined text-[18px]">navigate_before</span>
            </button>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-800">{viewYear}</span>
            <button onClick={() => setViewYear(y => y + 1)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600">
              <span className="material-symbols-outlined text-[18px]">navigate_next</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m, idx) => {
              const monthStr = `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
              const isSelected = value === monthStr;
              return (
                <button
                  key={m}
                  onClick={() => handleMonthClick(idx)}
                  className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors
                    ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}
                  `}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthPicker;

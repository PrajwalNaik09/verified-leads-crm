import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  sub: string;
  accent?: 'blue' | 'red' | 'amber' | 'green';
  icon?: React.ReactNode;
}

const accentConfig = {
  blue:  { bg: 'bg-blue-50',  text: 'text-blue-600' },
  red:   { bg: 'bg-red-50',   text: 'text-red-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600' },
};

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent = 'blue', icon }) => {
  const cfg = accentConfig[accent];

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4 transition-shadow hover:shadow-md">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-slate-900 leading-none">{value}</h3>
        </div>
        <p className="text-sm text-slate-500 mt-1">{sub}</p>
      </div>
    </div>
  );
};

export default StatCard;

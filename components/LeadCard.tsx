import React from 'react';
import { VerifiedLead } from '../types';
import { Clock, MapPin, IndianRupee, Home, Flame, Sparkles, MoreVertical } from 'lucide-react';

interface LeadCardProps {
  lead: VerifiedLead;
  onClick: (lead: VerifiedLead) => void;
  onMoveStage?: (id: string, stage: any) => void;
}

const tierConfig: Record<string, { color: string; bg: string; border: string }> = {
  HOT:  { color: 'text-rose-600',   bg: 'bg-rose-50',    border: 'border-rose-200' },
  WARM: { color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200' },
  COOL: { color: 'text-slate-600',  bg: 'bg-slate-100',  border: 'border-slate-200' },
};

const formatTimeAgo = (tsString: string) => {
  const ts = Number(tsString) || Date.now();
  const diff = Date.now() - ts;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const formatBudget = (num: number, raw: string) => {
  if (num > 0) {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    return `₹${num.toLocaleString('en-IN')}`;
  }
  return raw;
};

const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick }) => {
  const cfg = tierConfig[lead.priorityTier] || tierConfig.COOL;
  const isUrgent = lead.timeline.toLowerCase().includes('immediate');

  return (
    <div
      onClick={() => onClick(lead)}
      className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-slate-300 cursor-pointer group flex flex-col gap-4 relative overflow-hidden"
    >
      {/* Decorative top accent for hot leads */}
      {lead.priorityTier === 'HOT' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-rose-600" />
      )}

      {/* Header */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
              {lead.priorityTier}
            </span>
            {isUrgent && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                <Flame className="w-2.5 h-2.5" /> Urgent
              </span>
            )}
            {lead.sentiment === 'Positive' && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> High Intent
              </span>
            )}
          </div>
          <h3 className="font-bold text-slate-900 truncate text-lg group-hover:text-primary transition-colors">
            {lead.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Added {formatTimeAgo(lead.rawId)}</span>
          </div>
        </div>
        
        {/* Actions Dropdown Trigger */}
        <button className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Grid Details */}
      <div className="grid grid-cols-2 gap-y-3 gap-x-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
        <div className="flex items-start gap-2 text-slate-600">
          <IndianRupee className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Budget</p>
            <p className={`text-sm font-semibold truncate ${lead.budgetNum > 30000 ? 'text-primary' : 'text-slate-800'}`}>
              {formatBudget(lead.budgetNum, lead.budget) || 'N/A'}
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-2 text-slate-600">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Location</p>
            <p className="text-sm font-medium text-slate-800 truncate" title={lead.preferredLocation}>
              {lead.preferredLocation || 'Any'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-slate-600">
          <Home className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Type</p>
            <p className="text-sm font-medium text-slate-800 truncate" title={lead.propertyType}>
              {lead.propertyType || 'Any'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Notes/Match */}
      {(lead.propertyMatch || lead.notes) && (
        <div className="text-xs text-slate-500 line-clamp-2 mt-1 border-t border-slate-100 pt-3">
          {lead.propertyMatch ? (
            <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded mr-1">
              Match: {lead.propertyMatch}
            </span>
          ) : (
            <span className="italic text-slate-400">
              {lead.notes}
            </span>
          )}
        </div>
      )}
      
      {/* Top right time + score overlay */}
      {lead.priorityScore && (
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5 opacity-60">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-white text-indigo-600 border border-slate-200 shadow-sm`}
              title={`Lead Score: ${lead.priorityScore}`}
            >
              {lead.priorityScore}
            </div>
        </div>
      )}
    </div>
  );
};

export default LeadCard;

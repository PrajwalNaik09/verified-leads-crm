import React from 'react';
import { VerifiedLead, KanbanStage } from '../types';
import LeadCard from './LeadCard';

interface KanbanColumnProps {
  title: string;
  stage: KanbanStage;
  leads: VerifiedLead[];
  color: string;
  onCardClick: (lead: VerifiedLead) => void;
  onMoveStage: (id: string, stage: KanbanStage) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, stage, leads, color, onCardClick, onMoveStage }) => {
  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-sm font-semibold text-slate-700 flex-1">
          {title}
        </span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
        >
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 flex flex-col gap-3 min-h-[500px] pb-8">
        {leads.length === 0 ? (
          <div
            className="rounded-xl p-8 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-300 bg-slate-50/50"
          >
            <div className="w-6 h-6 rounded-full" style={{ border: `1px dashed ${color}80` }} />
            <p className="text-sm font-medium text-slate-400">No leads</p>
          </div>
        ) : (
          leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onCardClick(lead)}
              onMoveStage={onMoveStage}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;

import React, { useState } from 'react';
import { VerifiedLead, KanbanStage } from '../types';
import { X, Phone, MessageCircle, CheckCircle, ChevronDown, Clock, MapPin, IndianRupee, Home, Zap, AlignLeft } from 'lucide-react';

interface LeadModalProps {
  lead: VerifiedLead;
  onClose: () => void;
  onUpdateStage: (id: string, stage: KanbanStage) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

const STAGE_LABELS: Record<KanbanStage, string> = {
  new: 'New Verified',
  contacted: 'Contacted',
  visit_scheduled: 'Visit Scheduled',
  closed: 'Closed',
};

const STAGE_COLORS: Record<KanbanStage, string> = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  visit_scheduled: '#8b5cf6',
  closed: '#10b981',
};

const tierConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  HOT:  { label: 'HOT LEAD',  color: 'text-rose-600',   bg: 'bg-rose-50',    border: 'border-rose-200' },
  WARM: { label: 'WARM LEAD', color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200' },
  COOL: { label: 'COOL LEAD', color: 'text-slate-600',  bg: 'bg-slate-100',  border: 'border-slate-200' },
};

interface RowProps { icon: React.ReactNode; label: string; value: string; highlight?: boolean; }
const Row: React.FC<RowProps> = ({ icon, label, value, highlight }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
    <div className="mt-0.5 text-slate-400">{icon}</div>
    <div className="flex-1">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-primary font-bold' : 'text-slate-800'}`}>
        {value || 'Not specified'}
      </p>
    </div>
  </div>
);

const LeadModal: React.FC<LeadModalProps> = ({ lead, onClose, onUpdateStage, onUpdateNotes }) => {
  const [notes, setNotes] = useState(lead.notes);
  const [showStages, setShowStages] = useState(false);
  const cfg = tierConfig[lead.priorityTier];
  const isImmediate = lead.timeline.toLowerCase().includes('immediate');

  const formatBudget = (num: number, raw: string) => {
    if (num > 0) return `₹${num.toLocaleString('en-IN')} / month`;
    return raw || '—';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 md:p-8 flex-shrink-0 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                  {cfg.label}
                </span>
                {isImmediate && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> URGENT
                  </span>
                )}
                {lead.sentiment && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-slate-200 text-slate-700 border border-slate-300">
                    {lead.sentiment}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1 leading-tight">
                {lead.name}
              </h2>
              {lead.email && (
                <p className="text-slate-500 font-medium">{lead.email}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 -mt-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stage selector inline */}
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-sm font-semibold text-slate-500">Current Stage:</span>
            <div className="relative flex-1 max-w-xs">
              <button
                onClick={() => setShowStages(!showStages)}
                className="w-full flex items-center justify-between text-sm font-semibold py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                style={{ color: STAGE_COLORS[lead.stage] }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: STAGE_COLORS[lead.stage] }} />
                  {STAGE_LABELS[lead.stage]}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              
              {showStages && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20 bg-white border border-slate-200 shadow-xl">
                  {(Object.keys(STAGE_LABELS) as KanbanStage[]).map(s => (
                    <button
                      key={s}
                      onClick={() => { onUpdateStage(lead.id, s); setShowStages(false); }}
                      className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors ${lead.stage === s ? 'bg-slate-50 font-bold' : 'font-medium hover:bg-slate-50'}`}
                      style={{ color: lead.stage === s ? STAGE_COLORS[s] : '#475569' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: STAGE_COLORS[s] }} />
                        {STAGE_LABELS[s]}
                      </div>
                      {lead.stage === s && <CheckCircle className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            
            {/* Left Col: Preferences */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Home className="w-4 h-4 text-primary" /> Property Requirements
              </h3>
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <Row icon={<Home className="w-4 h-4"/>} label="Type" value={lead.propertyType} />
                <Row icon={<MapPin className="w-4 h-4"/>} label="Location" value={lead.preferredLocation} />
                <Row icon={<IndianRupee className="w-4 h-4"/>} label="Budget" value={formatBudget(lead.budgetNum, lead.budget)} highlight={lead.budgetNum > 30000} />
                <Row icon={<Clock className="w-4 h-4"/>} label="Timeline" value={lead.timeline} highlight={isImmediate} />
              </div>
            </div>

            {/* Right Col: Details */}
            <div className="space-y-6">
              {lead.callSummary && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlignLeft className="w-4 h-4 text-primary" /> Call Summary
                  </h3>
                  <div className="bg-indigo-50/50 text-indigo-900 text-sm leading-relaxed rounded-2xl p-4 border border-indigo-100 font-medium">
                    {lead.callSummary}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-slate-400" /> Agent Notes
                </h3>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  onBlur={() => onUpdateNotes(lead.id, notes)}
                  rows={4}
                  placeholder="Record interaction notes here..."
                  className="w-full text-sm rounded-2xl p-4 border-slate-200 bg-white placeholder-slate-400 text-slate-700 focus:border-primary focus:ring-primary shadow-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
            <button
              className="flex-1 flex items-center justify-center gap-2 font-bold py-3.5 px-6 rounded-xl text-sm bg-primary hover:bg-indigo-700 text-white shadow-sm transition-all shadow-indigo-200"
            >
              <Phone className="w-4 h-4" />
              Call Contact
            </button>
            {lead.phone ? (
              <a
                href={`https://wa.me/${lead.phone.replace(/\\D/g, '').startsWith('91') && lead.phone.replace(/\\D/g, '').length > 10 ? lead.phone.replace(/\\D/g, '') : '91' + lead.phone.replace(/\\D/g, '')}?text=${encodeURIComponent(`Hi ${lead.name}, these are the details: looking for a ${lead.propertyType || 'property'} in ${lead.preferredLocation || 'any location'} at a ${lead.budget || 'specified'} budget.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 font-bold py-3.5 px-6 rounded-xl text-sm border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 transition-all"
              >
                <MessageCircle className="w-4 h-4 text-green-500" />
                Message via WhatsApp
              </a>
            ) : (
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 font-bold py-3.5 px-6 rounded-xl text-sm border-2 border-slate-200 bg-slate-50 text-slate-400 opacity-50 cursor-not-allowed transition-all"
              >
                <MessageCircle className="w-4 h-4 text-slate-400" />
                Message via WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadModal;

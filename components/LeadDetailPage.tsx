import React, { useState } from 'react';
import { VerifiedLead, KanbanStage } from '../types';
import { saveLeadOverride } from '../services/sheetService';

interface LeadDetailPageProps {
    lead: VerifiedLead;
    onBack: () => void;
    onUpdateStage: (id: string, stage: KanbanStage) => void;
    onUpdateNotes: (id: string, notes: string) => void;
}

const STAGE_OPTIONS: { v: KanbanStage; l: string; color: string }[] = [
    { v: 'new', l: 'New Verified', color: '#f59e0b' },
    { v: 'contacted', l: 'Contacted', color: '#6366f1' },
    { v: 'visit_scheduled', l: 'Visit Scheduled', color: '#8b5cf6' },
    { v: 'closed', l: 'Closed', color: '#10b981' },
];

const TIER_CONFIG = {
    HOT: { label: 'HOT LEAD', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', avatar: 'from-rose-500 to-rose-700' },
    WARM: { label: 'WARM LEAD', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', avatar: 'from-amber-500 to-amber-700' },
    COOL: { label: 'COOL LEAD', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', avatar: 'from-slate-600 to-slate-800' },
};

function getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
}

function sentimentPercent(sentiment: string, score: number): number {
    const s = sentiment.toLowerCase();
    if (s === 'positive') return Math.max(score, 72);
    if (s === 'negative') return Math.min(score, 30);
    return score || 50;
}

function whatsappUrl(phone: string): string {
    const d = phone.replace(/\D/g, '');
    return `https://wa.me/${d.startsWith('91') && d.length > 10 ? d : '91' + d}`;
}

// ── Copy-on-hover contact row ──────────────────────────────────────────────
const ContactRow: React.FC<{ icon: string; label: string; value: string; copyable?: boolean }> = ({ icon, label, value, copyable }) => {
    const [copied, setCopied] = useState(false);
    const copy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
    };
    return (
        <div className="group flex justify-between items-center px-3 py-3 hover:bg-slate-50 rounded transition-colors">
            <div className="flex items-center gap-3 min-w-0">
                <span className="material-symbols-outlined text-slate-400 flex-shrink-0">{icon}</span>
                <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{value}</p>
                </div>
            </div>
            {copyable && (
                <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2 text-slate-400 hover:text-slate-700">
                    <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                </button>
            )}
        </div>
    );
};

// ── Preference tile ────────────────────────────────────────────────────────
const PrefTile: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">{label}</p>
        <p className={`text-base font-black tracking-tight leading-tight ${accent ? 'text-indigo-600' : 'text-slate-900'}`}>{value}</p>
    </div>
);

// ── Main component ─────────────────────────────────────────────────────────
const LeadDetailPage: React.FC<LeadDetailPageProps> = ({ lead, onBack, onUpdateStage, onUpdateNotes }) => {
    const [stage, setStage] = useState<KanbanStage>(lead.stage);
    const [notes, setNotes] = useState(lead.notes || '');

    const tier = TIER_CONFIG[lead.priorityTier] ?? TIER_CONFIG.COOL;
    const initials = getInitials(lead.name);
    const pct = sentimentPercent(lead.sentiment, lead.priorityScore);
    const stageOpt = STAGE_OPTIONS.find(s => s.v === stage) ?? STAGE_OPTIONS[0];

    const handleStage = (s: KanbanStage) => {
        setStage(s);
        onUpdateStage(lead.id, s);
    };
    const handleNotesSave = () => onUpdateNotes(lead.id, notes);

    // Key takeaways derived from lead fields
    const takeaways: string[] = [];
    if (lead.propertyMatch) takeaways.push(lead.propertyMatch);
    if (lead.openToNearby?.toLowerCase().includes('yes')) takeaways.push('Open to nearby areas');
    if (lead.timeline) takeaways.push(`Timeline: ${lead.timeline}`);
    if (lead.furniturePref) takeaways.push(`Furnishing: ${lead.furniturePref}`);

    const nextAction: Record<KanbanStage, string> = {
        new: 'Make initial contact — call or WhatsApp this lead now',
        contacted: 'Follow up and schedule a site visit',
        visit_scheduled: 'Site visit confirmed — prepare property details',
        closed: 'Deal closed — follow up for referrals',
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* ── Top bar ── */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
                <div className="flex justify-between items-center px-8 h-14 max-w-[1440px] mx-auto">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium"
                        >
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            All Leads
                        </button>
                        <span className="text-slate-200">|</span>
                        <span className="text-sm font-black tracking-[0.18em] text-slate-900 uppercase">Linear Ledger</span>
                        <nav className="hidden md:flex gap-5 items-center ml-2">
                            <a className="text-slate-400 font-medium hover:text-indigo-600 transition-colors text-xs" href="#">Dashboard</a>
                            <a className="text-indigo-600 font-bold text-xs" href="#">Leads</a>
                            <a className="text-slate-400 font-medium hover:text-indigo-600 transition-colors text-xs" href="#">Properties</a>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                        <span className="material-symbols-outlined cursor-pointer hover:text-slate-700 transition-colors">notifications</span>
                        <span className="material-symbols-outlined cursor-pointer hover:text-slate-700 transition-colors">settings</span>
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-indigo-600 text-sm">person</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-[1440px] mx-auto px-8 py-10 grid grid-cols-12 gap-10">

                {/* ── Hero / Profile ── */}
                <section className="col-span-12 flex flex-col md:flex-row justify-between items-start md:items-end pb-8 border-b border-slate-200 gap-6">
                    <div className="flex items-end gap-6">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded-sm uppercase border ${tier.bg} ${tier.text} ${tier.border} shadow-sm`}>{tier.label}</span>
                                <span className="text-slate-200">·</span>
                                <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">{stageOpt.l}</span>
                                <span className="text-slate-200">·</span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score {lead.priorityScore}/100</span>
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{lead.name}</h1>
                            {lead.preferredLocation && (
                                <div className="flex items-center gap-1.5 text-slate-500 pt-0.5">
                                    <span className="material-symbols-outlined text-sm">location_on</span>
                                    <span className="text-sm font-medium">{lead.preferredLocation}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 flex-shrink-0">
                        {lead.phone ? (
                            <a
                                href={`tel:${lead.phone}`}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold tracking-tight shadow-md hover:bg-indigo-700 transition-all text-sm"
                            >
                                <span className="material-symbols-outlined text-base">call</span>
                                Call Lead
                            </a>
                        ) : (
                            <button disabled className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-400 rounded-xl font-bold tracking-tight cursor-not-allowed text-sm">
                                <span className="material-symbols-outlined text-base">call</span>
                                No Phone
                            </button>
                        )}
                        {lead.phone ? (
                            <a
                                href={whatsappUrl(lead.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl font-bold tracking-tight hover:bg-slate-50 transition-all shadow-sm text-sm"
                            >
                                <span className="material-symbols-outlined text-emerald-600 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                                WhatsApp
                            </a>
                        ) : (
                            <button disabled className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-400 rounded-xl font-bold tracking-tight cursor-not-allowed text-sm">
                                <span className="material-symbols-outlined text-base">chat</span>
                                WhatsApp
                            </button>
                        )}
                    </div>
                </section>

                {/* ── Left sidebar ── */}
                <aside className="col-span-12 lg:col-span-4 space-y-8">

                    {/* Contact details */}
                    <div>
                        <h3 className="text-[10px] font-black tracking-[0.22em] uppercase text-slate-900 border-b border-slate-200 pb-2 mb-4">Contact Details</h3>
                        <div className="space-y-0.5">
                            {lead.email && <ContactRow icon="mail" label="Email Address" value={lead.email} copyable />}
                            {lead.phone
                                ? <ContactRow icon="smartphone" label="Phone Number" value={lead.phone} copyable />
                                : <div className="px-3 py-3 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-slate-300">smartphone</span>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Phone Number</p>
                                        <p className="text-sm text-slate-400 italic">Not collected</p>
                                    </div>
                                </div>
                            }
                            {lead.preferredLocation && <ContactRow icon="location_on" label="Preferred Area" value={lead.preferredLocation} />}
                        </div>
                    </div>

                    {/* Property preferences */}
                    <div>
                        <h3 className="text-[10px] font-black tracking-[0.22em] uppercase text-slate-900 border-b border-slate-200 pb-2 mb-4">Property Preferences</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {lead.propertyType && <PrefTile label="Type" value={lead.propertyType} />}
                            {lead.budget && <PrefTile label="Budget" value={lead.budget} accent />}
                            {lead.timeline && <PrefTile label="Timeline" value={lead.timeline} />}
                            {lead.openToNearby && (
                                <PrefTile
                                    label="Open to Nearby"
                                    value={lead.openToNearby.toLowerCase().includes('yes') ? 'Confirmed' : lead.openToNearby}
                                    accent={lead.openToNearby.toLowerCase().includes('yes')}
                                />
                            )}
                            {lead.furniturePref && <PrefTile label="Furnishing" value={lead.furniturePref} />}
                        </div>
                    </div>

                    {/* Pipeline stage */}
                    <div>
                        <h3 className="text-[10px] font-black tracking-[0.22em] uppercase text-slate-900 border-b border-slate-200 pb-2 mb-4">Pipeline Stage</h3>
                        <div className="flex flex-col gap-1.5">
                            {STAGE_OPTIONS.map(({ v, l, color }) => (
                                <button
                                    key={v}
                                    onClick={() => handleStage(v)}
                                    className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold flex items-center justify-between transition-all border ${stage === v
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage === v ? '#fff' : color }} />
                                        {l}
                                    </div>
                                    {stage === v && <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Agent notes */}
                    <div>
                        <h3 className="text-[10px] font-black tracking-[0.22em] uppercase text-slate-900 border-b border-slate-200 pb-2 mb-4">Agent Notes</h3>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            onBlur={handleNotesSave}
                            rows={4}
                            placeholder="Record interaction notes here..."
                            className="w-full text-sm rounded-xl p-4 border border-slate-200 bg-white placeholder-slate-300 text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm resize-none outline-none transition-colors"
                        />
                    </div>
                </aside>

                {/* ── Right main ── */}
                <div className="col-span-12 lg:col-span-8 space-y-6">

                    {/* Call Summary block */}
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-indigo-600 text-xl">description</span>
                                <h2 className="text-[11px] font-black tracking-[0.28em] uppercase text-slate-900">Expanded Call Summary</h2>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-sm ${tier.bg} ${tier.text}`}>
                                {lead.sentiment || 'Neutral'}
                            </span>
                        </div>

                        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-8">
                            {lead.callSummary ? (
                                <p className="text-xl font-medium text-slate-900 leading-relaxed tracking-tight">
                                    "{lead.callSummary}"
                                </p>
                            ) : (
                                <p className="text-xl font-medium text-slate-400 leading-relaxed italic">
                                    No call summary available for this lead.
                                </p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                                {/* Key takeaways */}
                                <div>
                                    <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-3">Key Takeaways</h4>
                                    {takeaways.length > 0 ? (
                                        <ul className="space-y-2.5">
                                            {takeaways.map((t, i) => (
                                                <li key={i} className="flex items-start gap-2.5 text-sm">
                                                    <span
                                                        className="material-symbols-outlined text-emerald-600 flex-shrink-0"
                                                        style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                                                    >
                                                        check_circle
                                                    </span>
                                                    <span className="text-slate-700">{t}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic">No structured takeaways extracted.</p>
                                    )}
                                </div>

                                {/* Sentiment analysis */}
                                <div>
                                    <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-3">Sentiment Analysis</h4>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${pct >= 60 ? 'bg-indigo-600' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 whitespace-nowrap tabular-nums">
                                            {pct}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {lead.sentiment || 'Neutral'} · Priority score {lead.priorityScore}/100
                                    </p>
                                    {lead.propertyMatch && (
                                        <p className="text-xs text-slate-500 mt-2">
                                            <span className="font-bold text-slate-700">Property match:</span> {lead.propertyMatch}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Next action card */}
                    <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-white text-lg">bolt</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Next Action</p>
                                <p className="text-sm font-bold text-slate-900">{nextAction[stage]}</p>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Priority</p>
                            <p className={`text-sm font-black uppercase tracking-wide ${tier.text}`}>{tier.label}</p>
                        </div>
                    </div>

                    {/* Lead ID / meta */}
                    <div className="px-1">
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                            Lead ID: {lead.id} · {lead.email || 'no email'}
                        </p>
                    </div>
                </div>
            </div>

            {/* FAB back button */}
            <div className="fixed right-8 bottom-8">
                <button
                    onClick={onBack}
                    title="Back to Leads"
                    className="w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
            </div>
        </div>
    );
};

export default LeadDetailPage;

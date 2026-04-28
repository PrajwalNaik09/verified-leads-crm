import React, { useEffect, useState, useMemo } from 'react';
import { VerifiedLead, KanbanStage, PriorityTier } from './types';
import { fetchVerifiedLeads, saveLeadOverride } from './services/sheetService';
import LeadModal from './components/LeadModal';
import LeadDetailPage from './components/LeadDetailPage';
import DatePicker from './components/DatePicker';
import MonthPicker from './components/MonthPicker';
import AnalyticsView from './components/AnalyticsView';

const WEBHOOK_URL = 'https://n8n.apexflowai.in/webhook-test/mfd';

type TimeFilter = 'Daily' | 'Weekly' | 'Monthly';

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentMonthStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatPhone(phone: string): string {
    return phone.replace(/\D/g, '');
}

function whatsappUrl(lead: VerifiedLead): string {
    if (!lead.phone) return '#';
    const digits = formatPhone(lead.phone);
    const num = digits.startsWith('91') && digits.length > 10 ? digits : `91${digits}`;
    const message = `Hi ${lead.name}, these are the details: looking for a ${lead.propertyType || 'property'} in ${lead.preferredLocation || 'any location'} at a ${lead.budget || 'specified'} budget.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

const App: React.FC = () => {
    const [leads, setLeads] = useState<VerifiedLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [webhookStatus, setWebhookStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [selectedLead, setSelectedLead] = useState<VerifiedLead | null>(null);
    const [detailLead, setDetailLead] = useState<VerifiedLead | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<TimeFilter>('Daily');
    const [dateFilter, setDateFilter] = useState<string>(todayStr);
    const [monthFilter, setMonthFilter] = useState<string>(currentMonthStr);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityTier>('all');
    const [stageFilter, setStageFilter] = useState<'all' | KanbanStage>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [currentView, setCurrentView] = useState<'leads' | 'analytics'>('leads');

    const triggerWebhook = async () => {
        setWebhookStatus('loading');
        try {
            await fetch(WEBHOOK_URL, { method: 'POST' });
            setWebhookStatus('success');
        } catch (e) {
            setWebhookStatus('error');
        } finally {
            setTimeout(() => setWebhookStatus('idle'), 2000);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchVerifiedLeads();
            setLeads(data);
            // Auto-set date picker to the most recent lead's date
            if (data.length > 0) {
                const latest = [...data].sort((a, b) => {
                    if (!a.callDate) return 1;
                    if (!b.callDate) return -1;
                    return b.callDate.getTime() - a.callDate.getTime();
                })[0];
                if (latest.callDate) {
                    const d = latest.callDate;
                    setDateFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                    setMonthFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                }
            }
        } catch (e) {
            console.error('Failed to fetch leads', e);
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleUpdateStage = (id: string, stage: KanbanStage) => {
        setLeads(prev => {
            const lead = prev.find(l => l.id === id);
            if (lead) saveLeadOverride(id, { stage, notes: lead.notes });
            return prev.map(l => l.id === id ? { ...l, stage } : l);
        });
        setSelectedLead(prev => prev?.id === id ? { ...prev, stage } : prev);
        setDetailLead(prev => prev?.id === id ? { ...prev, stage } : prev);
    };

    const handleUpdateNotes = (id: string, notes: string) => {
        setLeads(prev => {
            const lead = prev.find(l => l.id === id);
            if (lead) saveLeadOverride(id, { stage: lead.stage, notes });
            return prev.map(l => l.id === id ? { ...l, notes } : l);
        });
        setDetailLead(prev => prev?.id === id ? { ...prev, notes } : prev);
    };

    const filteredLeads = useMemo(() => {
        let result = leads;

        const q = search.trim().toLowerCase();
        if (q) {
            result = result.filter(l =>
                (l.name || '').toLowerCase().includes(q) ||
                (l.preferredLocation || '').toLowerCase().includes(q) ||
                (l.propertyType || '').toLowerCase().includes(q) ||
                (l.propertyMatch || '').toLowerCase().includes(q) ||
                (l.email || '').toLowerCase().includes(q) ||
                (l.phone || '').includes(q)
            );
        }

        if (priorityFilter !== 'all') {
            result = result.filter(l => l.priorityTier === priorityFilter);
        }

        if (stageFilter !== 'all') {
            result = result.filter(l => l.stage === stageFilter);
        }

        if (selectedFilter === 'Daily') {
            result = result.filter(l => {
                if (!l.callDate) return false;
                const d = l.callDate;
                const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                return s === dateFilter;
            });
        } else if (selectedFilter === 'Weekly') {
            const now = new Date();
            const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            result = result.filter(l => l.callDate && l.callDate >= startOfWeek);
        } else if (selectedFilter === 'Monthly') {
            result = result.filter(l => {
                if (!l.callDate) return false;
                const d = l.callDate;
                const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                return s === monthFilter;
            });
        }

        return result;
    }, [leads, search, priorityFilter, stageFilter, selectedFilter, dateFilter, monthFilter]);

    const stats = useMemo(() => {
        const hot = leads.filter(l => l.priorityTier === 'HOT').length;
        const budgets = leads.map(l => l.budgetNum).filter(b => b > 0);
        const avg = budgets.length > 0 ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length) : 0;
        const verified = leads.filter(l => l.stage === 'closed' || l.stage === 'visit_scheduled').length;
        return { total: leads.length, hot, avg, verified };
    }, [leads]);

    const getStatusColor = (stage: KanbanStage) => {
        switch (stage) {
            case 'new': return 'status-pending';
            case 'contacted': return 'status-processing';
            case 'visit_scheduled': return 'status-processing';
            case 'closed': return 'status-verified';
            default: return 'status-pending';
        }
    };

    const getStatusText = (stage: KanbanStage) => {
        switch (stage) {
            case 'new': return 'Pending';
            case 'contacted': return 'Processing';
            case 'visit_scheduled': return 'Scheduled';
            case 'closed': return 'Verified';
            default: return 'Pending';
        }
    };

    const getStatusTextColor = (stage: KanbanStage) => {
        switch (stage) {
            case 'new': return 'text-amber-600';
            case 'contacted': return 'text-indigo-600';
            case 'visit_scheduled': return 'text-indigo-600';
            case 'closed': return 'text-emerald-600';
            default: return 'text-amber-600';
        }
    };

    const pendingCount = leads.filter(l => l.stage === 'new' || l.stage === 'contacted').length;
    const hasActiveFilters = priorityFilter !== 'all' || stageFilter !== 'all';

    const closeDropdowns = () => { setShowFilters(false); setShowStatusDropdown(false); };

    if (detailLead) {
        return (
            <LeadDetailPage
                lead={detailLead}
                onBack={() => setDetailLead(null)}
                onUpdateStage={handleUpdateStage}
                onUpdateNotes={handleUpdateNotes}
            />
        );
    }

    return (
        <div className="bg-white text-on-surface antialiased">
            {(showFilters || showStatusDropdown) && (
                <div className="fixed inset-0 z-10" onClick={closeDropdowns} />
            )}

            {selectedLead && (
                <LeadModal
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onUpdateStage={handleUpdateStage}
                    onUpdateNotes={handleUpdateNotes}
                />
            )}

            <aside className="fixed left-0 top-0 h-full flex flex-col items-center py-8 z-40 bg-white w-20 border-r border-slate-100">
                <div className="mb-12">
                    <span className="material-symbols-outlined text-indigo-600 text-3xl">account_balance_wallet</span>
                </div>
                <nav className="flex flex-col gap-8 flex-1">
                    <button 
                        onClick={() => setCurrentView('leads')}
                        className={`group flex flex-col items-center gap-1 transition-all px-4 py-2 ${currentView === 'leads' ? 'text-indigo-600 border-r-2 border-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}
                    >
                        <span className="material-symbols-outlined">person_search</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Leads</span>
                    </button>
                    <button 
                        onClick={() => setCurrentView('analytics')}
                        className={`group flex flex-col items-center gap-1 transition-all px-4 py-2 ${currentView === 'analytics' ? 'text-indigo-600 border-r-2 border-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}
                    >
                        <span className="material-symbols-outlined">database</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Data</span>
                    </button>
                </nav>
                <div className="mt-auto">
                    <img alt="User profile" className="w-8 h-8 rounded-full grayscale border border-slate-100" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxllw5FFAZtlwy4dSl_UAxLMIzTPMCDCzNGng0VMDI-svIWWbghfYEQblcb578YN7pl9bHmh9eymufCsutmQvyEINMxOMO00zAtHG9F4bYyOyJnq5VKORCsc9AmgeOVv8eC7J3IH2VcMy19cE4eK99dHdq0tmclpBzT3uLAEaN0pHcXO4hNbbQ8vRRCqUASn6YvXq58vAVkssGOVudpD1ciwDxu5cWqUw7Q2C9oQqgMiNK8TCAAxqlDLdwBIdDQXR21m15daZKZ7Yz"/>
                </div>
            </aside>

            <main className="ml-20 min-h-screen flex flex-col">
                <header className="flex justify-between items-center w-full px-12 py-5 sticky top-0 bg-white/80 backdrop-blur-md z-30 border-b border-slate-100">
                    <div className="flex items-center gap-12">
                        <h1 className="text-xs font-black tracking-[0.2em] text-slate-900 uppercase">Linear Ledger</h1>
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center text-slate-400">
                                <span className="material-symbols-outlined text-sm">search</span>
                            </span>
                            <input
                                className="pl-7 pr-4 py-1 bg-transparent border-none text-xs focus:ring-0 focus:outline-none w-64 placeholder:text-slate-300"
                                placeholder="Search leads..."
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <button className="text-slate-400 hover:text-indigo-600 transition-colors" onClick={loadData}>
                            <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>sync</span>
                        </button>
                        <button
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
                            onClick={triggerWebhook}
                            disabled={webhookStatus === 'loading'}
                        >
                            <span className="material-symbols-outlined text-sm">{webhookStatus === 'loading' ? 'hourglass_empty' : 'add'}</span>
                            {webhookStatus === 'loading' ? 'Syncing...' : 'New Extraction'}
                        </button>
                    </div>
                </header>

                {currentView === 'leads' ? (
                    <section className="p-12 flex-1">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-500 mb-2">Qualifier Pipeline</p>
                                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Lead Repository</h2>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-4xl font-black text-slate-900 tracking-tighter">{filteredLeads.length.toLocaleString()}</span>
                                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                                            {hasActiveFilters ? `of ${stats.total.toLocaleString()} Total` : 'Total Leads'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative z-30">
                                        <button
                                            onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowFilters(false); }}
                                            className={`flex items-center gap-2 bg-white border rounded-xl px-4 py-2 transition-all shadow-sm
                                                ${showStatusDropdown ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-1' : 'border-slate-300 hover:border-slate-400'}
                                            `}
                                        >
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status:</span>
                                            <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">{selectedFilter}</span>
                                            <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
                                        </button>
                                        {showStatusDropdown && (
                                            <div className="absolute left-0 top-full mt-2 bg-white border border-slate-200 shadow-xl w-36 z-50 rounded-2xl p-1">
                                                {(['Daily', 'Weekly', 'Monthly'] as const).map(f => (
                                                    <button
                                                        key={f}
                                                        onClick={() => { setSelectedFilter(f); setShowStatusDropdown(false); }}
                                                        className={`w-full text-left px-4 py-3 text-sm font-bold uppercase tracking-widest transition-colors rounded-xl
                                                            ${selectedFilter === f ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}
                                                        `}
                                                    >
                                                        {f}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {selectedFilter === 'Daily' && (
                                        <DatePicker value={dateFilter} onChange={setDateFilter} />
                                    )}
                                    {selectedFilter === 'Monthly' && (
                                        <MonthPicker value={monthFilter} onChange={setMonthFilter} />
                                    )}

                                    <div className="relative z-20">
                                        <button
                                            onClick={() => { setShowFilters(!showFilters); setShowStatusDropdown(false); }}
                                            className={`text-sm font-bold uppercase tracking-[0.15em] flex items-center gap-2 px-4 py-2 border rounded-xl transition-all ${hasActiveFilters || showFilters ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}
                                        >
                                            <span className="material-symbols-outlined text-sm">filter_list</span>
                                            Filter {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white inline-block ml-1" />}
                                        </button>
                                        {showFilters && (
                                            <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 shadow-xl w-72 p-4 rounded-2xl">
                                                <div className="mb-4">
                                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Priority</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(['all', 'HOT', 'WARM', 'COOL'] as const).map(t => (
                                                            <button
                                                                key={t}
                                                                onClick={() => setPriorityFilter(t)}
                                                                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border rounded-xl transition-all ${priorityFilter === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                                            >
                                                                {t === 'all' ? 'All' : t}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Stage</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {([
                                                            { v: 'all' as const, l: 'All' },
                                                            { v: 'new' as const, l: 'Pending' },
                                                            { v: 'contacted' as const, l: 'Contacted' },
                                                            { v: 'visit_scheduled' as const, l: 'Scheduled' },
                                                            { v: 'closed' as const, l: 'Closed' },
                                                        ]).map(({ v, l }) => (
                                                            <button
                                                                key={v}
                                                                onClick={() => setStageFilter(v)}
                                                                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border rounded-xl transition-all ${stageFilter === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                                            >
                                                                {l}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                {hasActiveFilters && (
                                                    <button
                                                        onClick={() => { setPriorityFilter('all'); setStageFilter('all'); }}
                                                        className="mt-3 text-xs font-bold uppercase tracking-widest text-rose-500 hover:text-rose-700"
                                                    >
                                                        Clear Filters
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6 mb-10">
                                <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-6 shadow-sm">
                                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
                                        <span className="material-symbols-outlined text-rose-500" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Hot Leads</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.hot}</span>
                                            <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">Priority</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-6 shadow-sm">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                                        <span className="material-symbols-outlined text-slate-400">payments</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Average Budget</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-slate-900 tracking-tight">₹{stats.avg.toLocaleString('en-IN')}</span>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">INR</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-6 shadow-sm">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                                        <span className="material-symbols-outlined text-emerald-500">verified_user</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Total Verified Leads</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.verified}</span>
                                            <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Qualified</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-10 shadow-sm">
                                <div className="grid grid-cols-[150px_1fr_auto] gap-6 px-6 py-4 border-b border-slate-100 bg-white">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date Received</div>
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lead Details</div>
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right pr-2">Actions</div>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {loading ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-slate-400 font-medium">
                                            <span className="material-symbols-outlined text-4xl mb-4 animate-spin">refresh</span>
                                            Loading repository...
                                        </div>
                                    ) : filteredLeads.length === 0 ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-slate-400 font-medium">
                                            <span className="material-symbols-outlined text-4xl mb-4">search_off</span>
                                            No leads match the current filters.
                                        </div>
                                    ) : filteredLeads.map((lead, index) => {
                                        const date = new Date(lead.timestamp || Date.now());
                                        const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                                        const hoursDiff = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60));
                                        const timeAgo = hoursDiff > 24 ? `${Math.floor(hoursDiff/24)} days ago` : hoursDiff > 0 ? `${hoursDiff} hrs ago` : 'Just now';
                                        
                                        return (
                                            <div
                                                key={`${lead.id}-${index}`}
                                                className="grid grid-cols-[150px_1fr_auto] gap-6 px-6 py-5 items-center hover:bg-slate-50 transition-colors cursor-pointer"
                                                onClick={() => setDetailLead(lead)}
                                            >
                                                {/* Column 1: Date Received */}
                                                <div className="flex flex-col items-start">
                                                    <span className="text-sm font-bold text-slate-900">{monthDay}</span>
                                                    <span className="text-xs text-slate-500 mt-0.5">{time}</span>
                                                    <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600">
                                                        {timeAgo}
                                                    </span>
                                                </div>

                                                {/* Column 2: Lead Details */}
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900 mb-3">{lead.name}</h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                                        <div className="flex flex-col gap-3">
                                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                                <span className="material-symbols-outlined text-[16px] text-slate-400">call</span>
                                                                {lead.phone || 'N/A'}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[16px] text-slate-400">home</span>
                                                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${lead.propertyType?.toLowerCase().includes('house') || lead.propertyType?.toLowerCase().includes('land') ? 'bg-pink-50 text-pink-600' : 'bg-teal-50 text-teal-600'}`}>
                                                                    {lead.propertyType || 'Any'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-3">
                                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                                <span className="material-symbols-outlined text-[16px] text-slate-400">mail</span>
                                                                <span className="truncate max-w-[200px]">{lead.email || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                                <span className="material-symbols-outlined text-[16px] text-slate-400">location_on</span>
                                                                <span className="truncate max-w-[200px]">{lead.preferredLocation || 'Any'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Column 3: Actions */}
                                                <div className="flex items-center justify-end gap-3" onClick={e => e.stopPropagation()}>
                                                    {lead.phone ? (
                                                        <a
                                                            href={`tel:${lead.phone}`}
                                                            className="flex items-center gap-2 px-4 py-2 bg-[#5e5ce6] text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">call</span>
                                                            Call Lead
                                                        </a>
                                                    ) : (
                                                        <button disabled className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 text-sm font-medium rounded-lg cursor-not-allowed">
                                                            <span className="material-symbols-outlined text-[18px]">call</span>
                                                            Call Lead
                                                        </button>
                                                    )}
                                                    
                                                    <a
                                                        href={lead.phone ? whatsappUrl(lead) : '#'}
                                                        target={lead.phone ? "_blank" : undefined}
                                                        rel="noopener noreferrer"
                                                        className={`flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors ${lead.phone ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 text-slate-400 opacity-50 cursor-not-allowed'}`}
                                                        onClick={e => { if (!lead.phone) e.preventDefault(); }}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]" style={{ color: lead.phone ? '#25D366' : 'inherit' }}>chat</span>
                                                        WhatsApp
                                                    </a>
                                                    
                                                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                                                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                                {!loading && filteredLeads.length > 0 && (
                                    <div className="flex justify-between items-center py-10 mt-4">
                                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                                            Showing {filteredLeads.length.toLocaleString()} of {stats.total.toLocaleString()} Records
                                        </div>
                                    </div>
                                )}
                            </div>
                    </section>
                ) : (
                    <AnalyticsView leads={leads} />
                )}

                <footer className="mt-auto px-12 py-8 bg-white border-t border-slate-100 flex justify-between items-center">
                    <div className="flex gap-12">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">Integrity Status</span>
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-2 uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Operational
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">Queue Load</span>
                            <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">{pendingCount} Pending</span>
                        </div>
                    </div>
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-[0.3em]">
                        Linear Ledger Qualifier System • v5.0.2
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default App;


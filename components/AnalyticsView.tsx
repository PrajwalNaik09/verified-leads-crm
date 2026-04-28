import React, { useMemo } from 'react';
import { VerifiedLead, KanbanStage } from '../types';

interface AnalyticsViewProps {
  leads: VerifiedLead[];
}

const STAGE_COLORS: Record<KanbanStage, string> = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  visit_scheduled: '#8b5cf6',
  closed: '#10b981',
};

const STAGE_LABELS: Record<KanbanStage, string> = {
  new: 'New Leads',
  contacted: 'In Contact',
  visit_scheduled: 'Site Visits',
  closed: 'Closed Deals',
};

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ leads }) => {
  const analyticsData = useMemo(() => {
    if (!leads || leads.length === 0) return null;

    const totalLeads = leads.length;
    const stageCounts: Record<KanbanStage, number> = { new: 0, contacted: 0, visit_scheduled: 0, closed: 0 };
    const typeCounts: Record<string, number> = {};
    const locCounts: Record<string, number> = {};
    const sentimentCounts: Record<string, number> = {};
    let totalBudget = 0;
    let budgetCount = 0;
    
    leads.forEach(l => {
      // 1. Pipeline
      stageCounts[l.stage]++;

      // 2. Preferences
      if (l.propertyType) typeCounts[l.propertyType] = (typeCounts[l.propertyType] || 0) + 1;
      if (l.preferredLocation) locCounts[l.preferredLocation] = (locCounts[l.preferredLocation] || 0) + 1;
      
      // 3. Sentiment
      const sent = l.sentiment?.toLowerCase() || 'neutral';
      sentimentCounts[sent] = (sentimentCounts[sent] || 0) + 1;

      // 4. Budget
      if (typeof l.budgetNum === 'number' && !isNaN(l.budgetNum) && l.budgetNum > 0) {
        totalBudget += l.budgetNum;
        budgetCount++;
      }
    });

    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const sortedLocs = Object.entries(locCounts).sort((a, b) => b[1] - a[1]);

    const conversionRate = Math.round(((stageCounts.visit_scheduled + stageCounts.closed) / totalLeads) * 100);
    const hotLeadRatio = Math.round((leads.filter(l => l.priorityTier === 'HOT').length / totalLeads) * 100);

    const avgBudget = budgetCount > 0 ? Math.round(totalBudget / budgetCount) : 0;
    const avgBudgetFormatted = avgBudget > 0 ? `₹${avgBudget.toLocaleString('en-IN')}` : 'N/A';

    // Funnel Percentage (relative to total leads)
    const funnelSteps = (Object.keys(STAGE_LABELS) as KanbanStage[]).map(s => ({
      label: STAGE_LABELS[s],
      count: stageCounts[s],
      pct: Math.round((stageCounts[s] / totalLeads) * 100),
      color: STAGE_COLORS[s]
    }));

    return {
      totalLeads,
      conversionRate,
      hotLeadRatio,
      avgBudgetFormatted,
      funnelSteps,
      sentimentCounts,
      sortedTypes,
      sortedLocs: sortedLocs.slice(0, 5).map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / (sortedLocs[0]?.[1] || 1)) * 100)
      })),
      mostPopularType: sortedTypes[0]?.[0] || 'N/A',
      topLocality: sortedLocs[0]?.[0] || 'N/A'
    };
  }, [leads]);

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400 font-bold">
        Generating Agent Dashboard...
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-8 py-10 w-full">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">Agent Performance</h1>
        <p className="text-slate-500 text-sm font-semibold tracking-tight uppercase tracking-widest">Market Intelligence & Lead Pipeline</p>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <KPICard 
          icon="analytics" 
          label="Conversion" 
          value={`${analyticsData.conversionRate}%`} 
          sub="Leads to Visits"
          color="teal"
        />
        <KPICard 
          icon="local_fire_department" 
          label="Hot Lead Ratio" 
          value={`${analyticsData.hotLeadRatio}%`} 
          sub="High Intent Leads"
          color="rose"
        />
        <KPICard 
          icon="account_balance_wallet" 
          label="Average Budget" 
          value={analyticsData.avgBudgetFormatted} 
          sub="Based on Valid Leads"
          color="indigo"
        />
        <KPICard 
          icon="group" 
          label="Total Managed" 
          value={analyticsData.totalLeads.toString()} 
          sub="Active Database"
          color="slate"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Sales Pipeline */}
        <div className="lg:col-span-2 space-y-8">
          {/* Sales Funnel */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-slate-900 text-xl font-black tracking-tight">Sales Pipeline</h3>
                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Lead Progression Funnel</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-2xl">
                <span className="material-symbols-outlined text-indigo-600">filter_alt</span>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              {analyticsData.funnelSteps.map((step, i) => (
                <div key={step.label} className="relative">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{step.label}</span>
                    <span className="text-sm font-black text-slate-900">{step.count} Leads</span>
                  </div>
                  <div className="h-12 w-full bg-slate-50 rounded-2xl overflow-hidden flex">
                    <div 
                      className="h-full transition-all duration-1000 flex items-center px-6" 
                      style={{ 
                        width: `${Math.max(step.pct, 5)}%`, 
                        backgroundColor: step.color,
                        opacity: 1 - (i * 0.1)
                      }}
                    >
                      {step.pct > 15 && <span className="text-sm font-black text-white">{step.pct}% Reach</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Property Types - Re-adding this as a main chart since budget is gone */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
            <h3 className="text-slate-900 text-xl font-black tracking-tight mb-1">Property Demand</h3>
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-8">In-Demand Categories</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {analyticsData.sortedTypes.slice(0, 4).map(([type, count]) => (
                <div key={type} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{type}</p>
                  <p className="text-2xl font-black text-slate-900">{count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Market Intel */}
        <div className="space-y-8">
          {/* Sentiment Pulse */}
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
            <h3 className="text-xl font-black tracking-tight mb-1">Market Sentiment</h3>
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-8">AI Intent Analysis</p>
            <div className="flex flex-col gap-6">
              <SentimentRow 
                label="Positive" 
                count={analyticsData.sentimentCounts.positive || 0} 
                total={analyticsData.totalLeads}
                color="bg-teal-400"
              />
              <SentimentRow 
                label="Neutral" 
                count={analyticsData.sentimentCounts.neutral || 0} 
                total={analyticsData.totalLeads}
                color="bg-slate-400"
              />
              <SentimentRow 
                label="Negative" 
                count={analyticsData.sentimentCounts.negative || 0} 
                total={analyticsData.totalLeads}
                color="bg-rose-400"
              />
            </div>
          </div>

          {/* Location Hotspots */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
            <h3 className="text-slate-900 text-xl font-black tracking-tight mb-1">Top Localities</h3>
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-8">Lead Volume Hotspots</p>
            <div className="space-y-6">
              {analyticsData.sortedLocs.map((loc) => (
                <div key={loc.name} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                    <span className="text-slate-700 truncate pr-2">{loc.name}</span>
                    <span className="text-slate-400">{loc.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${loc.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard: React.FC<{ icon: string; label: string; value: string; sub: string; color: string }> = ({ 
  icon, label, value, sub, color 
}) => {
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-50 text-slate-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${colorMap[color]}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
      </div>
      <div>
        <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-1">{value}</p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{sub}</p>
      </div>
    </div>
  );
};

const SentimentRow: React.FC<{ label: string; count: number; total: number; color: string }> = ({ 
  label, count, total, color 
}) => {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
        <span>{label}</span>
        <span className="text-slate-400">{pct}%</span>
      </div>
      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default AnalyticsView;



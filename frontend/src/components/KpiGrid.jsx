import React from 'react';
import { Users, TrendingUp, DollarSign, ShieldCheck, MoreVertical, ArrowUpRight } from 'lucide-react';

export default function KpiGrid({ metrics, communityCounts }) {
  if (!metrics) return null;

  const cards = [
    {
      title: 'District Population',
      badge: '2024',
      badgeColor: 'bg-indigo-50 text-indigo-700',
      value: metrics.total_population?.toLocaleString() || '610,202',
      trend: `+${metrics.population_growth_pct || '2.4'}% vs 2020`,
      trendPositive: true,
      icon: Users,
    },
    {
      title: 'Surveyed Families',
      badge: '4Ps Sample',
      badgeColor: 'bg-amber-50 text-amber-700',
      value: metrics.surveyed_families?.toLocaleString() || '4,545',
      trend: `${metrics.active_4ps_share_avg || '81.9'}% active beneficiaries`,
      trendPositive: false,
      icon: TrendingUp,
    },
    {
      title: 'Avg. Per-Capita Income',
      badge: 'Monthly',
      badgeColor: 'bg-emerald-50 text-emerald-700',
      value: `₱${metrics.avg_per_capita_income?.toLocaleString() || '3,963'}`,
      trend: 'District V baseline benchmark',
      trendPositive: true,
      icon: DollarSign,
    },
    {
      title: 'Model Confidence',
      badge: 'Within 1 Tier',
      badgeColor: 'bg-sky-50 text-sky-700',
      value: `${metrics.within_one_tier || '84.6'}%`,
      trend: `${metrics.conformal_coverage || '90.4'}% conformal guarantee`,
      trendPositive: true,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {card.title}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>
              <button className="text-slate-300 hover:text-slate-500">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold tracking-tight text-slate-900 font-display">
                {card.value}
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-1.5 text-xs">
              <span className={`font-semibold flex items-center gap-1 ${card.trendPositive ? 'text-emerald-600' : 'text-slate-500'}`}>
                {card.trendPositive && <ArrowUpRight className="w-3.5 h-3.5" />}
                {card.trend}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

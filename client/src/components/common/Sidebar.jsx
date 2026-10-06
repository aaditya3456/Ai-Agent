import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  CheckSquare,
  Bot,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';

export const Sidebar = () => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/resume', label: 'Resume Profile', icon: FileText },
    { to: '/jobs', label: 'Job Opportunities', icon: Briefcase },
    { to: '/applications', label: 'Applications', icon: CheckSquare },
    { to: '/agent', label: 'AI Agent Chat', icon: Bot, highlight: true },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden md:flex min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-950">
            <Zap className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <span className="font-bold text-slate-100 tracking-tight text-base block leading-none">
              CareerAgent<span className="text-emerald-400">.ai</span>
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              Autonomous Copilot
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.highlight && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30">
                    <Sparkles className="w-2.5 h-2.5" /> Live
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="p-4 m-4 rounded-xl bg-slate-850 border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          AI Agent Ready
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Function-calling engine enabled with strict candidate safety safeguards.
        </p>
      </div>
    </aside>
  );
};

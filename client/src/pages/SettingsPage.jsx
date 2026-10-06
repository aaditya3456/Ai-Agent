import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import {
  User,
  Settings,
  Cpu,
  Shield,
  Activity,
  CheckCircle,
  KeyRound,
  Database,
} from 'lucide-react';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const checkApiHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await api.get('/health');
      setHealth(res.data);
    } catch (err) {
      setHealth({ success: false, message: 'Backend unreachable' });
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkApiHealth();
  }, []);

  const toolsList = [
    { name: 'getUserResume', desc: 'Reads current candidate resume profile and skills' },
    { name: 'searchJobs', desc: 'Queries user jobs by keyword, skills, or status' },
    { name: 'getJob', desc: 'Retrieves complete job posting details and requirements' },
    { name: 'analyzeJobDescription', desc: 'Runs AI extraction of required vs preferred criteria' },
    { name: 'matchResumeToJob', desc: 'Performs transparent compatibility heuristic breakdown' },
    { name: 'saveJob', desc: 'Persists a new job opportunity to user database' },
    { name: 'updateApplicationStatus', desc: 'Updates pipeline status (Applied, Interview, etc.)' },
    { name: 'generateApplicationMessage', desc: 'Drafts grounded cover notes with selected tone' },
    { name: 'getApplicationHistory', desc: 'Retrieves active application pipeline records' },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">System & Account Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Review candidate identity, AI provider connection parameters, and tool authorization policies.
        </p>
      </div>

      {/* User Account Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
            <User className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">{user?.name}</h3>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400 block mb-1">User Identifier</span>
            <span className="font-mono text-slate-200 text-[11px] truncate block">{user?.id || 'Active'}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400 block mb-1">Authorization Mode</span>
            <span className="font-semibold text-emerald-400">JWT Token Isolated</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400 block mb-1">Tenant Partitioning</span>
            <span className="font-semibold text-slate-200">Enforced by User ID</span>
          </div>
        </div>
      </div>

      {/* Backend API & Database Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-slate-100">Backend API Health</h3>
          </div>
          <Button size="sm" variant="secondary" loading={checkingHealth} onClick={checkApiHealth}>
            Re-check Health
          </Button>
        </div>

        {health && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Status:</span>
              <span className="font-semibold text-emerald-400">
                {health.success ? 'Operational (200 OK)' : 'Unhealthy'}
              </span>
            </div>
            {health.data && (
              <>
                <div className="flex justify-between text-slate-400">
                  <span>Database Connection:</span>
                  <span className="font-medium text-slate-200 uppercase">{health.data.database}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Server Environment:</span>
                  <span className="font-medium text-slate-200">{health.data.environment}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Process Uptime:</span>
                  <span className="font-medium text-slate-200">{Math.round(health.data.uptime)} seconds</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* AI Tool Registry Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-slate-100">Registered Agent Tools ({toolsList.length})</h3>
        </div>
        <p className="text-xs text-slate-400">
          The AI Agent only invokes deterministic, authorized micro-tools to inspect data or modify state:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {toolsList.map((tool, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-xs font-mono font-semibold text-emerald-400 block">{tool.name}</span>
              <span className="text-[11px] text-slate-400 block">{tool.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

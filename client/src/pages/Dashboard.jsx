import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applicationService } from '../services/applicationService.js';
import { jobService } from '../services/jobService.js';
import { resumeService } from '../services/resumeService.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Button } from '../components/common/Button.jsx';
import { APPLICATION_STATUS_CONFIG } from '../utils/constants.js';
import { formatDate } from '../utils/formatters.js';
import {
  Briefcase,
  FileCheck,
  Send,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  UploadCloud,
  Bot,
} from 'lucide-react';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [recentApps, setRecentApps] = useState([]);
  const [activeResume, setActiveResume] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsData, jobsData, appsData, resumesData] = await Promise.all([
          applicationService.getApplicationStats(),
          jobService.getJobs({ limit: 5 }),
          applicationService.getApplications(),
          resumeService.getResumes(),
        ]);

        setStats(statsData.stats);
        setRecentJobs(jobsData.jobs || []);
        setRecentApps((appsData.applications || []).slice(0, 5));
        if (resumesData.resumes?.length > 0) {
          setActiveResume(resumesData.resumes[0]);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading dashboard analytics..." size="lg" />;
  }

  const statCards = [
    {
      label: 'Total Saved Jobs',
      value: stats?.totalJobs || 0,
      icon: Briefcase,
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/40 border-blue-800/40',
    },
    {
      label: 'Jobs Analyzed by AI',
      value: stats?.analyzedJobs || 0,
      icon: FileCheck,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-800/40',
    },
    {
      label: 'Active Applications',
      value: stats?.totalApplications || 0,
      icon: Send,
      color: 'text-purple-400',
      bgColor: 'bg-purple-950/40 border-purple-800/40',
    },
    {
      label: 'Interviews & Offers',
      value: (stats?.interview || 0) + (stats?.offer || 0),
      icon: Calendar,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-800/40',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Career Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time status of resume indexing, job compatibility, and agent actions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/jobs">
            <Button variant="secondary" size="md">
              <Briefcase className="w-4 h-4 mr-2" />
              Manage Jobs
            </Button>
          </Link>
          <Link to="/agent">
            <Button variant="primary" size="md">
              <Bot className="w-4 h-4 mr-2" />
              Launch Agent
            </Button>
          </Link>
        </div>
      </div>

      {/* Resume Status Callout if not uploaded */}
      {!activeResume && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-900/50 flex items-center justify-center text-amber-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-200">No active resume indexed</h4>
              <p className="text-xs text-amber-300/80">
                Upload your resume (PDF or Word) so the AI Agent can parse skills and compute compatibility.
              </p>
            </div>
          </div>
          <Link to="/resume">
            <Button size="sm" variant="secondary" className="border-amber-700/60 text-amber-300">
              <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Upload Resume
            </Button>
          </Link>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className={`p-5 rounded-2xl border ${stat.bgColor} flex items-center justify-between transition-transform hover:-translate-y-0.5`}
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{stat.label}</p>
                <h3 className="text-3xl font-bold text-slate-100 mt-1">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl bg-slate-900/60 ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Recent Jobs + Pipeline Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Jobs with Match Scores */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Recent Job Opportunities
            </h2>
            <Link to="/jobs" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 overflow-hidden shadow-sm">
            {recentJobs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No jobs added yet. Click <Link to="/jobs" className="text-emerald-400 underline">Add Job</Link> to import a job description.
              </div>
            ) : (
              recentJobs.map((job) => {
                const score = job.matchResult?.matchScore;
                return (
                  <Link
                    key={job._id}
                    to={`/jobs/${job._id}`}
                    className="p-5 flex items-center justify-between hover:bg-slate-850/60 transition group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-100 group-hover:text-emerald-400 transition text-sm">
                          {job.title}
                        </h4>
                        {job.employmentType && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                            {job.employmentType}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {job.company} • {job.location || 'Remote'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {score !== undefined ? (
                        <div className="text-right">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                              score >= 70
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                : score >= 45
                                ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {score}% Match
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1">Heuristic</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Unanalyzed</span>
                      )}
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* AI Copilot Prompt Bar */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Need immediate application help?</h4>
                <p className="text-xs text-slate-400">
                  Ask the AI Agent to identify missing skills or generate custom cover notes.
                </p>
              </div>
            </div>
            <Link to="/agent">
              <Button size="sm" variant="primary">
                Chat with Copilot
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Column: Applications Tracker Pipeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Applications Pipeline</h2>
            <Link to="/applications" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
              Pipeline View
            </Link>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 divide-y divide-slate-800/80">
            {recentApps.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No active applications tracked yet.
              </div>
            ) : (
              recentApps.map((app) => {
                const statusStyle = APPLICATION_STATUS_CONFIG[app.status] || {
                  color: 'bg-slate-800 text-slate-300 border-slate-700',
                };
                return (
                  <div key={app._id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        {app.jobId?.title || 'Job Opportunity'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {app.jobId?.company || 'Company'} • {formatDate(app.updatedAt)}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle.color}`}
                    >
                      {app.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Stats Summary */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              System Health & Indexing
            </span>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Active Resume</span>
              <span className="font-semibold text-emerald-400">
                {activeResume ? activeResume.fileName : 'None'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Extracted Skills</span>
              <span className="font-semibold text-slate-200">
                {activeResume ? `${activeResume.skills?.length || 0} skills` : '0'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Tool Function Calling</span>
              <span className="font-semibold text-emerald-400">Active (9 tools)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

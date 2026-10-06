import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobService } from '../services/jobService.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { formatDate } from '../utils/formatters.js';
import {
  Briefcase,
  Plus,
  Search,
  ArrowRight,
  Trash2,
  Sparkles,
  ExternalLink,
  MapPin,
  Building,
} from 'lucide-react';

export const JobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    location: 'Remote',
    employmentType: 'Full-time',
    description: '',
    sourceUrl: '',
  });

  const fetchJobs = async () => {
    try {
      const data = await jobService.getJobs({ search });
      setJobs(data.jobs || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchJobs();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await jobService.createJob(newJob);
      setIsAddModalOpen(false);
      setNewJob({
        title: '',
        company: '',
        location: 'Remote',
        employmentType: 'Full-time',
        description: '',
        sourceUrl: '',
      });
      fetchJobs();
    } catch (err) {
      alert(err.message || 'Failed to create job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this job?')) return;
    try {
      await jobService.deleteJob(id);
      fetchJobs();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Job Opportunities</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track prospective roles, trigger AI requirement extraction, and evaluate resume fit.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsAddModalOpen(true)} icon={Plus}>
          Add Job Opportunity
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by job title, company name, skill, or keyword..."
          className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
        />
      </div>

      {/* Jobs Grid/List */}
      {loading ? (
        <LoadingSpinner label="Fetching job opportunities..." size="lg" />
      ) : jobs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Briefcase className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-base font-medium text-slate-200">No Job Postings Found</h3>
          <p className="text-xs max-w-sm mx-auto">
            {search ? 'No jobs match your search query.' : 'Add your first job to start matching against your resume.'}
          </p>
          {!search && (
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(true)} className="mt-2">
              <Plus className="w-4 h-4 mr-1.5" /> Add Job
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => {
            const matchScore = job.matchResult?.matchScore;
            return (
              <Link
                key={job._id}
                to={`/jobs/${job._id}`}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5 group shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-100 group-hover:text-emerald-400 transition text-base leading-snug">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5" />
                          {job.company}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.location}
                        </span>
                      </div>
                    </div>

                    {matchScore !== undefined && (
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                          matchScore >= 70
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                            : matchScore >= 45
                            ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {matchScore}% Match
                      </span>
                    )}
                  </div>

                  {/* Skills tags preview */}
                  <div className="flex flex-wrap gap-1.5">
                    {(job.skills || []).slice(0, 4).map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[10px] bg-slate-950 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                    {(job.skills?.length || 0) > 4 && (
                      <span className="text-[10px] text-slate-400 self-center">
                        +{job.skills.length - 4} more
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Added {formatDate(job.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeleteJob(e, job._id)}
                      className="p-1 hover:text-rose-400 rounded transition"
                      title="Delete job"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                      View Analysis <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Add Job Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Job Opportunity">
        <form onSubmit={handleCreateJob} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Job Title *
              </label>
              <input
                type="text"
                required
                value={newJob.title}
                onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                placeholder="e.g. Senior Backend Engineer"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Company *
              </label>
              <input
                type="text"
                required
                value={newJob.company}
                onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                placeholder="e.g. Stripe, OpenAI, TechCorp"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={newJob.location}
                onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                placeholder="Remote / San Francisco, CA"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Employment Type
              </label>
              <select
                value={newJob.employmentType}
                onChange={(e) => setNewJob({ ...newJob, employmentType: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Job URL (Optional)
            </label>
            <input
              type="url"
              value={newJob.sourceUrl}
              onChange={(e) => setNewJob({ ...newJob, sourceUrl: e.target.value })}
              placeholder="https://company.com/careers/job-id"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Job Description *
            </label>
            <textarea
              required
              rows={6}
              value={newJob.description}
              onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
              placeholder="Paste full job posting description, requirements, and responsibilities here..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Save and Analyze Job
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jobService } from '../services/jobService.js';
import { applicationService } from '../services/applicationService.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { APPLICATION_STATUS_CONFIG, STATUS_LIST, TONE_OPTIONS } from '../utils/constants.js';
import { formatDate } from '../utils/formatters.js';
import {
  Briefcase,
  Building,
  MapPin,
  ExternalLink,
  Sparkles,
  CheckCircle,
  XCircle,
  FolderGit2,
  Copy,
  Check,
  Send,
  RefreshCw,
  ArrowLeft,
  Calendar,
} from 'lucide-react';

export const JobDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [matching, setMatching] = useState(false);

  // Message Generator Modal State
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedTone, setSelectedTone] = useState('Professional');
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Application Status Modal State
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('Saved');
  const [appNotes, setAppNotes] = useState('');

  const fetchJobData = async () => {
    try {
      const data = await jobService.getJobById(id);
      setJob(data.job);
      setApplication(data.application);
      if (data.application) {
        setNewStatus(data.application.status);
        setAppNotes(data.application.notes || '');
        if (data.application.generatedMessage?.content) {
          setGeneratedMessage(data.application.generatedMessage.content);
        }
      }
    } catch (err) {
      console.error(err);
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, [id]);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const data = await jobService.analyzeJob(id);
      setJob(data.job);
    } catch (err) {
      alert(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunMatching = async () => {
    setMatching(true);
    try {
      const data = await jobService.matchJob(id);
      setJob((prev) => ({ ...prev, matchResult: data.matchResult }));
    } catch (err) {
      alert(err.message || 'Matching failed');
    } finally {
      setMatching(false);
    }
  };

  const handleGenerateMessage = async () => {
    setGeneratingMessage(true);
    try {
      const data = await jobService.generateMessage(id, selectedTone);
      setGeneratedMessage(data.message);
    } catch (err) {
      alert(err.message || 'Message generation failed');
    } finally {
      setGeneratingMessage(false);
    }
  };

  const handleCopyMessage = () => {
    if (!generatedMessage) return;
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveApplication = async (e) => {
    e.preventDefault();
    try {
      if (application) {
        await applicationService.updateApplication(application._id, {
          status: newStatus,
          notes: appNotes,
        });
      } else {
        await applicationService.createApplication({
          jobId: job._id,
          status: newStatus,
          notes: appNotes,
        });
      }
      setIsAppModalOpen(false);
      fetchJobData();
    } catch (err) {
      alert(err.message || 'Failed to update application');
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading job intelligence..." size="lg" />;
  }

  if (!job) return null;

  const analysis = job.parsedAnalysis || {};
  const match = job.matchResult || {};
  const appStatusStyle = application
    ? APPLICATION_STATUS_CONFIG[application.status] || { color: 'bg-slate-800 text-slate-300 border-slate-700' }
    : null;

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-100 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Jobs
        </Link>
      </div>

      {/* Top Banner Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                {job.title}
              </h1>
              {application && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${appStatusStyle.color}`}>
                  Pipeline: {application.status}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-emerald-400" />
                {job.company}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                {job.location}
              </span>
              <span>•</span>
              <span className="text-slate-400">Type: {job.employmentType}</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {job.sourceUrl && (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
              >
                Open Job URL <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAppModalOpen(true)}
              icon={Briefcase}
            >
              {application ? 'Update Application' : 'Add to Pipeline'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsMessageModalOpen(true);
                if (!generatedMessage) handleGenerateMessage();
              }}
              icon={Send}
            >
              Generate Outreach Note
            </Button>
          </div>
        </div>

        {/* Compatibility Heuristic Highlight */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-xl border ${
                match.matchScore >= 70
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                  : match.matchScore >= 45
                  ? 'bg-amber-950/60 text-amber-400 border-amber-800/80'
                  : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}
            >
              <span>{match.matchScore ?? '—'}%</span>
              <span className="text-[9px] uppercase font-normal tracking-wider text-slate-400">Match</span>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-200">Transparent Alignment Breakdown</h4>
              <p className="text-xs text-slate-400 max-w-xl mt-0.5 leading-relaxed">
                {match.analysis ||
                  'No matching analysis generated yet. Click re-match to calculate heuristic alignment against your active resume.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" loading={matching} onClick={handleRunMatching} icon={RefreshCw}>
              Re-Match Resume
            </Button>
            <Button variant="outline" size="sm" loading={analyzing} onClick={handleRunAnalysis} icon={Sparkles}>
              Analyze Posting
            </Button>
          </div>
        </div>
      </div>

      {/* Main Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Required vs Preferred Skills & Matching */}
        <div className="lg:col-span-2 space-y-6">
          {/* Skills Alignment Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Skill Overlap & Gap Matrix
            </h3>

            {/* Matched Skills */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Matched Skills ({match.matchedSkills?.length || 0})</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(match.matchedSkills?.length ? match.matchedSkills : ['No matches identified yet']).map(
                  (skill, i) => (
                    <Badge key={i} variant="primary" size="sm">
                      {skill}
                    </Badge>
                  )
                )}
              </div>
            </div>

            {/* Missing Required Skills */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Missing Required Skills ({match.missingRequiredSkills?.length || 0})</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(match.missingRequiredSkills?.length
                  ? match.missingRequiredSkills
                  : ['None! All required skills matched.']
                ).map((skill, i) => (
                  <Badge key={i} variant={match.missingRequiredSkills?.length ? 'rose' : 'primary'} size="sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Missing Preferred Skills */}
            {match.missingPreferredSkills?.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <XCircle className="w-4 h-4 text-amber-400" />
                  <span>Missing Preferred / Nice-to-Have Skills ({match.missingPreferredSkills.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {match.missingPreferredSkills.map((skill, i) => (
                    <Badge key={i} variant="amber" size="sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Relevant Projects Alignment */}
          {match.relevantProjects?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-emerald-400" />
                Relevant Candidate Projects
              </h3>
              <div className="space-y-3">
                {match.relevantProjects.map((proj, pIdx) => (
                  <div key={pIdx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-200">{proj.name}</h4>
                    <p className="text-xs text-slate-400">{proj.description}</p>
                    {proj.overlappingTech?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <span className="text-[10px] text-slate-400 self-center mr-1">Overlaps:</span>
                        {proj.overlappingTech.map((t, tIdx) => (
                          <span key={tIdx} className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Original Job Description */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h3 className="text-base font-semibold text-slate-100">Job Description</h3>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans max-h-96 overflow-y-auto">
              {job.description}
            </div>
          </div>
        </div>

        {/* Right Column: Requirements & Notes */}
        <div className="space-y-6">
          {/* Key Job Specifications */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-100">Role Criteria</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Experience Level</span>
                <span className="font-semibold text-slate-200">
                  {analysis.yearsOfExperience?.text || `${analysis.yearsOfExperience?.min || 0}+ years`}
                </span>
              </div>

              {analysis.educationRequirements?.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400 block mb-1">Education</span>
                  <span className="font-medium text-slate-200">
                    {analysis.educationRequirements.join(', ')}
                  </span>
                </div>
              )}

              {analysis.responsibilities?.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400 block mb-1.5 font-semibold">Core Responsibilities</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {analysis.responsibilities.slice(0, 4).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Application Tracker Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">Application Status</h3>
              <Button size="sm" variant="secondary" onClick={() => setIsAppModalOpen(true)}>
                Edit
              </Button>
            </div>

            {application ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Current Stage</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full border ${appStatusStyle.color}`}>
                    {application.status}
                  </span>
                </div>
                {application.notes && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400 block">Notes:</span>
                    <p className="text-slate-300">{application.notes}</p>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                  <span>Last updated</span>
                  <span>{formatDate(application.updatedAt)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-xs text-slate-400">This job is not currently tracked in your pipeline.</p>
                <Button size="sm" variant="primary" onClick={() => setIsAppModalOpen(true)}>
                  Add to Application Pipeline
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generated Message Modal */}
      <Modal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        title={`Customized Outreach Note for ${job.company}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Tone:</span>
              <div className="flex gap-1.5">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => {
                      setSelectedTone(tone);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                      selectedTone === tone
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              variant="secondary"
              loading={generatingMessage}
              onClick={handleGenerateMessage}
              icon={RefreshCw}
            >
              Regenerate
            </Button>
          </div>

          <div className="relative">
            <textarea
              readOnly
              rows={10}
              value={generatedMessage}
              placeholder="Generating personalized outreach message based strictly on your resume..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              * Grounded strictly in your parsed candidate resume without hallucinated facts.
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopyMessage}
              disabled={!generatedMessage}
              icon={copied ? Check : Copy}
            >
              {copied ? 'Copied to Clipboard!' : 'Copy Note'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Application Status Modal */}
      <Modal
        isOpen={isAppModalOpen}
        onClose={() => setIsAppModalOpen(false)}
        title="Update Application Pipeline"
      >
        <form onSubmit={handleSaveApplication} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Pipeline Stage
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none"
            >
              {STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Notes & Follow-ups
            </label>
            <textarea
              rows={4}
              value={appNotes}
              onChange={(e) => setAppNotes(e.target.value)}
              placeholder="e.g. Applied via referral, follow-up scheduled for next Tuesday..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsAppModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Status
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

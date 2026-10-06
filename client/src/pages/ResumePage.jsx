import React, { useState, useEffect } from 'react';
import { resumeService } from '../services/resumeService.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { formatDate } from '../utils/formatters.js';
import {
  UploadCloud,
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Code2,
  FolderGit2,
  Sparkles,
} from 'lucide-react';

export const ResumePage = () => {
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchResumes = async () => {
    try {
      const data = await resumeService.getResumes();
      setResumes(data.resumes || []);
      if (data.resumes && data.resumes.length > 0) {
        // Fetch full resume with profile
        const full = await resumeService.getResumeById(data.resumes[0]._id);
        setSelectedResume(full.resume);
      } else {
        setSelectedResume(null);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load resumes.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setAlert(null);

    try {
      const data = await resumeService.uploadResume(file);
      setAlert({ type: 'success', message: 'Resume uploaded and analyzed successfully!' });
      await fetchResumes();
      if (data.resume?._id) {
        const full = await resumeService.getResumeById(data.resume._id);
        setSelectedResume(full.resume);
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to upload resume.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleReanalyze = async () => {
    if (!selectedResume) return;
    setAnalyzing(true);
    setAlert(null);

    try {
      const data = await resumeService.analyzeResume(selectedResume._id);
      setSelectedResume(data.resume);
      setAlert({ type: 'success', message: 'Resume re-analysis completed successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Analysis failed.' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    try {
      await resumeService.deleteResume(id);
      setAlert({ type: 'success', message: 'Resume deleted.' });
      fetchResumes();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete resume.' });
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading resume profiles..." size="lg" />;
  }

  const profile = selectedResume?.parsedProfile || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Resume Intelligence</h1>
          <p className="text-sm text-slate-400 mt-1">
            Structured skill extraction, experience indexing, and automated candidate profile.
          </p>
        </div>

        {selectedResume && (
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              loading={analyzing}
              onClick={handleReanalyze}
              icon={RefreshCw}
            >
              Re-analyze AI Profile
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(selectedResume._id)}
              icon={Trash2}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
            alert.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
          }`}
        >
          {alert.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          dragActive
            ? 'border-emerald-500 bg-emerald-950/20'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
        }`}
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Drag & drop your resume, or browse files
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports PDF (.pdf), Microsoft Word (.docx), or plain text (.txt) up to 5MB.
            </p>
          </div>
          <div>
            <label className="inline-block">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                disabled={uploading}
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />
              <span className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition">
                {uploading ? 'Parsing & Extracting...' : 'Select File from Computer'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Active Parsed Profile Display */}
      {selectedResume ? (
        <div className="space-y-6">
          {/* Resume Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 text-base">{selectedResume.fileName}</h3>
                  <p className="text-xs text-slate-400">
                    Uploaded on {formatDate(selectedResume.createdAt)} • Format:{' '}
                    {selectedResume.fileType?.toUpperCase()}
                  </p>
                </div>
              </div>
              <Badge variant="primary" size="md">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Analyzed
              </Badge>
            </div>

            {/* Professional Summary */}
            <div className="pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Professional Summary
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                {profile.professionalSummary || 'No summary text provided in resume.'}
              </p>
            </div>
          </div>

          {/* Extracted Skills Categorization */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-emerald-400" />
              Categorized Skill Inventory
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Programming Languages */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">Programming Languages</span>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.programmingLanguages?.length ? profile.programmingLanguages : ['None detected']).map(
                    (s, i) => (
                      <Badge key={i} variant="blue" size="sm">
                        {s}
                      </Badge>
                    )
                  )}
                </div>
              </div>

              {/* Frameworks & Libraries */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">Frameworks & Libraries</span>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.frameworks?.length ? profile.frameworks : ['None detected']).map((s, i) => (
                    <Badge key={i} variant="primary" size="sm">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Databases */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">Databases & Storage</span>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.databases?.length ? profile.databases : ['None detected']).map((s, i) => (
                    <Badge key={i} variant="purple" size="sm">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Tools & DevOps */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">Tools, Cloud & DevOps</span>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.tools?.length ? profile.tools : ['None detected']).map((s, i) => (
                    <Badge key={i} variant="amber" size="sm">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Work Experience */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-400" />
              Work Experience
            </h3>

            {profile.experience?.length ? (
              <div className="space-y-4">
                {profile.experience.map((exp, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-200">
                        {exp.title} <span className="text-emerald-400">@ {exp.company}</span>
                      </h4>
                      <span className="text-xs text-slate-400">
                        {exp.startDate} - {exp.current ? 'Present' : exp.endDate || 'N/A'}
                      </span>
                    </div>
                    {exp.description && <p className="text-xs text-slate-300">{exp.description}</p>}
                    {exp.achievements?.length > 0 && (
                      <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 pt-1">
                        {exp.achievements.map((ach, aIdx) => (
                          <li key={aIdx}>{ach}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No structured employment history isolated.</p>
            )}
          </div>

          {/* Projects and Education Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Projects */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-emerald-400" />
                Featured Projects
              </h3>
              {profile.projects?.length ? (
                <div className="space-y-3">
                  {profile.projects.map((proj, pIdx) => (
                    <div key={pIdx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                      <h4 className="text-xs font-semibold text-slate-200">{proj.name}</h4>
                      <p className="text-xs text-slate-400">{proj.description}</p>
                      {proj.technologies?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {proj.technologies.map((t, tIdx) => (
                            <span key={tIdx} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No project records extracted.</p>
              )}
            </div>

            {/* Education */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                Education & Credentials
              </h3>
              {profile.education?.length ? (
                <div className="space-y-3">
                  {profile.education.map((edu, eIdx) => (
                    <div key={eIdx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <h4 className="text-xs font-semibold text-slate-200">{edu.institution}</h4>
                      <p className="text-xs text-slate-300">
                        {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                      </p>
                      {edu.graduationYear && (
                        <span className="text-[11px] text-slate-400 block">Class of {edu.graduationYear}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No educational credentials isolated.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <FileText className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-base font-medium text-slate-200">No Resume Uploaded Yet</h3>
          <p className="text-xs max-w-sm mx-auto">
            Upload your resume above to extract skills and enable AI matching across your saved jobs.
          </p>
        </div>
      )}
    </div>
  );
};

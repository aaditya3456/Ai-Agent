import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applicationService } from '../services/applicationService.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { APPLICATION_STATUS_CONFIG, STATUS_LIST } from '../utils/constants.js';
import { formatDate } from '../utils/formatters.js';
import {
  CheckSquare,
  Building,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const ApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [editingApp, setEditingApp] = useState(null);
  const [editStatus, setEditStatus] = useState('Saved');
  const [editNotes, setEditNotes] = useState('');

  const fetchApplications = async () => {
    try {
      const data = await applicationService.getApplications();
      setApplications(data.applications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleOpenEdit = (app) => {
    setEditingApp(app);
    setEditStatus(app.status);
    setEditNotes(app.notes || '');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingApp) return;

    try {
      await applicationService.updateApplication(editingApp._id, {
        status: editStatus,
        notes: editNotes,
      });
      setEditingApp(null);
      fetchApplications();
    } catch (err) {
      alert(err.message || 'Failed to update');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this application from tracking?')) return;
    try {
      await applicationService.deleteApplication(id);
      fetchApplications();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  const filteredApps =
    filterStatus === 'ALL'
      ? applications
      : applications.filter((a) => a.status === filterStatus);

  if (loading) {
    return <LoadingSpinner label="Loading application pipeline..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Application Pipeline</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track interview rounds, follow-up notes, and offer statuses.
          </p>
        </div>
        <Link to="/jobs">
          <Button variant="primary" size="sm">
            Browse Saved Jobs
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80">
        <button
          onClick={() => setFilterStatus('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            filterStatus === 'ALL'
              ? 'bg-slate-800 text-slate-100 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({applications.length})
        </button>
        {STATUS_LIST.map((st) => {
          const count = applications.filter((a) => a.status === st).length;
          return (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                filterStatus === st
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{st}</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Applications Cards Grid */}
      {filteredApps.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <CheckSquare className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-base font-medium text-slate-200">No Applications in this Stage</h3>
          <p className="text-xs max-w-sm mx-auto">
            You don't have any opportunities tracked in the "{filterStatus}" stage yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => {
            const statusStyle = APPLICATION_STATUS_CONFIG[app.status] || {
              color: 'bg-slate-800 text-slate-300 border-slate-700',
            };
            const job = app.jobId || {};

            return (
              <div
                key={app._id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/jobs/${job._id}`}
                        className="font-semibold text-slate-100 hover:text-emerald-400 transition text-sm leading-snug line-clamp-1"
                      >
                        {job.title || 'Job Opportunity'}
                      </Link>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400" />
                        {job.company || 'Company'}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${statusStyle.color}`}
                    >
                      {app.status}
                    </span>
                  </div>

                  {app.notes ? (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                      {app.notes}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/40 text-[11px] text-slate-400 italic">
                      No status notes added.
                    </div>
                  )}

                  {/* Outreach Note Badge if generated */}
                  {app.generatedMessage?.content && (
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Outreach note drafted
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px]">Updated {formatDate(app.updatedAt)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(app)}
                      className="p-1 text-slate-400 hover:text-slate-100 rounded transition"
                      title="Edit status/notes"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(app._id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Application Modal */}
      <Modal
        isOpen={!!editingApp}
        onClose={() => setEditingApp(null)}
        title="Edit Application Stage & Notes"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Pipeline Stage
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none"
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
              Progress Notes
            </label>
            <textarea
              rows={4}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Record details about interview round, interviewer feedback, salary expectations..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setEditingApp(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Update Stage
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

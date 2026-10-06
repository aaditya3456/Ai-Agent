import { Application, APPLICATION_STATUSES } from '../models/Application.js';
import { Job } from '../models/Job.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { successResponse } from '../utils/apiResponse.js';

export const createApplication = async (req, res, next) => {
  try {
    const { jobId, status = 'Saved', notes = '' } = req.body;

    const job = await Job.findOne({ _id: jobId, userId: req.user._id });
    if (!job) {
      return next(new AppError('Job not found or does not belong to you.', 404, 'JOB_NOT_FOUND'));
    }

    const existing = await Application.findOne({ userId: req.user._id, jobId });
    if (existing) {
      return next(new AppError('An application for this job is already being tracked.', 409, 'APPLICATION_EXISTS'));
    }

    const application = await Application.create({
      userId: req.user._id,
      jobId,
      status,
      notes,
      appliedAt: status === 'Applied' ? new Date() : null,
      timeline: [{ status, note: notes || `Created with status: ${status}` }],
    });

    return successResponse(res, 201, 'Application created successfully', { application });
  } catch (error) {
    next(error);
  }
};

export const getApplications = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user._id };

    if (status && APPLICATION_STATUSES.includes(status)) {
      filter.status = status;
    }

    const applications = await Application.find(filter)
      .populate('jobId')
      .sort({ updatedAt: -1 });

    return successResponse(res, 200, 'Applications retrieved', { applications });
  } catch (error) {
    next(error);
  }
};

export const getApplicationStats = async (req, res, next) => {
  try {
    const applications = await Application.find({ userId: req.user._id });
    const totalJobs = await Job.countDocuments({ userId: req.user._id });
    const analyzedJobs = await Job.countDocuments({ userId: req.user._id, 'parsedAnalysis.isAnalyzed': true });

    const stats = {
      totalJobs,
      analyzedJobs,
      totalApplications: applications.length,
      saved: applications.filter((a) => a.status === 'Saved').length,
      applied: applications.filter((a) => a.status === 'Applied').length,
      interview: applications.filter((a) => a.status === 'Interview').length,
      assessment: applications.filter((a) => a.status === 'Assessment').length,
      offer: applications.filter((a) => a.status === 'Offer').length,
      rejected: applications.filter((a) => a.status === 'Rejected').length,
      withdrawn: applications.filter((a) => a.status === 'Withdrawn').length,
    };

    return successResponse(res, 200, 'Application statistics retrieved', { stats });
  } catch (error) {
    next(error);
  }
};

export const getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, userId: req.user._id }).populate('jobId');
    if (!application) {
      return next(new AppError('Application not found.', 404, 'APPLICATION_NOT_FOUND'));
    }

    return successResponse(res, 200, 'Application retrieved', { application });
  } catch (error) {
    next(error);
  }
};

export const updateApplication = async (req, res, next) => {
  try {
    const { status, notes, interviewDate } = req.body;
    const application = await Application.findOne({ _id: req.params.id, userId: req.user._id });
    if (!application) {
      return next(new AppError('Application not found.', 404, 'APPLICATION_NOT_FOUND'));
    }

    if (status && status !== application.status) {
      application.status = status;
      if (status === 'Applied' && !application.appliedAt) {
        application.appliedAt = new Date();
      }
      application.timeline.push({
        status,
        note: notes || `Moved to ${status}`,
        timestamp: new Date(),
      });
    }

    if (notes !== undefined) application.notes = notes;
    if (interviewDate !== undefined) application.interviewDate = interviewDate;

    await application.save();

    return successResponse(res, 200, 'Application updated successfully', { application });
  } catch (error) {
    next(error);
  }
};

export const deleteApplication = async (req, res, next) => {
  try {
    const application = await Application.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!application) {
      return next(new AppError('Application not found.', 404, 'APPLICATION_NOT_FOUND'));
    }

    return successResponse(res, 200, 'Application deleted successfully');
  } catch (error) {
    next(error);
  }
};

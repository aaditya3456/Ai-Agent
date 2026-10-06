import { Job } from '../models/Job.js';
import { Resume } from '../models/Resume.js';
import { Application } from '../models/Application.js';
import { analyzeJobDescription, generateCustomizedMessage } from '../services/aiService.js';
import { compareResumeToJob } from '../services/matchingService.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

export const createJob = async (req, res, next) => {
  try {
    const { title, company, location, employmentType, description, source, sourceUrl, salaryRange } = req.body;

    const job = new Job({
      userId: req.user._id,
      title: title.trim(),
      company: company.trim(),
      location: location || 'Remote',
      employmentType: employmentType || 'Full-time',
      description,
      source: source || 'Manual',
      sourceUrl: sourceUrl || '',
      salaryRange: salaryRange || '',
    });

    // Run AI analysis & resume matching automatically
    try {
      const analysis = await analyzeJobDescription(description, title, company);
      const extractedSkills = Array.from(
        new Set([
          ...(analysis.requiredSkills || []),
          ...(analysis.preferredSkills || []),
          ...(analysis.programmingLanguages || []),
          ...(analysis.frameworks || []),
          ...(analysis.databases || []),
          ...(analysis.tools || []),
        ])
      );

      job.parsedAnalysis = { isAnalyzed: true, ...analysis };
      job.skills = extractedSkills;

      const latestResume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
      if (latestResume) {
        job.matchResult = compareResumeToJob(latestResume, job);
      }
    } catch (err) {
      logger.warn(`Immediate job analysis deferred: ${err.message}`);
    }

    await job.save();

    return successResponse(res, 201, 'Job created successfully', { job });
  } catch (error) {
    next(error);
  }
};

export const getJobs = async (req, res, next) => {
  try {
    const { search, matchMin, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user._id };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: regex }, { company: regex }, { location: regex }, { skills: regex }];
    }

    if (matchMin) {
      filter['matchResult.matchScore'] = { $gte: Number(matchMin) };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [jobs, total] = await Promise.all([
      Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Job.countDocuments(filter),
    ]);

    // Attach application status if exists
    const jobIds = jobs.map((j) => j._id);
    const applications = await Application.find({ userId: req.user._id, jobId: { $in: jobIds } });
    const appMap = new Map(applications.map((a) => [a.jobId.toString(), a.status]));

    const jobsWithStatus = jobs.map((j) => ({
      ...j.toObject(),
      applicationStatus: appMap.get(j._id.toString()) || null,
    }));

    return successResponse(
      res,
      200,
      'Jobs retrieved',
      { jobs: jobsWithStatus },
      {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      }
    );
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, userId: req.user._id });
    if (!job) {
      return next(new AppError('Job not found.', 404, 'JOB_NOT_FOUND'));
    }

    const application = await Application.findOne({ userId: req.user._id, jobId: job._id });

    return successResponse(res, 200, 'Job retrieved', {
      job,
      application: application || null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, userId: req.user._id });
    if (!job) {
      return next(new AppError('Job not found.', 404, 'JOB_NOT_FOUND'));
    }

    const allowedFields = ['title', 'company', 'location', 'employmentType', 'description', 'sourceUrl', 'salaryRange'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) job[field] = req.body[field];
    });

    if (req.body.description && req.body.description !== job.description) {
      // Re-analyze if description changed
      const analysis = await analyzeJobDescription(job.description, job.title, job.company);
      job.parsedAnalysis = { isAnalyzed: true, ...analysis };
      const latestResume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
      if (latestResume) {
        job.matchResult = compareResumeToJob(latestResume, job);
      }
    }

    await job.save();

    return successResponse(res, 200, 'Job updated successfully', { job });
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!job) {
      return next(new AppError('Job not found.', 404, 'JOB_NOT_FOUND'));
    }

    // Clean up corresponding application if any
    await Application.deleteMany({ userId: req.user._id, jobId: req.params.id });

    return successResponse(res, 200, 'Job deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const analyzeJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, userId: req.user._id });
    if (!job) {
      return next(new AppError('Job not found.', 404, 'JOB_NOT_FOUND'));
    }

    const analysis = await analyzeJobDescription(job.description, job.title, job.company);
    const extractedSkills = Array.from(
      new Set([
        ...(analysis.requiredSkills || []),
        ...(analysis.preferredSkills || []),
        ...(analysis.programmingLanguages || []),
        ...(analysis.frameworks || []),
        ...(analysis.databases || []),
        ...(analysis.tools || []),
      ])
    );

    job.parsedAnalysis = { isAnalyzed: true, ...analysis };
    job.skills = extractedSkills;

    // Run match if resume is available
    const latestResume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (latestResume) {
      job.matchResult = compareResumeToJob(latestResume, job);
    }

    await job.save();

    return successResponse(res, 200, 'Job analysis completed', { job });
  } catch (error) {
    next(error);
  }
};

export const matchJob = async (req, res, next) => {
  try {
    const [job, resume] = await Promise.all([
      Job.findOne({ _id: req.params.id, userId: req.user._id }),
      Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 }),
    ]);

    if (!job) return next(new AppError('Job not found.', 404, 'JOB_NOT_FOUND'));
    if (!resume) return next(new AppError('No resume uploaded yet. Please upload a resume first.', 400, 'RESUME_REQUIRED'));

    if (!job.parsedAnalysis?.isAnalyzed) {
      const analysis = await analyzeJobDescription(job.description, job.title, job.company);
      job.parsedAnalysis = { isAnalyzed: true, ...analysis };
      job.skills = Array.from(new Set([...(analysis.requiredSkills || []), ...(analysis.preferredSkills || [])]));
    }

    const match = compareResumeToJob(resume, job);
    job.matchResult = match;
    await job.save();

    return successResponse(res, 200, 'Compatibility matching completed', { matchResult: match });
  } catch (error) {
    next(error);
  }
};

export const generateJobMessage = async (req, res, next) => {
  try {
    const { tone = 'Professional' } = req.body;
    const [job, resume] = await Promise.all([
      Job.findOne({ _id: req.params.id, userId: req.user._id }),
      Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 }),
    ]);

    if (!job) return next(new AppError('Job not found.', 404, 'JOB_NOT_FOUND'));
    if (!resume) return next(new AppError('No resume uploaded yet. Please upload a resume first.', 400, 'RESUME_REQUIRED'));

    const message = await generateCustomizedMessage({
      resumeProfile: resume.parsedProfile,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description,
      tone,
    });

    let app = await Application.findOne({ userId: req.user._id, jobId: job._id });
    if (app) {
      app.generatedMessage = { content: message, tone, generatedAt: new Date() };
      await app.save();
    }

    return successResponse(res, 200, 'Application message generated', {
      message,
      tone,
      jobTitle: job.title,
      company: job.company,
    });
  } catch (error) {
    next(error);
  }
};

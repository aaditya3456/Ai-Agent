import { Resume } from '../models/Resume.js';
import { Job } from '../models/Job.js';
import { extractTextFromFile } from '../utils/fileParser.js';
import { parseResumeProfile } from '../services/aiService.js';
import { compareResumeToJob } from '../services/matchingService.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No resume file was uploaded. Please select a PDF or DOCX file.', 400, 'NO_FILE_UPLOADED'));
    }

    const { text, fileType } = await extractTextFromFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const resume = await Resume.create({
      userId: req.user._id,
      fileName: req.file.originalname,
      fileType,
      fileSize: req.file.size,
      rawText: text,
      isAnalyzed: false,
    });

    // Automatically trigger structured analysis asynchronously or immediately
    try {
      const parsedProfile = await parseResumeProfile(text);
      const allSkills = Array.from(
        new Set([
          ...(parsedProfile.programmingLanguages || []),
          ...(parsedProfile.frameworks || []),
          ...(parsedProfile.databases || []),
          ...(parsedProfile.tools || []),
          ...(parsedProfile.otherSkills || []),
        ])
      );

      resume.parsedProfile = parsedProfile;
      resume.skills = allSkills;
      resume.isAnalyzed = true;
      await resume.save();

      // Automatically re-evaluate matching on user's existing saved jobs
      const userJobs = await Job.find({ userId: req.user._id });
      for (const job of userJobs) {
        if (job.parsedAnalysis?.isAnalyzed) {
          job.matchResult = compareResumeToJob(resume, job);
          await job.save();
        }
      }
    } catch (analysisErr) {
      logger.warn(`Resume initial analysis deferred: ${analysisErr.message}`);
    }

    return successResponse(
      res,
      201,
      'Resume uploaded and parsed successfully',
      { resume }
    );
  } catch (error) {
    next(error);
  }
};

export const getResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ userId: req.user._id })
      .select('-rawText')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Resumes retrieved', { resumes });
  } catch (error) {
    next(error);
  }
};

export const getResumeById = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
    if (!resume) {
      return next(new AppError('Resume not found.', 404, 'RESUME_NOT_FOUND'));
    }

    return successResponse(res, 200, 'Resume retrieved', { resume });
  } catch (error) {
    next(error);
  }
};

export const analyzeResumeById = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
    if (!resume) {
      return next(new AppError('Resume not found.', 404, 'RESUME_NOT_FOUND'));
    }

    const parsedProfile = await parseResumeProfile(resume.rawText);
    const allSkills = Array.from(
      new Set([
        ...(parsedProfile.programmingLanguages || []),
        ...(parsedProfile.frameworks || []),
        ...(parsedProfile.databases || []),
        ...(parsedProfile.tools || []),
        ...(parsedProfile.otherSkills || []),
      ])
    );

    resume.parsedProfile = parsedProfile;
    resume.skills = allSkills;
    resume.isAnalyzed = true;
    await resume.save();

    // Re-evaluate user jobs
    const userJobs = await Job.find({ userId: req.user._id });
    for (const job of userJobs) {
      if (job.parsedAnalysis?.isAnalyzed) {
        job.matchResult = compareResumeToJob(resume, job);
        await job.save();
      }
    }

    return successResponse(res, 200, 'Resume successfully analyzed', { resume });
  } catch (error) {
    next(error);
  }
};

export const deleteResumeById = async (req, res, next) => {
  try {
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!resume) {
      return next(new AppError('Resume not found.', 404, 'RESUME_NOT_FOUND'));
    }

    return successResponse(res, 200, 'Resume deleted successfully');
  } catch (error) {
    next(error);
  }
};

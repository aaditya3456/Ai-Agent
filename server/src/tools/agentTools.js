import { Resume } from '../models/Resume.js';
import { Job } from '../models/Job.js';
import { Application, APPLICATION_STATUSES } from '../models/Application.js';
import { analyzeJobDescription, generateCustomizedMessage } from '../services/aiService.js';
import { compareResumeToJob } from '../services/matchingService.js';
import { logger } from '../utils/logger.js';

/**
 * Tool specifications for OpenAI / LLM function calling schema.
 */
export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'getUserResume',
      description: 'Retrieve the active parsed resume profile, skills, experience, and projects for the current authenticated user.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchJobs',
      description: 'Search user jobs by keyword (title, company, tech stack) or filter by status.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search keyword matching title, company, or description',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of jobs to return (default 10)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getJob',
      description: 'Retrieve the full details, requirements, and match status of a specific job by its ID.',
      parameters: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            description: 'The MongoDB ObjectId of the job',
          },
        },
        required: ['jobId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyzeJobDescription',
      description: 'Trigger AI extraction on a job description to isolate required vs preferred skills, experience, and responsibilities.',
      parameters: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            description: 'The ID of the job to analyze',
          },
        },
        required: ['jobId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'matchResumeToJob',
      description: 'Compare the candidate resume against a specific job, generating matched skills, missing skills, and transparent compatibility analysis.',
      parameters: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            description: 'The job ID to evaluate',
          },
        },
        required: ['jobId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'saveJob',
      description: 'Create and save a new job posting for the user.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Job position title' },
          company: { type: 'string', description: 'Hiring company name' },
          location: { type: 'string', description: 'Job location or Remote' },
          description: { type: 'string', description: 'Full job description text' },
          sourceUrl: { type: 'string', description: 'Link to the job posting' },
        },
        required: ['title', 'company', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateApplicationStatus',
      description: 'Update the pipeline status or notes for an application of a given job.',
      parameters: {
        type: 'object',
        properties: {
          jobId: { type: 'string', description: 'The job ID' },
          status: {
            type: 'string',
            enum: APPLICATION_STATUSES,
            description: 'New application status (Saved, Applied, Interview, Assessment, Offer, Rejected, Withdrawn)',
          },
          notes: { type: 'string', description: 'Optional updated progress note' },
        },
        required: ['jobId', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generateApplicationMessage',
      description: 'Generate a tailored application/cover message for a job grounded strictly in candidate resume details.',
      parameters: {
        type: 'object',
        properties: {
          jobId: { type: 'string', description: 'The job ID to tailor the message for' },
          tone: {
            type: 'string',
            enum: ['Professional', 'Concise', 'Friendly'],
            description: 'Desired message tone (default: Professional)',
          },
        },
        required: ['jobId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getApplicationHistory',
      description: 'Fetch all active and past job applications tracked by the user.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];

/**
 * User-facing progress labels for agent action reporting.
 */
export const toolActionLabels = {
  getUserResume: 'Reading your resume profile',
  searchJobs: 'Searching saved jobs database',
  getJob: 'Retrieving job details',
  analyzeJobDescription: 'Analyzing job requirements and skills',
  matchResumeToJob: 'Comparing resume against job criteria',
  saveJob: 'Saving job to your collection',
  updateApplicationStatus: 'Updating application pipeline status',
  generateApplicationMessage: 'Drafting tailored application note',
  getApplicationHistory: 'Loading your application history',
};

/**
 * Tool execution handlers enforcing strict user isolation and validation.
 */
export const executeAgentTool = async (toolName, args, userId) => {
  logger.info(`Agent executing tool: ${toolName}`, { userId, args });

  switch (toolName) {
    case 'getUserResume': {
      const resume = await Resume.findOne({ userId }).sort({ createdAt: -1 });
      if (!resume) {
        return {
          success: false,
          message: 'No resume found for this user. Please upload a resume first.',
        };
      }
      return {
        success: true,
        resumeId: resume._id,
        fileName: resume.fileName,
        skills: resume.skills,
        parsedProfile: resume.parsedProfile,
      };
    }

    case 'searchJobs': {
      const { query = '', limit = 10 } = args;
      const filter = { userId };
      if (query && query.trim()) {
        const regex = new RegExp(query.trim(), 'i');
        filter.$or = [{ title: regex }, { company: regex }, { description: regex }, { skills: regex }];
      }
      const jobs = await Job.find(filter).limit(Number(limit) || 10).sort({ createdAt: -1 });
      return {
        success: true,
        count: jobs.length,
        jobs: jobs.map((j) => ({
          id: j._id,
          title: j.title,
          company: j.company,
          location: j.location,
          isAnalyzed: j.parsedAnalysis?.isAnalyzed || false,
          matchScore: j.matchResult?.matchScore || 0,
        })),
      };
    }

    case 'getJob': {
      const { jobId } = args;
      const job = await Job.findOne({ _id: jobId, userId });
      if (!job) {
        return { success: false, message: `Job with ID ${jobId} not found.` };
      }
      return {
        success: true,
        job: {
          id: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          parsedAnalysis: job.parsedAnalysis,
          matchResult: job.matchResult,
        },
      };
    }

    case 'analyzeJobDescription': {
      const { jobId } = args;
      const job = await Job.findOne({ _id: jobId, userId });
      if (!job) {
        return { success: false, message: `Job with ID ${jobId} not found.` };
      }

      const analysis = await analyzeJobDescription(job.description, job.title, job.company);
      job.parsedAnalysis = {
        isAnalyzed: true,
        ...analysis,
      };

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
      job.skills = extractedSkills;
      await job.save();

      return {
        success: true,
        jobId: job._id,
        analysis: job.parsedAnalysis,
        skillsCount: extractedSkills.length,
      };
    }

    case 'matchResumeToJob': {
      const { jobId } = args;
      const [job, resume] = await Promise.all([
        Job.findOne({ _id: jobId, userId }),
        Resume.findOne({ userId }).sort({ createdAt: -1 }),
      ]);

      if (!job) return { success: false, message: `Job with ID ${jobId} not found.` };
      if (!resume) return { success: false, message: 'Please upload a resume first to run matching.' };

      // Ensure job is analyzed first
      if (!job.parsedAnalysis?.isAnalyzed) {
        const analysis = await analyzeJobDescription(job.description, job.title, job.company);
        job.parsedAnalysis = { isAnalyzed: true, ...analysis };
        job.skills = Array.from(new Set([...(analysis.requiredSkills || []), ...(analysis.preferredSkills || [])]));
      }

      const match = compareResumeToJob(resume, job);
      job.matchResult = match;
      await job.save();

      return {
        success: true,
        jobTitle: job.title,
        company: job.company,
        matchScore: match.matchScore,
        matchedSkills: match.matchedSkills,
        missingRequiredSkills: match.missingRequiredSkills,
        missingPreferredSkills: match.missingPreferredSkills,
        analysis: match.analysis,
      };
    }

    case 'saveJob': {
      const { title, company, location = 'Remote', description, sourceUrl = '' } = args;
      if (!title || !company || !description) {
        return { success: false, message: 'Title, company, and description are required.' };
      }

      const job = await Job.create({
        userId,
        title,
        company,
        location,
        description,
        sourceUrl,
      });

      // Auto-analyze in background
      try {
        const analysis = await analyzeJobDescription(description, title, company);
        job.parsedAnalysis = { isAnalyzed: true, ...analysis };
        job.skills = Array.from(new Set([...(analysis.requiredSkills || []), ...(analysis.preferredSkills || [])]));
        await job.save();
      } catch (e) {
        logger.warn('Auto-analysis during job save deferred', { err: e.message });
      }

      return {
        success: true,
        message: 'Job successfully saved.',
        job: { id: job._id, title: job.title, company: job.company },
      };
    }

    case 'updateApplicationStatus': {
      const { jobId, status, notes } = args;
      if (!APPLICATION_STATUSES.includes(status)) {
        return { success: false, message: `Invalid status. Valid values: ${APPLICATION_STATUSES.join(', ')}` };
      }

      let application = await Application.findOne({ jobId, userId });
      if (!application) {
        application = new Application({
          userId,
          jobId,
          status,
          notes: notes || '',
          timeline: [{ status, note: 'Created via agent' }],
        });
      } else {
        application.status = status;
        if (notes) application.notes = notes;
        application.timeline.push({ status, note: notes || `Status updated to ${status}` });
      }

      if (status === 'Applied' && !application.appliedAt) {
        application.appliedAt = new Date();
      }

      await application.save();

      return {
        success: true,
        message: `Application status updated to ${status}.`,
        applicationId: application._id,
      };
    }

    case 'generateApplicationMessage': {
      const { jobId, tone = 'Professional' } = args;
      const [job, resume] = await Promise.all([
        Job.findOne({ _id: jobId, userId }),
        Resume.findOne({ userId }).sort({ createdAt: -1 }),
      ]);

      if (!job) return { success: false, message: `Job with ID ${jobId} not found.` };
      if (!resume) return { success: false, message: 'Please upload a resume first to generate a customized note.' };

      const messageContent = await generateCustomizedMessage({
        resumeProfile: resume.parsedProfile,
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.description,
        tone,
      });

      // Save to application record if exists or create draft
      let app = await Application.findOne({ jobId, userId });
      if (!app) {
        app = new Application({
          userId,
          jobId,
          status: 'Saved',
          generatedMessage: { content: messageContent, tone, generatedAt: new Date() },
        });
      } else {
        app.generatedMessage = { content: messageContent, tone, generatedAt: new Date() };
      }
      await app.save();

      return {
        success: true,
        tone,
        message: messageContent,
      };
    }

    case 'getApplicationHistory': {
      const apps = await Application.find({ userId })
        .populate('jobId', 'title company location')
        .sort({ updatedAt: -1 });

      return {
        success: true,
        count: apps.length,
        applications: apps.map((a) => ({
          id: a._id,
          job: a.jobId ? { title: a.jobId.title, company: a.jobId.company } : { title: 'Unknown Job', company: 'Unknown' },
          status: a.status,
          notes: a.notes,
          appliedAt: a.appliedAt,
          updatedAt: a.updatedAt,
        })),
      };
    }

    default:
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
};

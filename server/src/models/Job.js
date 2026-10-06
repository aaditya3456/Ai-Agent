import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    location: {
      type: String,
      default: 'Remote',
      trim: true,
    },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary', 'Other'],
      default: 'Full-time',
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
    },
    source: {
      type: String,
      default: 'Manual',
    },
    sourceUrl: {
      type: String,
      trim: true,
      default: '',
    },
    salaryRange: {
      type: String,
      default: '',
    },
    parsedAnalysis: {
      isAnalyzed: { type: Boolean, default: false },
      requiredSkills: [{ type: String }],
      preferredSkills: [{ type: String }],
      programmingLanguages: [{ type: String }],
      frameworks: [{ type: String }],
      databases: [{ type: String }],
      tools: [{ type: String }],
      yearsOfExperience: {
        min: { type: Number, default: 0 },
        max: { type: Number },
        text: { type: String, default: '' },
      },
      educationRequirements: [{ type: String }],
      responsibilities: [{ type: String }],
      qualifications: [{ type: String }],
      keywords: [{ type: String }],
    },
    skills: [{ type: String, index: true }],
    matchResult: {
      isMatched: { type: Boolean, default: false },
      matchScore: { type: Number, default: 0 }, // Internal heuristic compatibility score
      matchedSkills: [{ type: String }],
      missingRequiredSkills: [{ type: String }],
      missingPreferredSkills: [{ type: String }],
      relevantExperience: [{ type: String }],
      relevantProjects: [{ type: String }],
      analysis: { type: String, default: '' },
      lastMatchedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ userId: 1, createdAt: -1 });
jobSchema.index({ userId: 1, title: 'text', company: 'text', description: 'text' });

export const Job = mongoose.model('Job', jobSchema);

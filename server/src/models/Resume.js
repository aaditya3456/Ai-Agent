import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'txt'],
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    rawText: {
      type: String,
      required: true,
    },
    isAnalyzed: {
      type: Boolean,
      default: false,
    },
    parsedProfile: {
      professionalSummary: { type: String, default: '' },
      programmingLanguages: [{ type: String }],
      frameworks: [{ type: String }],
      databases: [{ type: String }],
      tools: [{ type: String }],
      otherSkills: [{ type: String }],
      experience: [
        {
          title: { type: String },
          company: { type: String },
          location: { type: String },
          startDate: { type: String },
          endDate: { type: String },
          current: { type: Boolean, default: false },
          description: { type: String },
          achievements: [{ type: String }],
        },
      ],
      education: [
        {
          institution: { type: String },
          degree: { type: String },
          fieldOfStudy: { type: String },
          graduationYear: { type: String },
        },
      ],
      projects: [
        {
          name: { type: String },
          description: { type: String },
          technologies: [{ type: String }],
          link: { type: String },
        },
      ],
      certifications: [{ type: String }],
    },
    skills: [{ type: String, index: true }], // Flattened lowercase list for quick matching
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user's latest resume
resumeSchema.index({ userId: 1, createdAt: -1 });

export const Resume = mongoose.model('Resume', resumeSchema);

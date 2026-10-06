import mongoose from 'mongoose';

export const APPLICATION_STATUSES = [
  'Saved',
  'Applied',
  'Interview',
  'Assessment',
  'Offer',
  'Rejected',
  'Withdrawn',
];

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'Saved',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    generatedMessage: {
      content: { type: String, default: '' },
      tone: { type: String, enum: ['Professional', 'Concise', 'Friendly', ''], default: 'Professional' },
      generatedAt: { type: Date },
    },
    appliedAt: {
      type: Date,
    },
    interviewDate: {
      type: Date,
    },
    timeline: [
      {
        status: { type: String, enum: APPLICATION_STATUSES },
        note: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate applications for the same job by the same user
applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ userId: 1, status: 1 });

export const Application = mongoose.model('Application', applicationSchema);

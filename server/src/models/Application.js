import mongoose from 'mongoose';

const stageHistorySchema = new mongoose.Schema({
  stage: {
    type: String,
    required: true
  },
  at: {
    type: Date,
    default: Date.now
  },
  by: {
    type: String,
    default: 'System'
  },
  remark: {
    type: String,
    default: ''
  }
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  schemeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scheme',
    required: true
  },
  applicationNo: {
    type: String,
    required: true,
    unique: true
  },
  formData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: [
      'DRAFT',
      'SUBMITTED',
      'OCR_PROCESSING',
      'AUTO_VERIFIED',
      'DEFICIENT',
      'UNDER_VERIFICATION',
      'UNDER_SCRUTINY',
      'ELIGIBLE',
      'INELIGIBLE',
      'MERIT_LISTED',
      'SELECTED',
      'WAITLISTED',
      'REJECTED',
      'AWARD_ACCEPTED',
      'DISBURSING',
      'COMPLETED'
    ],
    default: 'DRAFT'
  },
  stageHistory: [stageHistorySchema],
  eligibilityResult: {
    passed: { type: Boolean, default: null },
    results: [{
      field: String,
      operator: String,
      expected: mongoose.Schema.Types.Mixed,
      actual: mongoose.Schema.Types.Mixed,
      passed: Boolean,
      message: String
    }]
  },
  meritScore: {
    type: Number,
    default: null
  },
  meritBreakdown: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  meritRank: {
    type: Number,
    default: null
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  isWaitlisted: {
    type: Boolean,
    default: false
  },
  selectionOverrideRemark: {
    type: String,
    default: null
  },
  officerRemarks: {
    type: String,
    default: null
  },
  flags: [{
    type: String
  }],
  submittedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Helper static method to generate formatted application number
applicationSchema.statics.generateApplicationNo = async function(schemeCode) {
  const year = new Date().getFullYear();
  const prefix = `${schemeCode}/${year}/`;
  // Use the highest existing number, not the count: seeded or deleted records leave gaps,
  // and count + 1 can land on a number that already exists (duplicate key error)
  const last = await this.findOne({ applicationNo: new RegExp(`^${prefix}`) })
    .sort({ applicationNo: -1 })
    .select('applicationNo')
    .lean();
  const lastSeq = last ? (parseInt(last.applicationNo.split('/').pop(), 10) || 0) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(6, '0')}`;
};

const Application = mongoose.model('Application', applicationSchema);
export default Application;

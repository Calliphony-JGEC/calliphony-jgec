import mongoose from 'mongoose';

const formResponseSchema = new mongoose.Schema(
  {
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true, index: true },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    format: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

formResponseSchema.index({ formId: 1, createdAt: -1 });

export default mongoose.model('FormResponse', formResponseSchema);

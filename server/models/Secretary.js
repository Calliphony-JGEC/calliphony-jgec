import mongoose from 'mongoose';

const secretarySchema = new mongoose.Schema(
  {
    year: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    icon: { type: String, default: '🎵' },
    image: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.model('Secretary', secretarySchema);

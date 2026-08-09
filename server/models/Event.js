import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    publicId: { type: String, default: '' },
    resourceType: { type: String, enum: ['image', 'video', 'raw', 'auto'], default: 'image' },
    thumbnailUrl: { type: String, default: '' },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    eventName: { type: String, required: true, trim: true },
    title: { type: String, trim: true },
    eventDate: { type: String, default: '' },
    eventDescription: { type: String, default: '' },
    mediaList: { type: [mediaSchema], default: [] },
    /** Delivery URL of the media item chosen as Gallery card thumbnail */
    thumbnailUrl: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

eventSchema.index({ eventName: 1 });

export default mongoose.model('Event', eventSchema);

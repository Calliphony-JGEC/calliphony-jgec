import mongoose from 'mongoose';

const footerLinkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'site', unique: true },
    footerLinks: { type: [footerLinkSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('SiteSettings', siteSettingsSchema);

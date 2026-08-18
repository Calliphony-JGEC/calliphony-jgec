import { Router } from 'express';
import SiteSettings from '../models/SiteSettings.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const DEFAULT_FOOTER_LINKS = [
  { label: 'Instagram', url: 'https://instagram.com/calliphony_music_club' },
  { label: 'Gallery', url: '/#events' },
];

function serializeLink(link) {
  return {
    label: String(link.label || '').trim(),
    url: String(link.url || '').trim(),
  };
}

function serializeSettings(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    footerLinks: Array.isArray(obj.footerLinks) ? obj.footerLinks.map(serializeLink).filter((l) => l.label && l.url) : [],
  };
}

function isAllowedUrl(raw) {
  const url = String(raw || '').trim();
  if (!url) return false;
  if (url.startsWith('#') || url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeLinks(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .map(serializeLink)
    .filter((link) => link.label && isAllowedUrl(link.url));
}

async function getOrCreateSettings() {
  let settings = await SiteSettings.findOne({ key: 'site' });
  if (!settings) {
    settings = await SiteSettings.create({
      key: 'site',
      footerLinks: DEFAULT_FOOTER_LINKS,
    });
  }
  return settings;
}

router.get('/', async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    return res.json({ settings: serializeSettings(settings) });
  } catch (err) {
    console.error('Get site settings error:', err);
    return res.status(500).json({ error: 'Could not load site settings.' });
  }
});

router.put('/', requireAuth, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    if (req.body.footerLinks != null) {
      settings.footerLinks = normalizeLinks(req.body.footerLinks);
    }
    await settings.save();
    return res.json({ settings: serializeSettings(settings) });
  } catch (err) {
    console.error('Update site settings error:', err);
    return res.status(500).json({ error: 'Could not save site settings.' });
  }
});

export default router;

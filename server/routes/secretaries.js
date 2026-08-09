import { Router } from 'express';
import Secretary from '../models/Secretary.js';
import { requireAuth } from '../middleware/auth.js';
import { destroyCloudinaryAsset, extractPublicIdFromUrl } from '../utils/cloudinary.js';

const router = Router();

function serializeSecretary(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(obj._id),
    docId: String(obj._id),
    year: obj.year,
    name: obj.name,
    role: obj.role,
    icon: obj.icon || '🎵',
    image: obj.image || '',
    imagePublicId: obj.imagePublicId || '',
    createdAt: obj.createdAt,
  };
}

router.get('/', async (_req, res) => {
  try {
    const secretaries = await Secretary.find().sort({ year: -1, name: 1 });
    return res.json({ secretaries: secretaries.map(serializeSecretary) });
  } catch (err) {
    console.error('List secretaries error:', err);
    return res.status(500).json({ error: 'Could not load secretaries.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const year = String(req.body.year || '').trim();
    const name = String(req.body.name || '').trim();
    const role = String(req.body.role || '').trim();

    if (!year || !name || !role) {
      return res.status(400).json({ error: 'Year, name, and role are required.' });
    }

    const image = req.body.image || '';
    const imagePublicId = req.body.imagePublicId || extractPublicIdFromUrl(image) || '';

    const secretary = await Secretary.create({
      year,
      name,
      role,
      icon: req.body.icon || '🎵',
      image,
      imagePublicId,
    });

    return res.status(201).json({ secretary: serializeSecretary(secretary) });
  } catch (err) {
    console.error('Create secretary error:', err);
    return res.status(500).json({ error: 'Could not create secretary.' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const secretary = await Secretary.findById(req.params.id);
    if (!secretary) {
      return res.status(404).json({ error: 'Secretary not found.' });
    }

    if (req.body.year != null) secretary.year = String(req.body.year).trim();
    if (req.body.name != null) secretary.name = String(req.body.name).trim();
    if (req.body.role != null) secretary.role = String(req.body.role).trim();
    if (req.body.icon != null) secretary.icon = req.body.icon || '🎵';

    if (req.body.image != null) {
      const nextImage = req.body.image || '';
      const nextPublicId =
        req.body.imagePublicId || extractPublicIdFromUrl(nextImage) || '';
      const prevPublicId = secretary.imagePublicId || extractPublicIdFromUrl(secretary.image);

      if (prevPublicId && prevPublicId !== nextPublicId) {
        await destroyCloudinaryAsset(prevPublicId, 'image');
      }

      secretary.image = nextImage;
      secretary.imagePublicId = nextPublicId;
    }

    if (!secretary.year || !secretary.name || !secretary.role) {
      return res.status(400).json({ error: 'Year, name, and role are required.' });
    }

    await secretary.save();
    return res.json({ secretary: serializeSecretary(secretary) });
  } catch (err) {
    console.error('Update secretary error:', err);
    return res.status(500).json({ error: 'Could not update secretary.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await Secretary.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Secretary not found.' });
    }

    const publicId = deleted.imagePublicId || extractPublicIdFromUrl(deleted.image);
    let fileResult = null;
    if (publicId) {
      fileResult = await destroyCloudinaryAsset(publicId, 'image');
    } else if (deleted.image) {
      console.warn('[secretaries] no publicId for', deleted.image);
      fileResult = { ok: false, skipped: true, reason: 'unresolved publicId' };
    }

    // Also try destroying the exact public id as a one-off under secretaries folder is enough;
    // prefix wipe is too broad for shared folder — only delete the resolved file.
    console.log(`[secretaries] cloudinary cleanup for "${deleted.name}":`, fileResult);

    return res.json({
      ok: true,
      cloudinary: {
        perFile: fileResult ? [fileResult] : [],
        deletedCount: fileResult?.ok ? 1 : 0,
        failedCount: fileResult && !fileResult.ok ? 1 : 0,
      },
    });
  } catch (err) {
    console.error('Delete secretary error:', err);
    return res.status(500).json({ error: 'Could not delete secretary.' });
  }
});

export default router;

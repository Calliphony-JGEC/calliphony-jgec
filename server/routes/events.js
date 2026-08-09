import { Router } from 'express';
import Event from '../models/Event.js';
import { requireAuth } from '../middleware/auth.js';
import { destroyMediaList, resolveMediaRef, destroyByPrefix, sanitizeCloudinaryFolder } from '../utils/cloudinary.js';

const router = Router();

function normalizeMediaList(list = []) {
  return (Array.isArray(list) ? list : [])
    .filter((m) => m && m.url)
    .map((m) => {
      const ref = resolveMediaRef(m);
      const isVideo = m.type === 'video' || m.resourceType === 'video' || String(m.url).includes('/video/');
      return {
        url: m.url,
        type: isVideo ? 'video' : 'image',
        publicId: m.publicId || ref?.publicId || '',
        resourceType: isVideo ? 'video' : m.resourceType === 'raw' ? 'raw' : 'image',
        thumbnailUrl: m.thumbnailUrl || '',
      };
    });
}

function normalizeUrl(url = '') {
  try {
    return decodeURIComponent(String(url).trim()).split('?')[0].split('#')[0];
  } catch {
    return String(url).trim().split('?')[0].split('#')[0];
  }
}

function mediaMatches(media, requestedUrl) {
  if (!media?.url || !requestedUrl) return false;
  if (media.url === requestedUrl) return true;
  return normalizeUrl(media.url) === normalizeUrl(requestedUrl);
}

/** Put the chosen cover first and return its canonical url. */
function applyCoverSelection(mediaList = [], requestedUrl = '') {
  const list = Array.isArray(mediaList) ? [...mediaList] : [];
  if (list.length === 0) return { mediaList: [], thumbnailUrl: '' };

  let coverIdx = requestedUrl ? list.findIndex((m) => mediaMatches(m, requestedUrl)) : 0;
  if (coverIdx < 0) coverIdx = 0;

  if (coverIdx > 0) {
    const [cover] = list.splice(coverIdx, 1);
    list.unshift(cover);
  }

  return {
    mediaList: list,
    thumbnailUrl: list[0]?.url || '',
  };
}

function serializeEvent(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const rawMedia = Array.isArray(obj.mediaList) ? obj.mediaList : [];
  const { mediaList, thumbnailUrl } = applyCoverSelection(rawMedia, obj.thumbnailUrl || rawMedia[0]?.url || '');

  return {
    id: String(obj._id),
    docId: String(obj._id),
    eventName: obj.eventName,
    title: obj.title || obj.eventName,
    name: obj.eventName,
    eventDate: obj.eventDate || '',
    date: obj.eventDate || '',
    eventDescription: obj.eventDescription || '',
    description: obj.eventDescription || '',
    mediaList,
    thumbnailUrl,
    createdAt: obj.createdAt,
  };
}

router.get('/', async (_req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    return res.json({ events: events.map(serializeEvent) });
  } catch (err) {
    console.error('List events error:', err);
    return res.status(500).json({ error: 'Could not load events.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const eventName = String(req.body.eventName || req.body.title || '').trim();
    if (!eventName) {
      return res.status(400).json({ error: 'Event name is required.' });
    }

    const mediaList = normalizeMediaList(req.body.mediaList);
    const covered = applyCoverSelection(mediaList, req.body.thumbnailUrl || mediaList[0]?.url || '');

    const event = await Event.create({
      eventName,
      title: eventName,
      eventDate: String(req.body.eventDate || '').trim(),
      eventDescription: String(req.body.eventDescription || '').trim(),
      mediaList: covered.mediaList,
      thumbnailUrl: covered.thumbnailUrl,
    });

    return res.status(201).json({ event: serializeEvent(event) });
  } catch (err) {
    console.error('Create event error:', err);
    return res.status(500).json({ error: 'Could not create event.' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (req.body.eventName != null || req.body.title != null) {
      const name = String(req.body.eventName || req.body.title || '').trim();
      if (!name) {
        return res.status(400).json({ error: 'Event name cannot be empty.' });
      }
      event.eventName = name;
      event.title = name;
    }
    if (req.body.eventDate != null) {
      event.eventDate = String(req.body.eventDate).trim();
    }
    if (req.body.eventDescription != null) {
      event.eventDescription = String(req.body.eventDescription).trim();
    }

    if (Array.isArray(req.body.mediaList)) {
      const nextMedia = normalizeMediaList(req.body.mediaList);
      const nextUrls = new Set(nextMedia.map((m) => m.url));
      const removed = (event.mediaList || []).filter((m) => !nextUrls.has(m.url));

      if (removed.length > 0) {
        await destroyMediaList(removed);
      }

      const covered = applyCoverSelection(
        nextMedia,
        req.body.thumbnailUrl != null ? req.body.thumbnailUrl : event.thumbnailUrl
      );
      event.mediaList = covered.mediaList;
      event.thumbnailUrl = covered.thumbnailUrl;
    } else if (req.body.thumbnailUrl != null) {
      const covered = applyCoverSelection(event.mediaList || [], req.body.thumbnailUrl);
      event.mediaList = covered.mediaList;
      event.thumbnailUrl = covered.thumbnailUrl;
      event.markModified('mediaList');
    }

    await event.save();
    return res.json({ event: serializeEvent(event) });
  } catch (err) {
    console.error('Update event error:', err);
    return res.status(500).json({ error: 'Could not update event.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const mediaList = Array.isArray(deleted.mediaList)
      ? deleted.mediaList.map((m) => (typeof m.toObject === 'function' ? m.toObject() : m))
      : [];

    console.log(
      `[events] deleting "${deleted.eventName}" id=${deleted._id} mediaCount=${mediaList.length}`
    );

    const perFile = await destroyMediaList(mediaList);

    // Safety net: wipe the whole event folder (covers missing/wrong publicIds)
    const eventFolder = sanitizeCloudinaryFolder(
      `calliphony-events/${deleted.eventName || deleted.title || ''}`
    );
    const prefixResult = eventFolder
      ? await destroyByPrefix(eventFolder)
      : { ok: false, skipped: true, reason: 'no event name' };

    const failed = perFile.filter((r) => !r.ok);
    const deletedCount =
      perFile.filter((r) => r.ok).length + (prefixResult.deleted?.length || 0);

    console.log(`[events] cloudinary cleanup for "${deleted.eventName}":`, {
      perFile,
      prefixResult,
      deletedCount,
    });

    return res.json({
      ok: true,
      cloudinary: {
        perFile,
        prefix: prefixResult,
        deletedCount,
        failedCount: failed.length,
      },
    });
  } catch (err) {
    console.error('Delete event error:', err);
    return res.status(500).json({ error: 'Could not delete event.' });
  }
});

export default router;

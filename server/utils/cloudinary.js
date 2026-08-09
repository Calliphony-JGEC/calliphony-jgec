import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function applyConfig() {
  const cloudName = (
    process.env.VITE_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    ''
  ).trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

  if (!cloudName || !apiKey || !apiSecret) {
    configured = false;
    return { cloudName, apiKey, apiSecret };
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryAdminConfigured() {
  applyConfig();
  return configured;
}

function safeDecode(value) {
  if (!value || typeof value !== 'string') return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Match upload folder sanitization used by the frontend. */
export function sanitizeCloudinaryFolder(folder = '') {
  return String(folder)
    .trim()
    .replace(/\/+/g, '/')
    .split('/')
    .filter(Boolean)
    .map((segment) =>
      segment
        .replace(/[^\w.-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    )
    .filter(Boolean)
    .join('/');
}

/** Extract Cloudinary public_id from a delivery URL when publicId was not stored. */
export function extractPublicIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const cleaned = url.split('?')[0].split('#')[0];
    const markers = ['/upload/', '/fetch/', '/private/', '/authenticated/'];
    let rest = null;
    for (const marker of markers) {
      const idx = cleaned.indexOf(marker);
      if (idx !== -1) {
        rest = cleaned.slice(idx + marker.length);
        break;
      }
    }
    if (!rest) return null;

    rest = rest.replace(/^v\d+\//, '');

    const versionMatch = rest.match(/^(?:[^/]+\/)*v\d+\/(.+)$/);
    if (versionMatch) {
      rest = versionMatch[1];
    } else if (rest.includes(',') || /(^|\/)[a-z]{1,3}_/.test(rest)) {
      const parts = rest.split('/');
      const start = parts.findIndex(
        (p) => !p.includes(',') && !/^[a-z]{1,3}_/.test(p) && !/^v\d+$/.test(p)
      );
      if (start > 0) rest = parts.slice(start).join('/');
    }

    rest = safeDecode(rest);
    const publicId = rest.replace(/\.[a-z0-9]+$/i, '').replace(/\/+$/, '');
    return publicId || null;
  } catch {
    return null;
  }
}

function inferResourceType(mediaOrUrl, url = '') {
  if (typeof mediaOrUrl === 'object' && mediaOrUrl) {
    if (mediaOrUrl.type === 'video' || mediaOrUrl.resourceType === 'video') return 'video';
    if (mediaOrUrl.resourceType === 'raw') return 'raw';
  }
  if (url.includes('/video/')) return 'video';
  if (url.includes('/raw/')) return 'raw';
  return 'image';
}

export function resolveMediaRef(mediaOrUrl) {
  if (!mediaOrUrl) return null;
  if (typeof mediaOrUrl === 'string') {
    const publicId = extractPublicIdFromUrl(mediaOrUrl);
    return publicId
      ? { publicId, resourceType: inferResourceType(null, mediaOrUrl) }
      : null;
  }
  const plain =
    typeof mediaOrUrl.toObject === 'function' ? mediaOrUrl.toObject() : mediaOrUrl;
  const url = plain.url || plain.image || '';
  const publicId = safeDecode(
    plain.publicId || plain.imagePublicId || extractPublicIdFromUrl(url) || ''
  );
  if (!publicId) return null;
  return { publicId, resourceType: inferResourceType(plain, url) };
}

/**
 * Destroy a Cloudinary asset via the official SDK.
 * Tries the hinted resource type first, then image/video/raw.
 */
export async function destroyCloudinaryAsset(publicId, resourceType = 'image') {
  if (!isCloudinaryAdminConfigured()) {
    return { ok: false, skipped: true, reason: 'Cloudinary admin credentials missing' };
  }

  const decodedId = safeDecode(String(publicId || '').trim());
  if (!decodedId) {
    return { ok: false, skipped: true, reason: 'publicId missing' };
  }

  const order = [resourceType, 'image', 'video', 'raw'].filter(
    (type, idx, arr) => type && arr.indexOf(type) === idx
  );

  let last = null;
  for (const type of order) {
    try {
      const data = await cloudinary.uploader.destroy(decodedId, {
        resource_type: type,
        invalidate: true,
        type: 'upload',
      });
      if (data?.result === 'ok') {
        console.log(`[cloudinary] destroyed ${type}: ${decodedId}`);
        return { ok: true, publicId: decodedId, resourceType: type, data };
      }
      last = {
        ok: false,
        publicId: decodedId,
        resourceType: type,
        data,
        notFound: data?.result === 'not found',
      };
    } catch (err) {
      console.warn(`[cloudinary] destroy error (${type}) ${decodedId}:`, err.message);
      last = { ok: false, publicId: decodedId, resourceType: type, error: err.message };
    }
  }

  console.warn(`[cloudinary] could not destroy: ${decodedId}`, last?.data || last);
  return last || { ok: false, publicId: decodedId };
}

export async function destroyMediaList(mediaItems = []) {
  const results = [];
  for (const item of mediaItems) {
    const ref = resolveMediaRef(item);
    if (!ref?.publicId) {
      console.warn('[cloudinary] skip — no publicId for', item?.url || item?.image || item);
      results.push({ ok: false, skipped: true, reason: 'unresolved publicId', item: item?.url || item });
      continue;
    }
    results.push(await destroyCloudinaryAsset(ref.publicId, ref.resourceType));
  }
  return results;
}

/**
 * Delete every upload under a folder prefix (both image and video).
 * Used as a safety net when deleting an event/secretary so orphans are cleaned up.
 */
export async function destroyByPrefix(prefix) {
  if (!isCloudinaryAdminConfigured()) {
    return { ok: false, skipped: true, reason: 'Cloudinary admin credentials missing' };
  }

  const cleanPrefix = sanitizeCloudinaryFolder(prefix);
  if (!cleanPrefix) {
    return { ok: false, skipped: true, reason: 'empty prefix' };
  }

  const deleted = [];
  const errors = [];

  for (const resourceType of ['image', 'video', 'raw']) {
    try {
      const data = await cloudinary.api.delete_resources_by_prefix(cleanPrefix, {
        resource_type: resourceType,
        invalidate: true,
        type: 'upload',
      });
      const ids = Object.keys(data?.deleted || {});
      if (ids.length) {
        console.log(`[cloudinary] prefix delete ${resourceType} under ${cleanPrefix}:`, ids);
        deleted.push(...ids.map((id) => ({ id, resourceType, result: data.deleted[id] })));
      }
      // Also remove empty folder marker if present
      try {
        await cloudinary.api.delete_folder(cleanPrefix);
      } catch {
        // folder may not be empty or may not exist — ignore
      }
    } catch (err) {
      // "Can't find" / empty prefix is fine
      if (!/not found|can't find|empty/i.test(err.message || '')) {
        console.warn(`[cloudinary] prefix delete error (${resourceType}) ${cleanPrefix}:`, err.message);
        errors.push({ resourceType, error: err.message });
      }
    }
  }

  return {
    ok: errors.length === 0,
    prefix: cleanPrefix,
    deleted,
    errors,
  };
}

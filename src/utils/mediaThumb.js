/**
 * Build a still-frame poster URL for Cloudinary videos.
 * Images are returned unchanged.
 */
export function getMediaPosterUrl(media) {
  if (!media?.url) return '';
  if (media.type !== 'video' && !media.url.includes('/video/upload/')) {
    return media.url;
  }
  if (media.thumbnailUrl) return media.thumbnailUrl;

  // Insert so_0 (first frame) + force jpg delivery
  let poster = media.url.replace('/video/upload/', '/video/upload/so_0,f_jpg,q_auto/');
  poster = poster.replace(/\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i, '.jpg$2');
  return poster;
}

function normalizeUrl(url = '') {
  try {
    return decodeURIComponent(String(url).trim());
  } catch {
    return String(url).trim();
  }
}

function urlsMatch(a, b) {
  if (!a || !b) return false;
  const left = normalizeUrl(a);
  const right = normalizeUrl(b);
  if (left === right) return true;
  // Compare without query/hash
  return left.split('?')[0].split('#')[0] === right.split('?')[0].split('#')[0];
}

export function getEventThumbnail(event) {
  const list = Array.isArray(event?.mediaList) ? event.mediaList.filter((m) => m?.url) : [];
  if (list.length === 0) return null;

  if (event.thumbnailUrl) {
    const match = list.find((m) => urlsMatch(m.url, event.thumbnailUrl));
    if (match) return { ...match, posterUrl: getMediaPosterUrl(match) };
  }

  const preferred = list.find((m) => m.type !== 'video') || list[0];
  return { ...preferred, posterUrl: getMediaPosterUrl(preferred) };
}

/** Put the chosen cover/thumbnail first; keep remaining media in original order. */
export function orderMediaWithThumbnail(event) {
  const list = Array.isArray(event?.mediaList) ? event.mediaList.filter((m) => m?.url) : [];
  if (list.length === 0) return [];

  const thumb = getEventThumbnail(event);
  if (!thumb?.url) {
    return list.map((m) => ({ ...m, posterUrl: getMediaPosterUrl(m), isCover: false }));
  }

  const cover = { ...thumb, posterUrl: getMediaPosterUrl(thumb), isCover: true };
  const rest = list
    .filter((m) => !urlsMatch(m.url, thumb.url))
    .map((m) => ({ ...m, posterUrl: getMediaPosterUrl(m), isCover: false }));

  return [cover, ...rest];
}

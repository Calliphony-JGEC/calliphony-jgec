
export async function checkMediaValidity(url, type = 'image') {
  if (!url) return false;
  try {
    const cacheBusterUrl = `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`;
    const response = await fetch(cacheBusterUrl, { method: 'HEAD', cache: 'no-store' });
    return response.ok;
  } catch (err) {
    
    return new Promise((resolve) => {
      const cacheBusterUrl = `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`;
      if (type === 'video') {
        const video = document.createElement('video');
        video.onloadedmetadata = () => { video.src = ''; resolve(true); };
        video.onerror = () => { video.src = ''; resolve(false); };
        video.preload = 'metadata';
        video.src = cacheBusterUrl;
      } else {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = cacheBusterUrl;
      }
    });
  }
}


export async function filterValidEvents(eventList) {
  const verifiedEvents = await Promise.all(
    eventList.map(async (ev) => {
      const mediaList = ev.mediaList || [];
      if (mediaList.length === 0) return null;

      const validityResults = await Promise.all(
        mediaList.map((item) => checkMediaValidity(item.url, item.type))
      );
      const validMedia = mediaList.filter((_, i) => validityResults[i]);

      if (validMedia.length === 0) return null;

      return {
        ...ev,
        mediaList: validMedia,
        mediaUrl: validMedia[0].url,
        mediaType: validMedia[0].type || 'image',
      };
    })
  );

  return verifiedEvents.filter(Boolean);
}

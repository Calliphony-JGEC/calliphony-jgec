const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export function isCloudinaryConfigured() {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
}

/** Cloudinary folders cannot reliably use spaces/special chars for later delete-by-URL. */
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

export async function uploadToCloudinary(file, folder, onProgress) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
  const safeFolder = sanitizeCloudinaryFolder(folder);

  const formData = new FormData();
  formData.append('file', file, file.name || 'media_upload');
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (safeFolder) formData.append('folder', safeFolder);

  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += (1 - progress) * 0.15;
    if (onProgress) onProgress(progress);
  }, 200);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    clearInterval(progressInterval);

    if (onProgress) onProgress(1);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Upload failed (${response.status})`);
    }

    const data = await response.json();
    const resourceType = data.resource_type === 'video' ? 'video' : 'image';
    let thumbnailUrl = '';
    if (resourceType === 'video' && data.secure_url) {
      thumbnailUrl = data.secure_url
        .replace('/video/upload/', '/video/upload/so_0,f_jpg,q_auto/')
        .replace(/\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i, '.jpg$2');
    }

    return {
      secure_url: data.secure_url,
      resource_type: resourceType,
      public_id: data.public_id || '',
      thumbnail_url: thumbnailUrl,
    };
  } catch (err) {
    clearInterval(progressInterval);
    throw new Error(err.message || `Network error uploading ${file.name}`);
  }
}

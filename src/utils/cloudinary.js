const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export function isCloudinaryConfigured() {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
}

export async function uploadToCloudinary(file, folder, onProgress) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

  const formData = new FormData();
  formData.append('file', file, file.name || 'media_upload');
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

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
    return {
      secure_url: data.secure_url,
      resource_type: data.resource_type,
    };
  } catch (err) {
    clearInterval(progressInterval);
    throw new Error(err.message || `Network error uploading ${file.name}`);
  }
}

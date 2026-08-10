import app from './app.js';
import { isCloudinaryAdminConfigured } from './utils/cloudinary.js';

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  if (isCloudinaryAdminConfigured()) {
    console.log('Cloudinary admin delete: enabled');
  } else {
    console.warn(
      'Cloudinary admin delete: DISABLED — set VITE_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET'
    );
  }
});

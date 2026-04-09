export function loadCloudinaryEnv(): {
  cloudName: string | undefined;
  apiKey: string | undefined;
  apiSecret: string | undefined;
  folderPrefix: string;
} {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folderPrefix: process.env.CLOUDINARY_FOLDER_PREFIX?.trim() || 'av-wings',
  };
}

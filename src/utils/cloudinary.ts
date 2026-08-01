export const uploadToCloudinary = async (file: File, onProgress?: (progress: number) => void) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
  const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are missing');
  }

  const timestamp = Math.round(new Date().getTime() / 1000).toString();

  // Create signature string
  const signatureString = `timestamp=${timestamp}${apiSecret}`;
  
  // Hash signature using SHA-1
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.error?.message || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error occurred during upload'));
    xhr.send(formData);
  });
};

export const deleteFromCloudinary = async (fileUrl: string) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
  const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are missing');
  }

  // Extract public_id from Cloudinary URL
  // Example URL: https://res.cloudinary.com/demo/image/upload/v1611756476/folder/sample.jpg
  // Or raw files: https://res.cloudinary.com/demo/raw/upload/v1611756476/sample.pdf
  const match = fileUrl.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
  if (!match || !match[1]) {
    throw new Error('Could not extract public_id from URL');
  }
  
  // Cloudinary often requires the file extension in the public_id for raw files (like PDFs)
  // We can just try to delete both or use 'auto' resource type if possible, but the destroy API
  // requires you to specify the resource_type (image, raw, video).
  // Let's determine resource type from the URL
  const isRaw = fileUrl.includes('/raw/upload/');
  const isVideo = fileUrl.includes('/video/upload/');
  const resourceType = isRaw ? 'raw' : (isVideo ? 'video' : 'image');

  // For raw files, the public_id usually includes the extension.
  let publicId = match[1];
  if (isRaw) {
    const fullFilenameMatch = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (fullFilenameMatch && fullFilenameMatch[1]) {
      publicId = fullFilenameMatch[1];
    }
  }

  const timestamp = Math.round(new Date().getTime() / 1000).toString();

  // Create signature string
  const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  
  // Hash signature using SHA-1
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Delete failed');
  }

  return response.json();
};

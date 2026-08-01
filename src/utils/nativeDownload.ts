import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Detects if the app is running inside a native Capacitor shell (Android/iOS).
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Converts a Blob to a base64 string.
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Cross-platform file download.
 * - On Web: uses the classic <a download> trick.
 * - On Android/iOS: writes to the device cache, then opens the native Share sheet
 *   so the user can save to Files, send via WhatsApp, etc.
 */
export const downloadFile = async (
  blob: Blob,
  fileName: string,
  _mimeType?: string
): Promise<void> => {
  if (isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob);

      // Write file to the device's cache directory
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      // Share the file so the user can save / send it
      await Share.share({
        title: fileName,
        url: result.uri,
        dialogTitle: `Save ${fileName}`,
      });
    } catch (error) {
      console.error('Native download failed:', error);
      // Fallback to web download
      webDownload(blob, fileName);
    }
  } else {
    webDownload(blob, fileName);
  }
};

/**
 * Standard web download using a temporary <a> element.
 */
const webDownload = (blob: Blob, fileName: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

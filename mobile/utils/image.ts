/**
 * Convert local image URI to base64 data URL for API upload.
 * Aggressive resize/compress to avoid OOM on Expo Go.
 */

import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

const MAX_SIZE = 480; // max width/height (Expo Go memory limit)
const COMPRESS = 0.35; // 0-1, lower = smaller file

/**
 * Resize to 480px and compress to JPEG. Saves to file first, then reads base64
 * to reduce peak memory (avoids holding bitmap + base64 at once).
 */
export async function compressAndToBase64(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_SIZE, height: MAX_SIZE } }],
    {
      compress: COMPRESS,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false, // save to file first
    }
  );
  const base64 = await FileSystem.readAsStringAsync(result.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Legacy: raw base64 without compression (use compressAndToBase64 for upload).
 */
export async function uriToBase64(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
}

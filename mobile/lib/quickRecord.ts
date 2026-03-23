import { useMomentsStore } from "@/lib/momentsStore";
import { useAuth } from "@/lib/auth";
import { createMoment } from "@/services/api/momentService";
import { compressAndToBase64 } from "@/utils/image";
import { isExpoGo } from "@/lib/env";
import { MOCK_PROFILE } from "@/constants/mockData";
import type { ArtistMoment } from "@/types";

export async function quickRecordAndSave(imageUri: string): Promise<boolean> {
  const { addMoment, replaceMoment } = useMomentsStore.getState();
  const userId = useAuth.getState().userId;

  const momentForLocal: ArtistMoment = {
    id: `moment-${Date.now()}`,
    artistId: userId || MOCK_PROFILE.id,
    artistName: MOCK_PROFILE.name,
    imageUri,
    state: "working",
    medium: "painting",
    createdAt: new Date().toISOString(),
  };

  // Save locally first so data survives if app crashes during upload
  await addMoment(momentForLocal);

  // Skip server upload in Expo Go (memory limits cause crashes)
  if (isExpoGo()) return true;

  try {
    let imageUrl = imageUri;
    if (imageUri.startsWith("file://")) {
      try {
        imageUrl = await compressAndToBase64(imageUri);
      } catch {
        // keep uri; local already saved
      }
    }

    const apiResult = await createMoment({
      state: "working",
      medium: "painting",
      imageUrl,
    });

    if (apiResult.ok && apiResult.moment) {
      await replaceMoment(momentForLocal.id, apiResult.moment);
    }
    return true;
  } catch {
    // Local already saved above
    return true;
  }
}

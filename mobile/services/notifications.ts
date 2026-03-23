/**
 * Daily Artist Ritual notification.
 * Local notifications first. Replace with Expo Push API for production.
 */

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREF_KEY = "@rob_notification_enabled";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function getNotificationPreference(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(PREF_KEY);
    return v === "true";
  } catch {
    return true;
  }
}

export async function saveNotificationPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY, String(enabled));
}

/**
 * Schedule daily Ritual Call at 9 PM.
 * "Show what you're working on right now."
 */
export async function scheduleDailyRitualNotification(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Ritual Call",
        body: "Show what you're working on right now.",
      },
      trigger: {
        type: "daily",
        hour: 21,
        minute: 0,
        repeats: true,
      } as any,
    });
  } catch (e) {
    console.warn("Could not schedule notification:", e);
  }
}

/**
 * Cancel all scheduled notifications (including daily reminder).
 */
export async function cancelDailyRitualNotification(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * DEV: Schedule a test notification in 60 seconds.
 * Use for development/testing only. Remove or hide in production.
 */
export async function scheduleTestNotification(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Ritual Call",
        body: "Show what you're working on right now.",
      },
      trigger: {
        seconds: 60,
        repeats: false,
      } as any,
    });
  } catch (e) {
    console.warn("Could not schedule test notification:", e);
    throw e;
  }
}

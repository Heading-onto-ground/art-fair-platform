/**
 * Detect if app runs in Expo Go (limited memory, upload often crashes).
 * Skip server upload in Expo Go; save locally only.
 */
import Constants, { ExecutionEnvironment } from "expo-constants";

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

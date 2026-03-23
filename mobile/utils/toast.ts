/**
 * Simple toast/feedback for success/error messages.
 * Uses Alert for now; can be replaced with a proper toast library.
 */

import { Alert } from "react-native";

export function showSuccess(message: string, onDismiss?: () => void) {
  Alert.alert("", message, [{ text: "OK", onPress: onDismiss }]);
}

export function showError(message: string) {
  Alert.alert("Error", message, [{ text: "OK" }]);
}

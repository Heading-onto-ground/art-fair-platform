/**
 * Error boundary for Artist Ritual.
 * Catches React render errors and shows a fallback UI instead of a blank screen.
 * Logs errors for debugging.
 */

import React, { Component, type ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { logError } from "@/utils/logger";
import { colors, spacing, typography } from "@/constants/theme";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, "ErrorBoundary", {
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {(global as unknown as { __DEV__?: boolean }).__DEV__
              ? this.state.error.message
              : "Please try again."}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.bgPrimary,
  },
  title: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.body.fontSize,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bgDark,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: colors.textOnDark,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

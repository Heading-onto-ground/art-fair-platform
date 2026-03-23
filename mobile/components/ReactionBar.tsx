/**
 * Quick Reaction bar for Artist Moment cards.
 * 🔥 fire | 🤯 mind_blown | 👀 eyes | 🧠 brain
 */

import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { reactToMoment } from "@/services/api/momentService";
import { showError } from "@/utils/toast";
import type { ArtistMoment, ReactionType } from "@/types";
import { colors, spacing } from "@/constants/theme";

const REACTIONS: { type: ReactionType; emoji: string }[] = [
  { type: "fire", emoji: "🔥" },
  { type: "mind_blown", emoji: "🤯" },
  { type: "eyes", emoji: "👀" },
  { type: "brain", emoji: "🧠" },
];

interface ReactionBarProps {
  moment: ArtistMoment;
  onReactionUpdate?: (momentId: string, reactions: Record<string, number>, myReaction: ReactionType | null) => void;
}

export function ReactionBar({ moment, onReactionUpdate }: ReactionBarProps) {
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);
  const reactions = moment.reactions ?? {};
  const myReaction = moment.myReaction ?? null;

  const doOptimisticUpdate = (t: ReactionType) => {
    const prev = { ...reactions };
    const isRemoving = myReaction === t;
    if (isRemoving) {
      prev[t] = Math.max(0, (prev[t] ?? 0) - 1);
      if (prev[t] === 0) delete prev[t];
      onReactionUpdate?.(moment.id, prev, null);
    } else {
      if (myReaction) {
        prev[myReaction] = Math.max(0, (prev[myReaction] ?? 0) - 1);
        if (prev[myReaction] === 0) delete prev[myReaction];
      }
      prev[t] = (prev[t] ?? 0) + 1;
      onReactionUpdate?.(moment.id, prev, t);
    }
  };

  const handlePress = async (type: ReactionType) => {
    doOptimisticUpdate(type);
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const res = await reactToMoment(moment.id, type);
      if (reqId !== reqIdRef.current) return;
      if (res.ok && res.reactions !== undefined) {
        onReactionUpdate?.(moment.id, res.reactions ?? {}, res.reactionType ?? null);
      } else if (
        res.error?.toLowerCase().includes("not found") ||
        res.error?.toLowerCase().includes("unauthorized")
      ) {
        // Keep optimistic state
      } else if (res.error) {
        showError(res.error);
        if (reqId === reqIdRef.current) doOptimisticUpdate(type);
      }
    } catch {
      if (reqId === reqIdRef.current) {
        showError("Failed to react");
        doOptimisticUpdate(type);
      }
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  };

  return (
    <View style={styles.row} collapsable={false}>
      {REACTIONS.map(({ type, emoji }) => {
        const count = reactions[type] ?? 0;
        const isActive = myReaction === type;
        return (
          <TouchableOpacity
            key={type}
            style={[styles.btn, isActive && styles.btnActive]}
            onPress={() => handlePress(type)}
            activeOpacity={0.6}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            {count > 0 && (
              <Text style={[styles.count, isActive && styles.countActive]}>{count}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: colors.bgSecondary,
  },
  btnActive: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  emoji: {
    fontSize: 12,
  },
  count: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "500",
  },
  countActive: {
    color: colors.accent,
  },
});

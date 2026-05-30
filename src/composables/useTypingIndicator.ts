import type { RealtimeChannel } from "@supabase/supabase-js";
import { onUnmounted, ref, watch, type ComputedRef, type Ref } from "vue";

import { supabase } from "@src/lib/supabase";
import { isSupabaseConversationId } from "@src/composables/useConversationMessages";

/** How long (ms) after the last keystroke before we consider typing stopped. */
const TYPING_TIMEOUT_MS = 3000;

type TypingPayload = {
  userId: string;
  displayName: string;
};

/**
 * Provides real-time typing indicators via Supabase Broadcast.
 *
 * - `broadcastTyping()` — call whenever the local user types a character.
 * - `typingUsers` — reactive list of other users currently typing.
 */
export function useTypingIndicator(
  conversationId: ComputedRef<string | undefined>,
  currentUserId: ComputedRef<string | undefined>,
  currentDisplayName: ComputedRef<string>,
) {
  const typingUsers: Ref<Map<string, string>> = ref(new Map());
  let channel: RealtimeChannel | null = null;
  let stopTimer: ReturnType<typeof setTimeout> | null = null;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const clearChannel = () => {
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
    typingUsers.value = new Map();
  };

  const removeTypingUser = (userId: string) => {
    const next = new Map(typingUsers.value);
    next.delete(userId);
    typingUsers.value = next;
  };

  const addTypingUser = (userId: string, name: string) => {
    const next = new Map(typingUsers.value);
    next.set(userId, name);
    typingUsers.value = next;

    // Auto-remove after timeout if no further events arrive
    const existing = timers.get(userId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      removeTypingUser(userId);
      timers.delete(userId);
    }, TYPING_TIMEOUT_MS + 500);
    timers.set(userId, t);
  };

  watch(
    conversationId,
    (id) => {
      clearChannel();
      if (!id || !isSupabaseConversationId(id)) return;

      channel = supabase
        .channel(`typing:${id}`)
        .on("broadcast", { event: "typing" }, ({ payload }: { payload: TypingPayload }) => {
          const uid = currentUserId.value;
          if (!payload?.userId || payload.userId === uid) return;
          addTypingUser(payload.userId, payload.displayName || "Someone");
        })
        .subscribe();
    },
    { immediate: true },
  );

  onUnmounted(() => {
    clearChannel();
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
    if (stopTimer) clearTimeout(stopTimer);
  });

  /** Call on every input event in the composer. */
  const broadcastTyping = () => {
    if (!channel || !currentUserId.value) return;
    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId: currentUserId.value,
        displayName: currentDisplayName.value,
      } satisfies TypingPayload,
    });
  };

  return { typingUsers, broadcastTyping };
}

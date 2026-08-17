import type { RealtimeChannel } from "@supabase/supabase-js";
import { onUnmounted, watch } from "vue";

import { supabase } from "@src/lib/supabase";
import useStore from "@src/store/store";
import { notifyNewMessage } from "@src/lib/notify";
import type { IConversation, IContact, IMessage } from "@src/types";

type ConversationRow = {
  id: string;
  type: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
};

type ParticipantRow = {
  user_id: string;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    last_seen: string | null;
  } | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  type: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

function profileToContact(p: {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  last_seen?: string | null;
}): IContact {
  const displayName = p.display_name?.trim();
  const parts = displayName ? displayName.split(/\s+/) : [];
  const firstName = parts[0] || p.username || "User";
  const lastName = parts.slice(1).join(" ") || "";

  return {
    id: p.id,
    firstName,
    lastName,
    avatar: p.avatar_url || "",
    email: "",
    lastSeen: p.last_seen ? new Date(p.last_seen) : new Date(0),
    username: p.username,
    bio: p.bio || undefined,
  };
}

// Supabase returns UTC timestamps; if the string has no timezone designator
// JavaScript would treat it as local time — appending 'Z' forces UTC parsing.
function parseUtcDate(iso: string): Date {
  const hasTimezone = iso.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasTimezone ? iso : iso + "Z");
}

function formatMessageTime(iso: string): string {
  return parseUtcDate(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapMessageRow(row: MessageRow, sender: ProfileRow): IMessage {
  return {
    id: row.id,
    type: row.type || "text",
    content: row.content ?? undefined,
    date: formatMessageTime(row.created_at),
    timestamp: parseUtcDate(row.created_at),
    sender: profileToContact(sender),
    state: "sent",
  };
}

async function fetchConversationsFromSupabase(): Promise<IConversation[]> {
  const store = useStore();
  const uid = store.authUser?.id;
  
  if (!uid) {
    return [];
  }

  try {
    // Get conversations where user is a participant
    const { data: myParticipations, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", uid);

    if (partError || !myParticipations?.length) {
      return [];
    }

    const conversationIds = myParticipations.map((p) => p.conversation_id);

    // Fetch conversation details
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id, type, name, avatar_url, created_at")
      .in("id", conversationIds);

    if (convError || !conversations) {
      return [];
    }

    // Fetch participants for each conversation
    const result: IConversation[] = [];

    for (const conv of conversations as ConversationRow[]) {
      const { data: participants, error: pError } = await supabase
        .from("conversation_participants")
        .select(
          `
          user_id,
          profiles!conversation_participants_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            bio,
            last_seen
          )
        `,
        )
        .eq("conversation_id", conv.id);

      if (pError || !participants) continue;

      const contacts: IContact[] = (participants as unknown as ParticipantRow[])
        .filter((p) => p.profiles)
        .map((p) => profileToContact(p.profiles!));

      // Fetch the last message for this conversation
      const { data: lastMessageData, error: msgError } = await supabase
        .from("messages")
        .select(
          `
          id,
          conversation_id,
          sender_id,
          content,
          type,
          created_at,
          profiles!messages_sender_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `,
        )
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const messages: IMessage[] = [];
      if (lastMessageData && (lastMessageData as any).profiles) {
        const msgRow = lastMessageData as any;
        messages.push(mapMessageRow(msgRow, msgRow.profiles));
      }

      result.push({
        id: conv.id,
        type: conv.type || "direct",
        name: conv.name || undefined,
        avatar: conv.avatar_url || undefined,
        contacts,
        messages,
        draftMessage: "",
        unread: 0,
      });
    }

    return result;
  } catch {
    return [];
  }
}

/**
 * Loads conversations from Supabase and subscribes to new conversation_participants
 * rows to detect when someone adds you to a conversation.
 */
export function useConversationsList() {
  const store = useStore();
  let channel: RealtimeChannel | null = null;

  const loadConversations = async () => {
    const conversations = await fetchConversationsFromSupabase();

    for (const fresh of conversations) {
      const idx = store.conversations.findIndex((c) => c.id === fresh.id);
      if (idx === -1) {
        store.conversations.push({
          ...fresh,
          contacts: Array.isArray(fresh.contacts) ? fresh.contacts : [],
          messages: Array.isArray(fresh.messages) ? fresh.messages : [],
        });
      } else {
        // Update contacts and metadata; preserve messages (managed by useConversationMessages)
        store.conversations[idx].contacts = Array.isArray(fresh.contacts) ? fresh.contacts : [];
        store.conversations[idx].type = fresh.type;
        if (fresh.name !== undefined) store.conversations[idx].name = fresh.name;
        if (fresh.avatar !== undefined) store.conversations[idx].avatar = fresh.avatar;
      }
    }
  };

  const clearSubscription = () => {
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  };

  const setupRealtimeSubscription = () => {
    const uid = store.authUser?.id;
    clearSubscription();
    if (!uid) return;

    channel = supabase
      .channel("conversations_list")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${uid}`,
        },
        () => {
          void loadConversations();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const conversationId = (payload.new as any)?.conversation_id;
          const senderId: string | undefined = (payload.new as any)?.sender_id;
          const content: string | undefined = (payload.new as any)?.content;
          const msgType: string = (payload.new as any)?.type ?? "text";
          const createdAt: string | undefined = (payload.new as any)?.created_at;

          if (!conversationId) return;

          // Fire a Windows notification for messages from other users
          if (senderId && senderId !== store.authUser?.id) {
            const conv = store.conversations.find((c) => c.id === conversationId);
            const sender = conv?.contacts?.find((c) => c.id === senderId);
            const senderName = sender
              ? [sender.firstName, sender.lastName].filter(Boolean).join(" ")
              : "New message";
            const body = msgType === "image" ? "📷 Photo" : (content ?? "New message");
            void notifyNewMessage(senderName, body);
          }

          const idx = store.conversations.findIndex((c) => c.id === conversationId);
          if (idx === -1) {
            // Brand-new conversation we don't know about yet
            void loadConversations();
            return;
          }

          // Bump the unread count for messages from others, unless this
          // conversation is the one currently open on screen.
          if (
            senderId &&
            senderId !== store.authUser?.id &&
            store.conversationOpen !== conversationId
          ) {
            const conv = store.conversations[idx];
            conv.unread = (conv.unread ?? 0) + 1;
          }

          // Existing conversation — update the last message in the sidebar
          // so the preview text, time, and sort order all reflect the new message.
          if (createdAt) {
            const ts = parseUtcDate(createdAt);
            const dateStr = ts.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            });
            const conv = store.conversations[idx];
            const newStub = {
              id: (payload.new as any)?.id ?? "stub",
              type: msgType,
              content: content ?? undefined,
              date: dateStr,
              timestamp: ts,
              sender: undefined as any,
              attachments: undefined,
              replyTo: undefined,
              state: "seen" as const,
            };

            if (conv.messages && conv.messages.length > 0) {
              // Replace the last message entry with the new message so the
              // sidebar preview and timestamp both update immediately.
              conv.messages[conv.messages.length - 1] = {
                ...conv.messages[conv.messages.length - 1],
                content: newStub.content,
                date: newStub.date,
                timestamp: newStub.timestamp,
                type: newStub.type,
              };
            } else {
              conv.messages = [newStub];
            }
          }
        },
      )
      .subscribe();
  };

  // Re-run whenever the authenticated user becomes available (or changes),
  // since App.vue sets `store.authUser` asynchronously after this composable
  // is first invoked at component setup time.
  watch(
    () => store.authUser?.id,
    () => {
      setupRealtimeSubscription();
    },
    { immediate: true },
  );

  onUnmounted(() => {
    clearSubscription();
  });

  return {
    loadConversations,
  };
}

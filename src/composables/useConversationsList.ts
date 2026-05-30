import type { RealtimeChannel } from "@supabase/supabase-js";
import { onMounted, onUnmounted } from "vue";

import { supabase } from "@src/lib/supabase";
import useStore from "@src/store/store";
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
    lastSeen: new Date(),
    username: p.username,
  };
}

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
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
    timestamp: new Date(row.created_at),
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
            avatar_url
          )
        `,
        )
        .eq("conversation_id", conv.id);

      if (pError || !participants) continue;

      const contacts: IContact[] = (participants as ParticipantRow[])
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

    // Merge with existing to preserve local-only threads
    const existingIds = new Set(store.conversations.map((c) => c.id));
    const newConvs = conversations.filter((c) => !existingIds.has(c.id));
    store.conversations.push(...newConvs);
  };

  const setupRealtimeSubscription = () => {
    const uid = store.authUser?.id;
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
          if (!conversationId) return;
          const exists = store.conversations.some((c) => c.id === conversationId);
          if (!exists) void loadConversations();
        },
      )
      .subscribe();
  };

  onMounted(() => {
    setupRealtimeSubscription();
  });

  onUnmounted(() => {
    if (channel) {
      void supabase.removeChannel(channel);
    }
  });

  return {
    loadConversations,
  };
}

import type { RealtimeChannel } from "@supabase/supabase-js";
import { onUnmounted, watch, type ComputedRef } from "vue";

import { supabase } from "@src/lib/supabase";
import useStore from "@src/store/store";
import type { IAttachment, IContact, IMessage } from "@src/types";
import { getConversationIndex } from "@src/utils";

/** Standard UUID string shape (avoids treating mock ids like `"1"` as Supabase rows). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSupabaseConversationId(id: string): boolean {
  return UUID_RE.test(id);
}

type PostgrestErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function throwFromPostgrest(
  err: PostgrestErrorLike | Error | null | undefined,
): never {
  if (!err) throw new Error("Request failed");
  if (err instanceof Error) throw err;
  const bits = [
    err.message || "Request failed",
    err.code ? `[${err.code}]` : "",
    err.hint ? `Hint: ${err.hint}` : "",
    err.details ? `Details: ${err.details}` : "",
  ].filter(Boolean);
  throw new Error(bits.join(" "));
}

/** Readable message for UI (Supabase errors are plain objects, not `Error`). */
export function getSendErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === "string" && m.length) return m;
  }
  return "Could not send message.";
}

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  type: string | null;
  reply_to: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  last_seen: string | null;
};

function splitDisplayName(displayName: string | null, username: string) {
  if (!displayName?.trim()) {
    return { firstName: username, lastName: "" };
  }
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function profileToContact(p: ProfileRow): IContact {
  const { firstName, lastName } = splitDisplayName(p.display_name, p.username);
  return {
    id: p.id,
    firstName,
    lastName,
    avatar: p.avatar_url || "",
    email: "",
    lastSeen: p.last_seen ? new Date(p.last_seen) : new Date(0),
    bio: p.bio || undefined,
  };
}

function formatMessageTime(iso: string): string {
  // Supabase returns UTC timestamps; if the string has no timezone designator
  // JavaScript would treat it as local time — appending 'Z' forces UTC parsing
  // so toLocaleTimeString correctly converts to the user's local time.
  const hasTimezone = iso.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(iso);
  const d = new Date(hasTimezone ? iso : iso + "Z");
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapRowToMessage(row: MessageRow, sender: ProfileRow): IMessage {
  let attachments: IAttachment[] | undefined;
  let content: string | undefined = row.content ?? undefined;

  // Image messages store attachment metadata as JSON in the content field
  if (row.type === "image" && row.content) {
    try {
      const parsed = JSON.parse(row.content) as {
        attachments: Array<{ url: string; name: string; size: string; type: string }>;
        caption?: string;
      };
      attachments = parsed.attachments.map((a, i) => ({
        id: String(i),
        url: a.url,
        name: a.name,
        size: a.size,
        type: a.type,
      }));
      content = parsed.caption || undefined;
    } catch {
      // malformed content — fall back to treating as plain text
    }
  }

  return {
    id: row.id,
    type: row.type || "text",
    content,
    attachments,
    date: formatMessageTime(row.created_at),
    timestamp: new Date(row.created_at),
    sender: profileToContact(sender),
    replyTo: row.reply_to ?? undefined,
    state: "sent",
  };
}

async function fetchMessagesForConversation(
  conversationId: string,
): Promise<IMessage[]> {
  const { data: rows, error } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, content, type, reply_to, created_at",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) return [];

  const list = (rows || []) as MessageRow[];
  if (list.length === 0) return [];

  const senderIds = [...new Set(list.map((r) => r.sender_id))];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, last_seen")
    .in("id", senderIds);

  if (profileError) return [];

  const profileMap = new Map(
    ((profiles || []) as ProfileRow[]).map((p) => [p.id, p]),
  );

  return list
    .map((row) => {
      const sender = profileMap.get(row.sender_id);
      if (!sender) return null;
      return mapRowToMessage(row, sender);
    })
    .filter((m): m is IMessage => m !== null);
}

/**
 * Loads messages from Supabase and subscribes to Realtime `postgres_changes`
 * on `public.messages` for the active conversation.
 *
 * Requires: `messages` and `profiles` tables, RLS allowing read/write for
 * participants, and Realtime enabled for `messages` in the Supabase project.
 */
export function useConversationMessages(
  conversationId: ComputedRef<string | undefined>,
) {
  const store = useStore();
  let channel: RealtimeChannel | null = null;

  const clearChannel = () => {
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  };

  const applyMessages = (id: string, messages: IMessage[]) => {
    const idx = getConversationIndex(id);
    if (idx === undefined) return;
    store.conversations[idx].messages = messages;
  };

  const reload = async (id: string) => {
    const messages = await fetchMessagesForConversation(id);
    applyMessages(id, messages);
  };

  const subscribeToChannel = (id: string) => {
    clearChannel();
    channel = supabase
      .channel(`messages:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        () => {
          void reload(id);
        },
      )
      .subscribe();
  };

  watch(
    conversationId,
    async (id) => {
      clearChannel();
      if (!id || !isSupabaseConversationId(id)) return;

      const idx = getConversationIndex(id);

      if (idx !== undefined) {
        // Conversation already in store — load messages immediately
        await reload(id);
        subscribeToChannel(id);
      } else {
        // Conversation not yet in store (loadConversations still in-flight).
        // Watch for it to appear, then load messages once.
        const stopWatch = watch(
          () => getConversationIndex(id),
          async (newIdx) => {
            if (newIdx === undefined) return;
            stopWatch();
            await reload(id);
            subscribeToChannel(id);
          },
          { immediate: true },
        );
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    clearChannel();
  });
}

function formatLocalTime(): string {
  return new Date().toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Append an outgoing text bubble without Supabase (offline / RLS failure). */
export function appendLocalTextMessage(params: {
  conversationId: string;
  content: string;
  replyTo?: string;
}): void {
  const store = useStore();
  const uid = store.authUser?.id;
  const idx = getConversationIndex(params.conversationId);
  if (idx === undefined || !uid) {
    throw new Error("No conversation or not signed in");
  }

  const conv = store.conversations[idx];
  const self = conv.contacts.find((c) => c.id === uid);
  if (!self) {
    throw new Error("Current user not in conversation contacts");
  }

  const trimmed = params.content.trim();
  if (!trimmed) return;

  const msg: IMessage = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: "text",
    content: trimmed,
    date: formatLocalTime(),
    timestamp: new Date(),
    sender: self,
    state: "sent",
  };
  if (params.replyTo) msg.replyTo = params.replyTo;
  conv.messages.push(msg);
}

/**
 * Compose may create a client UUID before any `conversations` row exists.
 * `messages.conversation_id` references that table, so we upsert the DM
 * shell (conversation + participants) on first send.
 */
async function ensureDirectConversationRowInSupabase(
  conversationId: string,
  myUserId: string,
): Promise<void> {
  if (!isSupabaseConversationId(conversationId)) return;

  const { data: existing, error: selErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle();
  if (selErr) throwFromPostgrest(selErr);

  const store = useStore();
  const idx = getConversationIndex(conversationId);
  if (idx === undefined) {
    throw new Error(
      "Conversation is missing from the app. Open it again from Compose.",
    );
  }
  const conv = store.conversations[idx];
  const other = conv.contacts.find((c) => c.id !== myUserId);
  if (!other) {
    throw new Error(
      "Cannot sync this chat to the server: no other participant in this DM.",
    );
  }

  if (!existing) {
    const { error: cErr } = await supabase.from("conversations").insert({
      id: conversationId,
      type: "direct",
      created_by: myUserId,
    });
    if (cErr && cErr.code !== "23505") {
      throwFromPostgrest(cErr);
    }

    // Only insert participants if the conversation was just created
    const { error: pErr } = await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: conversationId, user_id: myUserId, role: "member" },
        { conversation_id: conversationId, user_id: other.id, role: "member" },
      ]);
    if (pErr && pErr.code !== "23505") {
      throwFromPostgrest(pErr);
    }
  }
}

export async function sendTextMessage(params: {
  conversationId: string;
  content: string;
  replyTo?: string;
}): Promise<void> {
  const trimmed = params.content.trim();
  if (!trimmed) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throwFromPostgrest(userError);
  if (!user) throw new Error("Not signed in");

  await ensureDirectConversationRowInSupabase(params.conversationId, user.id);

  const { error } = await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    sender_id: user.id,
    content: trimmed,
    type: "text",
    reply_to: params.replyTo ?? null,
  });

  if (error) throwFromPostgrest(error);

  await reloadConversationMessages(params.conversationId);
}

/** Refetch messages from Supabase into the Pinia conversation (e.g. after send). */
export async function reloadConversationMessages(
  conversationId: string,
): Promise<void> {
  if (!isSupabaseConversationId(conversationId)) return;
  const store = useStore();
  const messages = await fetchMessagesForConversation(conversationId);
  const idx = getConversationIndex(conversationId);
  if (idx === undefined) return;
  store.conversations[idx].messages = messages;
}

/**
 * Upload one or more images to Supabase Storage and send them as a single
 * message (type = "image"). The attachment metadata and optional caption are
 * stored as JSON in the message's `content` column.
 */
export async function sendImageMessage(params: {
  conversationId: string;
  files: File[];
  caption?: string;
}): Promise<void> {
  if (!params.files.length) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throwFromPostgrest(userError);
  if (!user) throw new Error("Not signed in");

  await ensureDirectConversationRowInSupabase(params.conversationId, user.id);

  // Upload each image and collect public URLs
  const attachments: Array<{ url: string; name: string; size: string; type: string }> = [];

  for (const file of params.files) {
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `${params.conversationId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(filePath, file, { upsert: false });

    if (uploadError) throwFromPostgrest(uploadError);

    const { data: urlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(filePath);

    const kb = Math.round(file.size / 1024);
    const sizeLabel = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

    attachments.push({
      url: urlData.publicUrl,
      name: file.name,
      size: sizeLabel,
      type: "image",
    });
  }

  const content = JSON.stringify({
    attachments,
    caption: params.caption || "",
  });

  const { error } = await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    sender_id: user.id,
    content,
    type: "image",
    reply_to: null,
  });

  if (error) throwFromPostgrest(error);

  await reloadConversationMessages(params.conversationId);
}

import { supabase } from "@src/lib/supabase";
import router from "@src/router";
import useStore from "@src/store/store";
import type { IContact, IConversation } from "@src/types";

function splitDisplayName(displayName: string | null, username: string) {
  if (!displayName?.trim()) {
    return { firstName: username || "You", lastName: "" };
  }
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

async function profileRowToContact(row: {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen?: string | null;
}): Promise<IContact> {
  const { firstName, lastName } = splitDisplayName(
    row.display_name,
    row.username,
  );
  return {
    id: row.id,
    firstName,
    lastName,
    avatar: row.avatar_url || "",
    email: "",
    lastSeen: row.last_seen ? new Date(row.last_seen) : new Date(),
  };
}

async function fetchSelfAsContact(): Promise<IContact | null> {
  const store = useStore();
  const uid = store.authUser?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, last_seen")
    .eq("id", uid)
    .maybeSingle();

  if (error || !data) {
    const dn = store.profileData.display_name?.trim();
    return {
      id: uid,
      firstName: dn ? dn.split(/\s+/)[0] : "You",
      lastName: dn ? dn.split(/\s+/).slice(1).join(" ") : "",
      avatar: store.profileData.avatar_url || "",
      email: "",
      lastSeen: new Date(),
    };
  }

  return profileRowToContact(data);
}

function findLocalDirectWithContact(contactId: string): IConversation | undefined {
  const store = useStore();
  return store.conversations.find((c) => {
    if (c.type !== "couple" && c.type !== "direct") return false;
    return c.contacts.some((p) => p.id === contactId);
  });
}

function ensureConversationInStore(conv: IConversation) {
  const store = useStore();
  if (!store.conversations.some((c) => c.id === conv.id)) {
    store.conversations.unshift(conv);
  }
}

async function tryFindDirectConversationSupabase(
  myId: string,
  otherId: string,
): Promise<string | null> {
  try {
    const { data: mine, error: e1 } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", myId);
    if (e1 || !mine?.length) return null;

    const myConvIds = mine.map((r) => r.conversation_id as string);
    const { data: shared, error: e2 } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherId)
      .in("conversation_id", myConvIds);
    if (e2 || !shared?.length) return null;

    for (const row of shared) {
      const cid = row.conversation_id as string;
      const { data: conv, error: e3 } = await supabase
        .from("conversations")
        .select("id, type")
        .eq("id", cid)
        .maybeSingle();
      if (e3 || !conv) continue;
      const t = String(conv.type || "").toLowerCase();
      if (t === "direct" || t === "couple") return conv.id as string;
    }
    return null;
  } catch {
    return null;
  }
}

async function tryCreateDirectConversationSupabase(
  myId: string,
  otherId: string,
): Promise<string | null> {
  try {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ type: "direct", created_by: myId })
      .select("id")
      .single();
    if (error || !created?.id) return null;

    const cid = created.id as string;
    const { error: pErr } = await supabase.from("conversation_participants").insert([
      { conversation_id: cid, user_id: myId, role: "member" },
      { conversation_id: cid, user_id: otherId, role: "member" },
    ]);
    if (pErr) return null;
    return cid;
  } catch {
    return null;
  }
}

/**
 * Opens `/chat/:id` for a 1:1 with the given contact: reuses an existing
 * thread in the store or Supabase when possible; otherwise creates a row
 * in `conversations` / `conversation_participants` when those tables exist,
 * or falls back to a client-only conversation UUID.
 */
export async function openDirectConversationWithContact(
  contact: IContact,
  closeModal: () => void,
): Promise<void> {
  const store = useStore();
  const myId = store.authUser?.id;
  if (!myId) return;

  const existingLocal = findLocalDirectWithContact(contact.id);
  if (existingLocal) {
    closeModal();
    store.activeSidebarComponent = "messages";
    await router.push({ path: `/chat/${existingLocal.id}/` });
    return;
  }

  let conversationId =
    (await tryFindDirectConversationSupabase(myId, contact.id)) ??
    (await tryCreateDirectConversationSupabase(myId, contact.id));

  const self = await fetchSelfAsContact();
  if (!self) return;

  if (!conversationId) {
    conversationId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${contact.id}`;
  }

  const conv: IConversation = {
    id: conversationId,
    type: "couple",
    draftMessage: "",
    contacts: [self, contact],
    messages: [],
    unread: 0,
  };
  ensureConversationInStore(conv);

  closeModal();
  store.activeSidebarComponent = "messages";
  await router.push({ path: `/chat/${conversationId}/` });
}

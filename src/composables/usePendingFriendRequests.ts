import { computed, onUnmounted, ref, watch } from "vue";

import { supabase } from "@src/lib/supabase";
import useStore from "@src/store/store";

export type PendingFriendRow = {
  id: string;
  sender_id: string;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

export function usePendingFriendRequests() {
  const store = useStore();

  const pendingRequests = ref<PendingFriendRow[]>([]);
  const loadingRequests = ref(false);
  const listError = ref("");
  const busyRequestId = ref<string | null>(null);
  const actionError = ref("");

  let pollTimer: number | undefined;

  const pendingCount = computed(() => pendingRequests.value.length);

  const fetchPendingRequests = async (silent = false) => {
    if (!store.authUser?.id) {
      pendingRequests.value = [];
      return;
    }

    if (!silent) {
      loadingRequests.value = true;
    }
    listError.value = "";

    try {
      const { data: rows, error } = await supabase
        .from("friend_requests")
        .select("id, sender_id, created_at")
        .eq("receiver_id", store.authUser.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const reqs = rows || [];
      const senderIds = [...new Set(reqs.map((r) => r.sender_id))];

      const profileMap = new Map<string, NonNullable<PendingFriendRow["sender"]>>();
      if (senderIds.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", senderIds);

        if (pErr) throw pErr;
        for (const p of profs || []) {
          profileMap.set(p.id, p);
        }
      }

      pendingRequests.value = reqs.map((r) => ({
        ...r,
        sender: profileMap.get(r.sender_id),
      }));
    } catch (e: unknown) {
      listError.value =
        e instanceof Error ? e.message : "Could not load requests";
      pendingRequests.value = [];
    } finally {
      if (!silent) {
        loadingRequests.value = false;
      }
    }
  };

  const startPolling = () => {
    if (pollTimer !== undefined) {
      window.clearInterval(pollTimer);
    }
    pollTimer = window.setInterval(() => {
      void fetchPendingRequests(true);
    }, 30000);
  };

  onUnmounted(() => {
    if (pollTimer !== undefined) {
      window.clearInterval(pollTimer);
    }
  });

  watch(
    () => store.authUser?.id,
    () => {
      void fetchPendingRequests();
    },
  );

  const acceptRequest = async (req: PendingFriendRow, onAccepted?: () => void) => {
    if (!store.authUser?.id) return;

    busyRequestId.value = req.id;
    actionError.value = "";

    try {
      const { error: rpcError } = await supabase.rpc("accept_friend_request", {
        request_id: req.id,
      });

      if (!rpcError) {
        await fetchPendingRequests(true);
        onAccepted?.();
        return;
      }

      const msg = (rpcError.message || "").toLowerCase();
      const rpcMissing =
        rpcError.code === "42883" ||
        rpcError.code === "PGRST202" ||
        msg.includes("could not find") ||
        msg.includes("does not exist") ||
        msg.includes("schema cache");

      if (!rpcMissing) {
        throw rpcError;
      }

      const uid = store.authUser.id;
      const { error: insErr } = await supabase.from("friendships").insert([
        { user_id: uid, friend_id: req.sender_id },
        { user_id: req.sender_id, friend_id: uid },
      ]);
      if (insErr) throw insErr;

      const { error: upErr } = await supabase
        .from("friend_requests")
        .update({
          status: "accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.id)
        .eq("receiver_id", uid);

      if (upErr) throw upErr;

      await fetchPendingRequests(true);
      onAccepted?.();
    } catch (e: unknown) {
      const raw =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "";
      const hint =
        raw.includes("42501") || raw.toLowerCase().includes("row-level security")
          ? " Run the SQL in FRIENDS_SETUP.md: create accept_friend_request RPC + GRANT, or replace friendships INSERT policy (involving self)."
          : "";
      actionError.value =
        (e instanceof Error ? e.message : "Could not accept request") + hint;
    } finally {
      busyRequestId.value = null;
    }
  };

  const rejectRequest = async (req: PendingFriendRow) => {
    if (!store.authUser?.id) return;

    busyRequestId.value = req.id;
    actionError.value = "";

    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.id)
        .eq("receiver_id", store.authUser.id);

      if (error) throw error;

      await fetchPendingRequests(true);
    } catch (e: unknown) {
      actionError.value =
        e instanceof Error ? e.message : "Could not reject request";
    } finally {
      busyRequestId.value = null;
    }
  };

  return {
    pendingRequests,
    loadingRequests,
    listError,
    busyRequestId,
    actionError,
    pendingCount,
    fetchPendingRequests,
    acceptRequest,
    rejectRequest,
    startPolling,
  };
}

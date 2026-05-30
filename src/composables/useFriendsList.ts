import { onMounted, ref } from "vue";

import { supabase } from "@src/lib/supabase";
import useStore from "@src/store/store";
import type { IContact } from "@src/types";

type FriendRow = {
  friend_id: string;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string | null;
    last_seen: string | null;
  } | null;
};

function mapFriendRow(f: FriendRow): IContact {
  const p = f.profiles;
  const username = p?.username ?? "";
  const displayName = p?.display_name?.trim() ?? "";
  const firstName = displayName
    ? displayName.split(/\s+/)[0]
    : username || "Friend";
  const lastName = displayName
    ? displayName.split(/\s+/).slice(1).join(" ")
    : "";

  return {
    id: p?.id ?? f.friend_id,
    firstName,
    lastName,
    avatar: p?.avatar_url || "",
    email: "",
    lastSeen: p?.last_seen ? new Date(p.last_seen) : new Date(),
    ...(username ? { username } : {}),
  };
}

export function useFriendsList() {
  const store = useStore();
  const friends = ref<IContact[]>([]);
  const loading = ref(false);
  const loadError = ref("");

  const loadFriends = async () => {
    if (!store.authUser) {
      friends.value = [];
      return;
    }

    loading.value = true;
    loadError.value = "";

    try {
      const { data, error } = await supabase
        .from("friendships")
        .select(
          `
          friend_id,
          profiles!friendships_friend_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            status,
            last_seen
          )
        `,
        )
        .eq("user_id", store.authUser.id);

      if (error) throw error;

      friends.value = (data || []).map((row: FriendRow) => mapFriendRow(row));
    } catch (e) {
      loadError.value =
        e instanceof Error ? e.message : "Could not load contacts.";
      friends.value = [];
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    void loadFriends();
  });

  return { friends, loading, loadError, loadFriends };
}

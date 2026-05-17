<script setup lang="ts">
import {
  ArrowLeftIcon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/vue/24/outline";
import type { IContactGroup } from "@src/types";
import type { Ref } from "vue";
import { ref, watch, onMounted } from "vue";

import useStore from "@src/store/store";
import { supabase } from "@src/lib/supabase";
import {
  usePendingFriendRequests,
  type PendingFriendRow,
} from "@src/composables/usePendingFriendRequests";

import NoContacts from "@src/components/states/empty-states/NoContacts.vue";
import MultipleLines from "@src/components/states/loading-states/MultipleLines.vue";
import Button from "@src/components/ui/inputs/Button.vue";
import IconButton from "@src/components/ui/inputs/IconButton.vue";
import LabeledTextInput from "@src/components/ui/inputs/LabeledTextInput.vue";
import SearchInput from "@src/components/ui/inputs/SearchInput.vue";
import SortedContacts from "@src/components/views/HomeView/Sidebar/Contacts/SortedContacts.vue";
import SidebarHeader from "@src/components/views/HomeView/Sidebar/SidebarHeader.vue";

const store = useStore();

const {
  pendingRequests,
  loadingRequests,
  listError,
  busyRequestId,
  actionError,
  pendingCount,
  fetchPendingRequests,
  acceptRequest: acceptFriendRequest,
  rejectRequest: rejectFriendRequest,
  startPolling,
} = usePendingFriendRequests();

const searchText: Ref<string> = ref("");
const loading = ref(true);
const friends = ref<any[]>([]);

/** Primary list vs secondary panels (same pattern as requests) */
const viewMode = ref<"contacts" | "requests" | "addFriend">("contacts");

const contactContainer: Ref<HTMLElement | null> = ref(null);
const filteredContactGroups: Ref<IContactGroup[] | undefined> = ref([]);

/* —— Add friend (inline, was modal) —— */
const addUsername = ref("");
const addSearchResults = ref<
  { id: string; username: string; display_name: string | null; avatar_url: string | null }[]
>([]);
const addSearching = ref(false);
const addSending = ref(false);
const addFriendError = ref("");
const addFriendSuccess = ref("");

const loadFriends = async () => {
  if (!store.authUser) return;

  loading.value = true;

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

    friends.value = (data || []).map((f: any) => ({
      id: f.profiles.id,
      firstName: f.profiles.display_name?.split(" ")[0] || f.profiles.username,
      lastName: f.profiles.display_name?.split(" ").slice(1).join(" ") || "",
      avatar: f.profiles.avatar_url || "",
      email: "",
      lastSeen: f.profiles.last_seen
        ? new Date(f.profiles.last_seen)
        : new Date(),
      username: f.profiles.username,
      displayName: f.profiles.display_name,
    }));

    updateContactGroups();
  } catch (err) {
    console.error("Failed to load friends:", err);
  } finally {
    loading.value = false;
  }
};

const updateContactGroups = () => {
  if (friends.value.length === 0) {
    filteredContactGroups.value = [];
    return;
  }

  const sortedContacts = [...friends.value].sort((a, b) =>
    a.firstName.localeCompare(b.firstName),
  );

  const groups: IContactGroup[] = [];
  let currentLetter = "";

  for (const contact of sortedContacts) {
    const firstLetter = contact.firstName[0].toUpperCase();

    if (firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      groups.push({ letter: currentLetter, contacts: [] });
    }

    groups[groups.length - 1].contacts.push(contact);
  }

  filteredContactGroups.value = groups;
};

watch(searchText, () => {
  if (!searchText.value) {
    updateContactGroups();
    return;
  }

  const filtered = friends.value.filter(
    (contact) =>
      contact.firstName
        .toLowerCase()
        .includes(searchText.value.toLowerCase()) ||
      contact.lastName
        .toLowerCase()
        .includes(searchText.value.toLowerCase()) ||
      contact.username?.toLowerCase().includes(searchText.value.toLowerCase()),
  );

  const sortedContacts = [...filtered].sort((a, b) =>
    a.firstName.localeCompare(b.firstName),
  );

  const groups: IContactGroup[] = [];
  let currentLetter = "";

  for (const contact of sortedContacts) {
    const firstLetter = contact.firstName[0].toUpperCase();

    if (firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      groups.push({ letter: currentLetter, contacts: [] });
    }

    groups[groups.length - 1].contacts.push(contact);
  }

  filteredContactGroups.value = groups;
});

const resetAddFriendForm = () => {
  addUsername.value = "";
  addSearchResults.value = [];
  addFriendError.value = "";
  addFriendSuccess.value = "";
};

const closeSecondaryView = () => {
  if (viewMode.value === "requests") {
    actionError.value = "";
  }
  if (viewMode.value === "addFriend") {
    resetAddFriendForm();
  }
  viewMode.value = "contacts";
};

const openRequestsView = () => {
  viewMode.value = "requests";
  void fetchPendingRequests();
};

const openAddFriendView = () => {
  resetAddFriendForm();
  viewMode.value = "addFriend";
};

const searchAddUsers = async () => {
  const query = addUsername.value.trim();
  if (!query) {
    addFriendError.value = "Please enter a username";
    return;
  }

  addSearching.value = true;
  addFriendError.value = "";
  addSearchResults.value = [];

  try {
    const pattern = `%${query}%`;
    const selfId = store.authUser?.id;

    const base = () =>
      supabase.from("profiles").select("id, username, display_name, avatar_url");

    let byUsername = base().ilike("username", pattern).limit(10);
    let byDisplayName = base().ilike("display_name", pattern).limit(10);

    if (selfId) {
      byUsername = byUsername.neq("id", selfId);
      byDisplayName = byDisplayName.neq("id", selfId);
    }

    const [userRes, displayRes] = await Promise.all([
      byUsername,
      byDisplayName,
    ]);

    if (userRes.error) throw userRes.error;
    if (displayRes.error) throw displayRes.error;

    const merged = new Map<string, (typeof userRes.data)[0]>();
    for (const row of [...(userRes.data || []), ...(displayRes.data || [])]) {
      if (row) merged.set(row.id, row);
    }

    addSearchResults.value = Array.from(merged.values()).slice(0, 10);

    if (addSearchResults.value.length === 0) {
      addFriendError.value = "No users found";
    }
  } catch (err: unknown) {
    addFriendError.value =
      err instanceof Error ? err.message : "Failed to search users";
  } finally {
    addSearching.value = false;
  }
};

const sendFriendRequest = async (userId: string) => {
  addSending.value = true;
  addFriendError.value = "";
  addFriendSuccess.value = "";

  try {
    const { data: existingRequest, error: requestCheckError } = await supabase
      .from("friend_requests")
      .select("id")
      .or(
        `and(sender_id.eq.${store.authUser?.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${store.authUser?.id})`,
      )
      .limit(1)
      .maybeSingle();

    if (requestCheckError) throw requestCheckError;

    if (existingRequest) {
      addFriendError.value = "Friend request already exists";
      addSending.value = false;
      return;
    }

    const { data: existingFriend, error: friendCheckError } = await supabase
      .from("friendships")
      .select("id")
      .eq("user_id", store.authUser?.id)
      .eq("friend_id", userId)
      .limit(1)
      .maybeSingle();

    if (friendCheckError) throw friendCheckError;

    if (existingFriend) {
      addFriendError.value = "Already friends with this user";
      addSending.value = false;
      return;
    }

    const { error: requestError } = await supabase.from("friend_requests").insert({
      sender_id: store.authUser?.id,
      receiver_id: userId,
    });

    if (requestError) throw requestError;

    addFriendSuccess.value = "Friend request sent!";

    window.setTimeout(() => {
      addFriendSuccess.value = "";
      resetAddFriendForm();
      viewMode.value = "contacts";
    }, 1500);
  } catch (err: unknown) {
    addFriendError.value =
      err instanceof Error ? err.message : "Failed to send friend request";
  } finally {
    addSending.value = false;
  }
};

const acceptRequest = (req: PendingFriendRow) => {
  void acceptFriendRequest(req, () => {
    void loadFriends();
  });
};

onMounted(() => {
  void loadFriends();
  void fetchPendingRequests();
  startPolling();
});
</script>

<template>
  <div class="h-full flex flex-col min-h-0">
    <SidebarHeader>
      <template v-slot:title>
        <span v-if="viewMode === 'requests'">Requests</span>
        <span v-else-if="viewMode === 'addFriend'">Add friend</span>
        <span v-else>Contacts</span>
      </template>

      <template v-slot:actions>
        <div class="flex items-center gap-1">
          <IconButton
            v-if="viewMode !== 'contacts'"
            @click="closeSecondaryView"
            class="ic-btn-ghost-primary w-7 h-7"
            title="Back to contacts"
            aria-label="Back to contacts"
          >
            <ArrowLeftIcon class="w-[1.25rem] h-[1.25rem]" />
          </IconButton>

          <template v-else>
            <div class="relative">
              <IconButton
                @click="openRequestsView"
                class="ic-btn-ghost-primary w-7 h-7"
                title="Friend requests"
                aria-label="Friend requests"
              >
                <UserGroupIcon class="w-[1.25rem] h-[1.25rem]" />
              </IconButton>
              <span
                v-if="pendingCount > 0"
                class="pointer-events-none absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] flex items-center justify-center rounded-full bg-indigo-500 px-0.5 text-[0.6rem] font-bold leading-none text-white tabular-nums dark:bg-indigo-400"
                aria-hidden="true"
              >
                {{ pendingCount > 99 ? "99+" : pendingCount }}
              </span>
            </div>

            <IconButton
              @click="openAddFriendView"
              class="ic-btn-ghost-primary w-7 h-7"
              title="Add friend"
              aria-label="Add friend"
            >
              <UserPlusIcon class="w-[1.25rem] h-[1.25rem]" />
            </IconButton>
          </template>
        </div>
      </template>
    </SidebarHeader>

    <div v-if="viewMode === 'contacts'" class="px-5 xs:pb-6 md:pb-5 shrink-0">
      <SearchInput v-model="searchText" />
    </div>

    <div
      ref="contactContainer"
      class="w-full flex-1 min-h-0 scroll-smooth scrollbar-hidden"
      style="overflow-x: visible; overflow-y: scroll"
    >
      <template v-if="viewMode === 'contacts'">
        <MultipleLines v-if="loading" v-for="item in 5" :key="item" />

        <SortedContacts
          v-else-if="friends.length > 0"
          :contactGroups="filteredContactGroups"
          :bottom-edge="
            (contactContainer as HTMLElement)?.getBoundingClientRect().bottom
          "
        />

        <NoContacts v-else />
      </template>

      <div v-else-if="viewMode === 'requests'" class="px-5 pb-5 pt-2">
        <p
          v-if="actionError"
          class="body-3 text-red-600 dark:text-red-300 mb-3"
        >
          {{ actionError }}
        </p>
        <p
          v-if="listError"
          class="body-3 text-red-600 dark:text-red-300 mb-3"
        >
          {{ listError }}
        </p>

        <div
          v-if="loadingRequests"
          class="body-3 text-black/60 dark:text-white/60 py-8 text-center"
        >
          Loading requests…
        </div>

        <div
          v-else-if="pendingRequests.length === 0"
          class="body-2 text-black/70 dark:text-white/70 py-12 text-center"
        >
          No pending friend requests.
        </div>

        <ul v-else class="space-y-3" aria-label="Friend requests">
          <li
            v-for="req in pendingRequests"
            :key="req.id"
            class="flex flex-col gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/80 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex items-center min-w-0 gap-3">
              <div
                class="w-11 h-11 shrink-0 rounded-full bg-cover bg-center bg-gray-200 dark:bg-gray-600"
                :style="
                  req.sender?.avatar_url
                    ? { backgroundImage: `url(${req.sender.avatar_url})` }
                    : {}
                "
              />
              <div class="min-w-0">
                <p
                  class="heading-2 text-black/70 dark:text-white/70 truncate"
                >
                  {{
                    req.sender?.display_name ||
                    req.sender?.username ||
                    "Someone"
                  }}
                </p>
                <p
                  v-if="req.sender?.username"
                  class="body-3 text-black/60 dark:text-white/60 truncate"
                >
                  @{{ req.sender.username }}
                </p>
              </div>
            </div>
            <div class="flex shrink-0 gap-2 justify-end">
              <Button
                class="outlined-primary outlined-text py-2 px-3"
                :disabled="busyRequestId !== null"
                @click="rejectFriendRequest(req)"
              >
                Decline
              </Button>
              <Button
                class="contained-primary contained-text py-2 px-3"
                :disabled="busyRequestId !== null"
                :loading="busyRequestId === req.id"
                @click="acceptRequest(req)"
              >
                Accept
              </Button>
            </div>
          </li>
        </ul>
      </div>

      <div v-else-if="viewMode === 'addFriend'" class="px-5 pb-5 pt-2">
        <p
          v-if="addFriendSuccess"
          class="mb-4 p-3 rounded bg-green-100 dark:bg-green-900"
        >
          <span class="body-3 text-green-700 dark:text-green-200">{{
            addFriendSuccess
          }}</span>
        </p>
        <p
          v-if="addFriendError"
          class="body-3 text-red-600 dark:text-red-300 mb-3"
        >
          {{ addFriendError }}
        </p>

        <div class="mb-5" @keyup.enter="searchAddUsers">
          <LabeledTextInput
            :value="addUsername"
            type="text"
            label="Search by username or name"
            placeholder="Enter a username"
            @valueChanged="(v) => (addUsername = v)"
          />
        </div>

        <Button
          class="outlined-primary outlined-text w-full py-3 mb-5"
          @click="searchAddUsers"
          :loading="addSearching"
        >
          {{ addSearching ? "Searching…" : "Search" }}
        </Button>

        <div v-if="addSearchResults.length > 0" class="space-y-3">
          <p class="body-2 text-black/70 dark:text-white/70 mb-2">
            Search results
          </p>
          <ul class="space-y-3" aria-label="Search results">
            <li
              v-for="user in addSearchResults"
              :key="user.id"
              class="flex flex-col gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/80 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="flex items-center min-w-0 gap-3">
                <div
                  class="w-11 h-11 shrink-0 rounded-full bg-cover bg-center bg-gray-200 dark:bg-gray-600"
                  :style="
                    user.avatar_url
                      ? { backgroundImage: `url(${user.avatar_url})` }
                      : {}
                  "
                />
                <div class="min-w-0">
                  <p
                    class="heading-2 text-black/70 dark:text-white/70 truncate"
                  >
                    {{ user.display_name || user.username }}
                  </p>
                  <p
                    class="body-3 text-black/60 dark:text-white/60 truncate"
                  >
                    @{{ user.username }}
                  </p>
                </div>
              </div>
              <div class="flex shrink-0 justify-end">
                <Button
                  class="contained-primary contained-text py-2 px-4"
                  @click="sendFriendRequest(user.id)"
                  :disabled="addSending"
                  :loading="addSending"
                >
                  Add
                </Button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

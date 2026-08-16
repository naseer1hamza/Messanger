<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

import useStore from "@src/store/store";
import { supabase } from "@src/lib/supabase";
import { useConversationsList } from "@src/composables/useConversationsList";

import FadeTransition from "@src/components/ui/transitions/FadeTransition.vue";

// Refactoring code:
// todo reorganize component structure
// todo refactor remove getters from utils file and add them to store folder.
// todo improve the video component.
// todo add shortcuts

// future features:
// todo add video calling
// todo add stories

// Accessability:
// todo improve the way you view messages.
// todo make multi-select more accessible.
// todo make dropdown menus more accessible.
// todo make modals more accessible.
// todo make lists (i.e conversations, contacts, calls) more accessible.

// SEO.
// todo improve seo.

// Performance:
// todo add dynamic imports.
// todo add chunking.

const store = useStore();

// Load conversations from Supabase and subscribe to new ones
const { loadConversations } = useConversationsList();

// update localStorage with state changes
store.$subscribe((_mutation, state) => {
  localStorage.setItem("chat", JSON.stringify(state));
});

/** Load profile + conversations for the currently authenticated user */
const loadUserData = async () => {
  if (!store.authUser) return;

  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url, chat_background_url")
    .eq("id", store.authUser.id)
    .single();

  if (data) {
    store.profileData = {
      username: data.username ?? undefined,
      display_name: data.display_name ?? undefined,
      bio: data.bio ?? undefined,
      avatar_url: data.avatar_url ?? undefined,
      chat_background_url: data.chat_background_url ?? undefined,
    };

    if (data.chat_background_url) {
      store.settings.chatBackground = data.chat_background_url;
    }
  }

  await loadConversations();

  setTimeout(() => {
    store.delayLoading = false;
    store.status = "success";
  }, 500);
};

onMounted(async () => {
  store.status = "loading";

  // Get the current session (handles page refresh while already logged in)
  const { data: { session } } = await supabase.auth.getSession();
  store.authUser = session?.user ?? null;

  if (store.authUser) {
    // Already logged in — load data immediately
    await loadUserData();
  } else {
    // Not yet logged in — mark loading done so the login page renders
    store.delayLoading = false;
    store.status = "success";
  }

  // Listen for future auth changes (login, logout, token refresh)
  supabase.auth.onAuthStateChange(async (event, newSession) => {
    const wasLoggedIn = !!store.authUser;
    store.authUser = newSession?.user ?? null;

    if (event === "SIGNED_IN" && !wasLoggedIn) {
      // User just logged in — load their data now
      store.status = "loading";
      store.delayLoading = true;
      await loadUserData();
    } else if (event === "SIGNED_OUT") {
      store.conversations = [];
    }
  });
});

// the app height
const height = ref(`${window.innerHeight}px`);

// change the app height to the window hight.
const resizeWindow = () => {
  height.value = `${window.innerHeight}px`;
};

// and add the resize event when the component mounts.
onMounted(() => {
  window.addEventListener("resize", resizeWindow);
});

// remove the event when un-mounting the component.
onUnmounted(() => {
  window.removeEventListener("resize", resizeWindow);
});
</script>

<template>
  <div :class="{ dark: store.settings.darkMode }">
    <div
      class="bg-white dark:bg-gray-800 transition-colors duration-500"
      :style="{ height: height }"
    >
      <router-view v-slot="{ Component }">
        <FadeTransition>
          <component :is="Component" />
        </FadeTransition>
      </router-view>
    </div>
  </div>
</template>

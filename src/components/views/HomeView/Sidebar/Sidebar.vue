<script setup lang="ts">
import { computed } from "vue";

import useStore from "@src/store/store";

import { Cog6ToothIcon, UserGroupIcon } from "@heroicons/vue/24/outline";
import FadeTransition from "@src/components/ui/transitions/FadeTransition.vue";
import Calls from "@src/components/views/HomeView/Sidebar/Calls/Calls.vue";
import Contacts from "@src/components/views/HomeView/Sidebar/Contacts/Contacts.vue";
import Conversations from "@src/components/views/HomeView/Sidebar/Conversations/Conversations.vue";
import Notifications from "@src/components/views/HomeView/Sidebar/Notifications/Notifications.vue";
import Settings from "@src/components/views/HomeView/Sidebar/Settings/Settings.vue";

const store = useStore();

const ActiveComponent = computed((): any => {
  if (store.activeSidebarComponent === "messages") return Conversations;
  if (store.activeSidebarComponent === "contacts") return Contacts;
  if (store.activeSidebarComponent === "notifications") return Notifications;
  if (store.activeSidebarComponent === "phone") return Calls;
  if (store.activeSidebarComponent === "settings") return Settings;
});

const displayName = computed(
  () =>
    store.profileData?.display_name ||
    store.profileData?.username ||
    store.authUser?.email?.split("@")[0] ||
    "You",
);

const avatarUrl = computed(() => store.profileData?.avatar_url || "");

const openSettings = () => {
  store.activeSidebarComponent = "settings";
};

const openContacts = () => {
  store.activeSidebarComponent = "contacts";
};
</script>

<template>
  <aside
    class="xs:w-full md:w-72.5 h-full xs:px-5 md:p-0 flex flex-col overflow-visible transition-all duration-500"
  >
    <!--active panel-->
    <div class="flex-1 min-h-0 overflow-hidden">
      <FadeTransition>
        <component :is="ActiveComponent" class="h-full flex flex-col" />
      </FadeTransition>
    </div>

    <!--contacts shortcut-->
    <div
      class="shrink-0 px-5 py-2 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-500"
    >
      <button
        @click="openContacts"
        aria-label="Open contacts"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 focus:outline-none"
        :class="
          store.activeSidebarComponent === 'contacts'
            ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-gray-700'
            : 'text-black/60 dark:text-white/50 hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700'
        "
      >
        <UserGroupIcon class="w-5 h-5 shrink-0" />
        <span>Contacts</span>
      </button>
    </div>

    <!--user profile footer-->
    <div
      class="shrink-0 flex items-center gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-500"
    >
      <!--avatar-->
      <div
        class="w-9 h-9 rounded-full bg-cover bg-center bg-gray-200 dark:bg-gray-600 shrink-0"
        :style="avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : {}"
      />

      <!--display name-->
      <p
        class="flex-1 min-w-0 text-sm font-medium text-black/70 dark:text-white/70 truncate"
      >
        {{ displayName }}
      </p>

      <!--settings button-->
      <button
        @click="openSettings"
        title="Settings"
        aria-label="Open settings"
        class="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors duration-150 focus:outline-none"
        :class="{ 'text-indigo-400 bg-indigo-50 dark:bg-gray-700': store.activeSidebarComponent === 'settings' }"
      >
        <Cog6ToothIcon class="w-5 h-5" />
      </button>
    </div>
  </aside>
</template>

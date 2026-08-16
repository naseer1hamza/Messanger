<script setup lang="ts">
import { computed } from "vue";

import useStore from "@src/store/store";

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
</script>

<template>
  <aside class="w-72.5 h-full p-0 flex flex-col overflow-visible transition-all duration-500">
    <!--active panel-->
    <div class="flex-1 min-h-0 overflow-hidden">
      <FadeTransition>
        <component :is="ActiveComponent" class="h-full flex flex-col" />
      </FadeTransition>
    </div>
  </aside>
</template>

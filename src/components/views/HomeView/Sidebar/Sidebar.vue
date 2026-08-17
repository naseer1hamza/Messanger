<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";

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

const MIN_WIDTH = 60;
const MAX_WIDTH = 520;

const isResizing = ref(false);
let startX = 0;
let startWidth = 0;

const handleResize = (e: MouseEvent) => {
  const delta = e.clientX - startX;
  store.sidebarWidth = Math.min(
    MAX_WIDTH,
    Math.max(MIN_WIDTH, startWidth + delta),
  );
};

const stopResize = () => {
  isResizing.value = false;
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  document.removeEventListener("mousemove", handleResize);
  document.removeEventListener("mouseup", stopResize);
};

const startResize = (e: MouseEvent) => {
  isResizing.value = true;
  startX = e.clientX;
  startWidth = store.sidebarWidth;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  document.addEventListener("mousemove", handleResize);
  document.addEventListener("mouseup", stopResize);
  e.preventDefault();
};

onUnmounted(() => {
  document.removeEventListener("mousemove", handleResize);
  document.removeEventListener("mouseup", stopResize);
});
</script>

<template>
  <aside
    class="h-full p-0 flex flex-col overflow-visible relative shrink-0"
    :class="{ 'transition-all duration-500': !isResizing }"
    :style="{ width: store.sidebarWidth + 'px' }"
  >
    <!--active panel-->
    <div class="flex-1 min-h-0 overflow-hidden">
      <FadeTransition>
        <component :is="ActiveComponent" class="h-full flex flex-col" />
      </FadeTransition>
    </div>

    <!--resize handle-->
    <div
      class="absolute top-0 -right-1 h-full w-2 cursor-col-resize z-10 group"
      @mousedown="startResize"
    >
      <div
        class="h-full w-px mx-auto bg-transparent group-hover:bg-indigo-300 dark:group-hover:bg-indigo-500 transition-colors duration-150"
        :class="{ '!bg-indigo-400': isResizing }"
      ></div>
    </div>
  </aside>
</template>

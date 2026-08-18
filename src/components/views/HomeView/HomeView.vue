<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import useStore from "@src/store/store";

import FadeTransition from "@src/components/ui/transitions/FadeTransition.vue";
import Navigation from "@src/components/views/HomeView/Navigation/Navigation.vue";
import Sidebar from "@src/components/views/HomeView/Sidebar/Sidebar.vue";

const store = useStore();
const route = useRoute();

const activeConversationId = computed(() => {
  const raw = route.params.id;
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
});
</script>

<template>
  <KeepAlive>
    <div class="h-full flex flex-row overflow-hidden">
      <!--navigation rail-->
      <Navigation
        class="flex shrink-0 border-r border-gray-100 dark:border-gray-700 transition-colors duration-500"
      />
      <!--sidebar-->
      <Sidebar
        class="grow-0 overflow-visible scrollbar-hidden border-r-2 border-gray-100 dark:border-gray-700 transition-colors duration-500"
      />
      <!--chat-->
      <div
        id="mainContent"
        class="static grow h-full w-fit scrollbar-hidden bg-white dark:bg-gray-800 transition-all duration-500"
        role="region"
      >
        <router-view v-slot="{ Component }">
          <FadeTransition name="fade" mode="out-in">
            <component :is="Component" />
          </FadeTransition>
        </router-view>
      </div>
    </div>
  </KeepAlive>
</template>

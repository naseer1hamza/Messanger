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
    <div
      class="xs:relative md:static h-full flex xs:flex-col md:flex-row overflow-hidden"
    >
      <!--navigation rail-->
      <Navigation
        class="flex shrink-0 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 transition-colors duration-500"
      />
      <!--sidebar-->
      <Sidebar
        class="xs:grow-1 md:grow-0 xs:overflow-y-scroll md:overflow-visible scrollbar-hidden"
      />
      <!--chat-->
      <div
        id="mainContent"
        class="xs:absolute xs:z-10 md:static grow h-full xs:w-full md:w-fit scrollbar-hidden bg-white dark:bg-gray-800 transition-all duration-500"
        :class="
          activeConversationId
            ? ['xs:-left-[0rem]', 'xs:static']
            : ['xs:left-250']
        "
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

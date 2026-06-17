<script setup lang="ts">
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import useStore from "@src/store/store";
import IconButton from "@src/components/ui/inputs/IconButton.vue";
import SidebarHeader from "@src/components/views/HomeView/Sidebar/SidebarHeader.vue";
import SettingsAccordion from "@src/components/views/HomeView/Sidebar/Settings/SettingsAccordion/SettingsAccordion.vue";

const store = useStore();
</script>

<template>
  <div>
    <SidebarHeader>
      <template v-slot:title>Settings</template>
      <template v-slot:actions>
        <IconButton
          @click="store.activeSidebarComponent = 'messages'"
          class="ic-btn-ghost-primary w-7 h-7"
          title="Back to messages"
          aria-label="Back to messages"
        >
          <ArrowLeftIcon class="w-[1.25rem] h-[1.25rem]" />
        </IconButton>
      </template>
    </SidebarHeader>

    <div
      class="w-full h-full scroll-smooth scrollbar-hidden"
      style="overflow-x: visible; overflow-y: scroll"
    >
      <SettingsAccordion />
    </div>
  </div>
</template>

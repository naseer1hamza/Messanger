<script setup lang="ts">
import type { IConversation } from "@src/types";
import type { Ref } from "vue";

import { onMounted, ref, watch } from "vue";

import useStore from "@src/store/store";
import { getActiveConversationId, getName } from "@src/utils";
import { useConversationsList } from "@src/composables/useConversationsList";

import { PencilSquareIcon } from "@heroicons/vue/24/outline";
import ComposeModal from "@src/components/shared/modals/ComposeModal/ComposeModal.vue";
import NoConversation from "@src/components/states/empty-states/NoConversation.vue";
import Circle2Lines from "@src/components/states/loading-states/Circle2Lines.vue";
import IconButton from "@src/components/ui/inputs/IconButton.vue";
import SearchInput from "@src/components/ui/inputs/SearchInput.vue";
import FadeTransition from "@src/components/ui/transitions/FadeTransition.vue";
import ArchivedButton from "@src/components/views/HomeView/Sidebar/Conversations/ArchivedButton.vue";
import ConversationsList from "@src/components/views/HomeView/Sidebar/Conversations/ConversationsList.vue";
import SidebarHeader from "@src/components/views/HomeView/Sidebar/SidebarHeader.vue";

const store = useStore();

const keyword: Ref<string> = ref("");

const composeOpen = ref(false);

// determines whether the archive is open or not
const openArchive = ref(false);

// the filtered list of conversations.
const filteredConversations: Ref<IConversation[]> = ref([]);

// Get the loadConversations function
const { loadConversations } = useConversationsList();

// Force reload function for debugging
const forceReload = async () => {
  console.log("[Conversations.vue] Force reload button clicked");
  console.log("[Conversations.vue] Current auth user:", store.authUser?.id);
  await loadConversations();
  console.log("[Conversations.vue] After reload, store.conversations:", store.conversations.length);
};

// Debug: watch store conversations
watch(() => store.conversations, (newVal) => {
  console.log("[Conversations.vue] store.conversations changed:", newVal.length, newVal);
}, { deep: true, immediate: true });

// filter the list of conversation based on search text.
watch([keyword, openArchive, () => store.conversations, () => store.archivedConversations], () => {
  console.log("[Conversations.vue] Filter watch triggered");
  console.log("[Conversations.vue] store.conversations:", store.conversations.length);
  console.log("[Conversations.vue] openArchive:", openArchive.value);
  console.log("[Conversations.vue] keyword:", keyword.value);
  
  let filtered: IConversation[] = [];
  
  if (openArchive.value) {
    // search archived conversations
    filtered =
      store.archivedConversations?.filter(
        (conversation) =>
          getName(conversation)
            ?.toLowerCase()
            .includes(keyword.value.toLowerCase()),
      ) || [];
  } else {
    // search conversations
    filtered =
      store.conversations?.filter(
        (conversation) =>
          getName(conversation)
            ?.toLowerCase()
            .includes(keyword.value.toLowerCase()),
      ) || [];
  }
  
  console.log("[Conversations.vue] Filtered (before sort):", filtered.length, filtered);
  
  // Sort by last message timestamp (most recent first)
  filtered.sort((a, b) => {
    const aMsg = a.messages[a.messages.length - 1];
    const bMsg = b.messages[b.messages.length - 1];
    const aTime = aMsg?.timestamp?.getTime() || 0;
    const bTime = bMsg?.timestamp?.getTime() || 0;
    console.log(`[Conversations.vue] Sorting: ${a.id} (time: ${aTime}) vs ${b.id} (time: ${bTime})`);
    return bTime - aTime;
  });
  
  console.log("[Conversations.vue] Filtered (after sort):", filtered.length);
  console.log("[Conversations.vue] Setting filteredConversations to:", filtered);
  filteredConversations.value = filtered;
  console.log("[Conversations.vue] filteredConversations.value is now:", filteredConversations.value.length);
}, { immediate: true, deep: true });

// (event) close the compose modal.
const closeComposeModal = () => {
  composeOpen.value = false;
};

// if the active conversation is in the archive
// then open the archive
onMounted(() => {
  let conversation = store.archivedConversations.find(
    (conversation) => conversation.id === getActiveConversationId(),
  );
  if (conversation) openArchive.value = true;
});
</script>

<template>
  <div>
    <SidebarHeader>
      <!--title-->
      <template v-slot:title>Messages</template>

      <!--side actions-->
      <template v-slot:actions>
        <IconButton
          class="ic-btn-ghost-primary w-7 h-7"
          @click="composeOpen = true"
          aria-label="compose conversation"
          title="compose conversation"
        >
          <PencilSquareIcon class="w-[1.25rem] h-[1.25rem]" />
        </IconButton>
      </template>
    </SidebarHeader>

    <!--search bar-->
    <div class="px-5 xs:pb-6 md:pb-5">
      <SearchInput
        @value-changed="
          (value) => {
            keyword = value;
          }
        "
        :value="keyword"
      />
    </div>

    <!--conversations-->
    <div
      role="list"
      aria-label="conversations"
      class="w-full h-full scroll-smooth scrollbar-hidden"
      style="overflow-x: visible; overflow-y: scroll"
    >
      <!-- Debug info -->
      <div style="padding: 10px; background: #f0f0f0; margin: 10px; border-radius: 5px; font-size: 12px; font-family: monospace;">
        <div><strong>Debug Info:</strong></div>
        <div>Status: {{ store.status }}</div>
        <div>DelayLoading: {{ store.delayLoading }}</div>
        <div>Auth User: {{ store.authUser?.id || 'NOT LOGGED IN' }}</div>
        <div>Store Conversations: {{ store.conversations.length }}</div>
        <div>Filtered Conversations: {{ filteredConversations.length }}</div>
        <div>Archived: {{ store.archivedConversations.length }}</div>
        <div style="margin-top: 10px; max-height: 200px; overflow-y: auto; background: white; padding: 5px; border-radius: 3px;">
          <div><strong>Raw store.conversations:</strong></div>
          <div v-for="(conv, idx) in store.conversations" :key="idx" style="border-bottom: 1px solid #ddd; padding: 3px 0;">
            ID: {{ conv.id }}<br>
            Type: {{ conv.type }}<br>
            Contacts: {{ conv.contacts?.length || 0 }}<br>
            Messages: {{ conv.messages?.length || 0 }}
          </div>
        </div>
        <button 
          @click="forceReload" 
          style="margin-top: 10px; padding: 5px 10px; background: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer;"
        >
          Force Reload Conversations
        </button>
      </div>

      <Circle2Lines
        v-if="store.status === 'loading' || store.delayLoading"
        v-for="item in 6"
      />

      <div v-else>
        <ArchivedButton
          v-if="store.archivedConversations.length > 0"
          :open="openArchive"
          @click="openArchive = !openArchive"
        />

        <div
          v-if="
            store.status === 'success' &&
            !store.delayLoading &&
            filteredConversations.length > 0
          "
        >
          <FadeTransition>
            <component
              :is="ConversationsList"
              :filtered-conversations="filteredConversations"
              :key="openArchive ? 'archive' : 'active'"
            />
          </FadeTransition>
        </div>

        <div v-else>
          <NoConversation v-if="store.archivedConversations.length === 0" />
        </div>
      </div>
    </div>

    <!--compose modal-->
    <ComposeModal :open="composeOpen" :close-modal="closeComposeModal" />
  </div>
</template>

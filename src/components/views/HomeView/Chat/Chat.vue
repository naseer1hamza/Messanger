<script setup lang="ts">
import type { Ref } from "vue";

import useStore from "@src/store/store";
import { computed, provide, ref, watchEffect } from "vue";
import { useRoute } from "vue-router";

import { useConversationMessages } from "@src/composables/useConversationMessages";
import { useTypingIndicator } from "@src/composables/useTypingIndicator";
import { getActiveConversationId } from "@src/utils";

import NoChatSelected from "@src/components/states/empty-states/NoChatSelected.vue";
import Spinner from "@src/components/states/loading-states/Spinner.vue";
import ChatBottom from "@src/components/views/HomeView/Chat/ChatBottom/ChatBottom.vue";
import ChatMiddle from "@src/components/views/HomeView/Chat/ChatMiddle/ChatMiddle.vue";
import ChatTop from "@src/components/views/HomeView/Chat/ChatTop/ChatTop.vue";

const store = useStore();
const route = useRoute();

const activeRouteConversationId = computed(() => {
  const raw = route.params.id;
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
});

useConversationMessages(activeRouteConversationId);

const currentUserId = computed(() => store.authUser?.id);
const currentDisplayName = computed(
  () =>
    store.profileData?.display_name ||
    store.profileData?.username ||
    store.authUser?.email ||
    "Me",
);

const { typingUsers, broadcastTyping } = useTypingIndicator(
  activeRouteConversationId,
  currentUserId,
  currentDisplayName,
);

provide("typingUsers", typingUsers);
provide("broadcastTyping", broadcastTyping);

// search the selected conversation using activeConversationId.
const activeConversationComputed = computed(() => {
  // Get conversation ID from route params
  const raw = route.params.id;
  const conversationId = raw ? (Array.isArray(raw) ? raw[0] : raw) : undefined;
  
  if (!conversationId) return undefined;
  
  let activeConversation = store.conversations.find(
    (conversation) => conversation.id === conversationId,
  );

  if (activeConversation) {
    return activeConversation;
  } else {
    return store.archivedConversations.find(
      (conversation) => conversation.id === conversationId,
    );
  }
});

const activeConversation = ref(activeConversationComputed.value);
watchEffect(() => {
  activeConversation.value = activeConversationComputed.value;
});

// provide the active conversation ref to all children
provide("activeConversation", activeConversation);

// determines whether select mode is enabled.
const selectMode = ref(false);

// determines whether all the messages are selected or not.
const selectAll = ref(false);

// holds the selected conversations.
const selectedMessages: Ref<string[]> = ref([]);

// (event) add message to select messages.
const handleSelectMessage = (messageId: string) => {
  selectedMessages.value.push(messageId);

  if (
    activeConversation.value &&
    selectedMessages.value.length === activeConversation.value.messages.length
  ) {
    selectAll.value = true;
  }

  if (!selectMode.value) {
    selectMode.value = true;
  }
};

// (event) remove message from select messages.
const handleDeselectMessage = (messageId: string) => {
  selectAll.value = false;
  selectedMessages.value = selectedMessages.value.filter(
    (item) => item !== messageId,
  );

  if (activeConversation.value && selectedMessages.value.length === 0) {
    selectMode.value = false;
  }
};

// (event) select all messages.
const handleSelectAll = () => {
  if (activeConversation.value) {
    const messages = activeConversation.value.messages.map(
      (message) => message.id,
    );
    selectedMessages.value = messages;
    selectAll.value = true;
  }
};

// (event) remove the selected messages.
const handleDeselectAll = () => {
  selectAll.value = false;
  selectedMessages.value = [];
};

// (event handle close Select)
const handleCloseSelect = () => {
  selectMode.value = false;
  selectAll.value = false;
  selectedMessages.value = [];
};
</script>

<template>
  <Spinner v-if="store.status === 'loading' || store.delayLoading" />

  <div
    v-else-if="route.params.id && activeConversation"
    class="h-full flex flex-col scrollbar-hidden"
  >
    <ChatTop
      :select-all="selectAll"
      :select-mode="selectMode"
      :handle-select-all="handleSelectAll"
      :handle-deselect-all="handleDeselectAll"
      :handle-close-select="handleCloseSelect"
    />
    <ChatMiddle
      :selected-messages="selectedMessages"
      :handle-select-message="handleSelectMessage"
      :handle-deselect-message="handleDeselectMessage"
    />
    <ChatBottom />
  </div>

  <NoChatSelected v-else />
</template>

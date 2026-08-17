<script setup lang="ts">
import type { Ref } from "vue";

import useStore from "@src/store/store";
import { computed, provide, ref, watch, watchEffect } from "vue";
import { useRoute } from "vue-router";

import { useConversationMessages } from "@src/composables/useConversationMessages";
import { deleteMessage } from "@src/composables/useConversationMessages";
import { useTypingIndicator } from "@src/composables/useTypingIndicator";
import { getOddContact } from "@src/utils";

import NoChatSelected from "@src/components/states/empty-states/NoChatSelected.vue";
import Spinner from "@src/components/states/loading-states/Spinner.vue";
import ChatBottom from "@src/components/views/HomeView/Chat/ChatBottom/ChatBottom.vue";
import ChatMiddle from "@src/components/views/HomeView/Chat/ChatMiddle/ChatMiddle.vue";
import PinnedMessage from "@src/components/views/HomeView/Chat/ChatTop/PinnedMessage.vue";
import SelectSection from "@src/components/views/HomeView/Chat/ChatTop/SelectSection.vue";
import ConversationInfoSection from "@src/components/views/HomeView/Chat/ChatTop/ConversationInfoSection.vue";
import ConversationInfoModal from "@src/components/shared/modals/ConversationInfoModal/ConversationInfoModal.vue";
import OutgoingCallModal from "@src/components/shared/modals/OutgoingCallModal/OutgoingCallModal.vue";
import SearchModal from "@src/components/shared/modals/SearchModal/SearchModal.vue";
import VoiceCallModal from "@src/components/shared/modals/VoiceCallModal/VoiceCallModal.vue";

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

// Keep the store aware of which conversation is currently open so the
// realtime handler doesn't increment its unread count while it's on screen,
// and clear the unread badge as soon as it's opened/viewed.
watch(
  activeRouteConversationId,
  (id) => {
    store.conversationOpen = id;
    if (id) {
      const idx = store.conversations.findIndex((c) => c.id === id);
      if (idx !== -1) store.conversations[idx].unread = 0;
    }
  },
  { immediate: true },
);

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

// (event) delete all selected messages
const handleDeleteSelected = async () => {
  if (!activeConversation.value) return;
  const ids = [...selectedMessages.value];
  const convId = activeConversation.value.id;
  for (const id of ids) {
    await deleteMessage(id, convId);
  }
  handleCloseSelect();
};

const openSearch = ref(false);
const openInfo = ref(false);
const openVoiceCall = ref(false);

// Reset all local UI state when switching conversations
watch(activeRouteConversationId, () => {
  selectMode.value = false;
  selectAll.value = false;
  selectedMessages.value = [];
  openSearch.value = false;
  openInfo.value = false;
  openVoiceCall.value = false;
});

const callContact = computed(() => getOddContact(activeConversation.value));

// (event) close the voice call modal and minimize the call
const handleCloseVoiceCallModal = (endCall: boolean) => {
  if (endCall) {
    store.activeCall = undefined;
    store.callMinimized = false;
  }
  if (store.openVoiceCall) {
    store.openVoiceCall = false;
    store.callMinimized = true;
  }
};
</script>

<template>
  <Spinner v-if="store.status === 'loading' || store.delayLoading" />

  <div
    v-else-if="route.params.id && activeConversation"
    class="h-full flex flex-row scrollbar-hidden"
  >
    <!--chat column-->
    <div class="flex-1 min-w-0 flex flex-col h-full relative">
      <!--chat header banner-->
      <div
        class="w-full min-h-21 px-5 py-5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 transition-colors duration-500"
      >
        <SelectSection
          v-if="selectMode"
          :select-mode="selectMode"
          :select-all="selectAll"
          :selected-count="selectedMessages.length"
          :handle-close-select="handleCloseSelect"
          :handle-select-all="handleSelectAll"
          :handle-deselect-all="handleDeselectAll"
          :handle-delete-selected="handleDeleteSelected"
        />
        <ConversationInfoSection
          v-else
          :handle-open-info="() => (openInfo = true)"
          :handle-open-search="() => (openSearch = true)"
          :handle-open-voice-call="() => (openVoiceCall = true)"
          :handle-open-edit-mode="() => (selectMode = true)"
        />
      </div>

      <!--pinned message-->
      <div
        v-if="activeConversation"
        class="relative transition-[padding] duration-200"
        :class="{
          'pb-15': activeConversation.pinnedMessage && !activeConversation.pinnedMessageHidden,
        }"
      >
        <PinnedMessage />
      </div>

      <ChatMiddle
        :selected-messages="selectedMessages"
        :select-mode="selectMode"
        :handle-select-message="handleSelectMessage"
        :handle-deselect-message="handleDeselectMessage"
      />
      <ChatBottom />
    </div>
  </div>

  <NoChatSelected v-else />

  <!--outgoing voice call-->
  <OutgoingCallModal
    :open="openVoiceCall"
    :contact="callContact"
    :close-modal="() => (openVoiceCall = false)"
  />

  <!--modals-->
  <SearchModal
    v-if="activeConversation"
    :open="openSearch"
    :close-modal="() => (openSearch = false)"
    :conversation="activeConversation"
  />
  <ConversationInfoModal
    v-if="activeConversation"
    :open="openInfo"
    :close-modal="() => (openInfo = false)"
    :conversation="activeConversation"
  />
  <VoiceCallModal
    :open="store.openVoiceCall"
    :close-modal="handleCloseVoiceCallModal"
  />
</template>

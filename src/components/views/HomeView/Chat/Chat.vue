<script setup lang="ts">
import type { Ref } from "vue";

import useStore from "@src/store/store";
import { computed, provide, ref, watch, watchEffect } from "vue";
import { useRoute } from "vue-router";

import { useConversationMessages } from "@src/composables/useConversationMessages";
import { useTypingIndicator } from "@src/composables/useTypingIndicator";
import { getOddContact } from "@src/utils";

import NoChatSelected from "@src/components/states/empty-states/NoChatSelected.vue";
import Spinner from "@src/components/states/loading-states/Spinner.vue";
import ChatBottom from "@src/components/views/HomeView/Chat/ChatBottom/ChatBottom.vue";
import ChatMiddle from "@src/components/views/HomeView/Chat/ChatMiddle/ChatMiddle.vue";
import PinnedMessage from "@src/components/views/HomeView/Chat/ChatTop/PinnedMessage.vue";
import SelectSection from "@src/components/views/HomeView/Chat/ChatTop/SelectSection.vue";
import ConversationInfoModal from "@src/components/shared/modals/ConversationInfoModal/ConversationInfoModal.vue";
import OutgoingCallModal from "@src/components/shared/modals/OutgoingCallModal/OutgoingCallModal.vue";
import SearchModal from "@src/components/shared/modals/SearchModal/SearchModal.vue";
import VoiceCallModal from "@src/components/shared/modals/VoiceCallModal/VoiceCallModal.vue";
import ContactPanel from "@src/components/views/HomeView/Chat/ContactPanel/ContactPanel.vue";

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
      <!--select mode toolbar — only shown when selecting messages-->
      <Transition
        enter-active-class="transition-all duration-150 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="selectMode"
          class="w-full px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0"
        >
          <SelectSection
            :select-mode="selectMode"
            :select-all="selectAll"
            :handle-close-select="handleCloseSelect"
            :handle-select-all="handleSelectAll"
            :handle-deselect-all="handleDeselectAll"
          />
        </div>
      </Transition>

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
        :handle-select-message="handleSelectMessage"
        :handle-deselect-message="handleDeselectMessage"
      />
      <ChatBottom />
    </div>

    <!--contact info panel-->
    <ContactPanel
      :handle-open-search="() => (openSearch = true)"
      :handle-open-info="() => (openInfo = true)"
      :handle-open-voice-call="() => (openVoiceCall = true)"
    />
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

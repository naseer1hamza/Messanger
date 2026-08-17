<script setup lang="ts">
import type { IConversation, IMessage } from "@src/types";
import type { Ref } from "vue";

import { computed, inject, nextTick, onMounted, ref, watch } from "vue";

import useStore from "@src/store/store";

import Message from "@src/components/views/HomeView/Chat/ChatMiddle/Message/Message.vue";
import TimelineDivider from "@src/components/views/HomeView/Chat/ChatMiddle/TimelineDivider.vue";

const props = defineProps<{
  handleSelectMessage: (messageId: string) => void;
  handleDeselectMessage: (messageId: string) => void;
  selectedMessages: string[];
  selectMode: boolean;
}>();

const store = useStore();

const container: Ref<HTMLElement | null> = ref(null);

// activeConversation is provided as a real Ref from Chat.vue — script-side
// access needs `.value` (templates auto-unwrap refs, script does not).
const activeConversation = inject<Ref<IConversation | undefined>>("activeConversation");
const typingUsers = inject<Ref<Map<string, string>>>("typingUsers", ref(new Map()));

const typingLabel = computed(() => {
  const names = Array.from(typingUsers.value.values());
  if (names.length === 0) return "";
  if (names.length === 1) return `typing`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
  return "Several people are typing";
});

// checks whether the previous message was sent by the same user.
const isFollowUp = (index: number, previousIndex: number): boolean => {
  const messages = activeConversation?.value?.messages;
  if (!messages || previousIndex < 0) {
    return false;
  } else {
    let previousSender = messages[previousIndex].sender.id;
    let currentSender = messages[index].sender.id;
    return previousSender === currentSender;
  }
};

// checks whether the message is sent by the authenticated user.
const isSelf = (message: IMessage): boolean => {
  return Boolean(store.authUser && message.sender.id === store.authUser.id);
};

// checks wether the new message has been sent in a new day or not.
const renderDivider = (index: number, previousIndex: number): boolean => {
  if (index === 3) {
    return true;
  } else {
    return false;
  }
};

const scrollToBottom = () => {
  const el = container.value as HTMLElement | null;
  if (el) el.scrollTop = el.scrollHeight;
};

onMounted(scrollToBottom);

watch(typingUsers, scrollToBottom);

// scroll to the bottom whenever a new message arrives (or the conversation
// switches), after the DOM has updated with the new message.
const lastMessageId = computed(() => {
  const messages = activeConversation?.value?.messages;
  return messages && messages.length > 0
    ? messages[messages.length - 1].id
    : undefined;
});

watch(lastMessageId, async () => {
  await nextTick();
  scrollToBottom();
});
</script>

<template>
  <div
    ref="container"
    class="grow px-5 py-5 flex flex-col overflow-y-scroll scrollbar-hidden"
  >
    <div
      v-if="store.status !== 'loading' && activeConversation?.messages"
      v-for="(message, index) in activeConversation.messages"
      :key="index"
    >
      <TimelineDivider v-if="renderDivider(index, index - 1)" />

      <Message
        :message="message"
        :self="isSelf(message)"
        :follow-up="isFollowUp(index, index - 1)"
        :divider="renderDivider(index, index - 1)"
        :selected="props.selectedMessages.includes(message.id)"
        :select-mode="props.selectMode"
        :handle-select-message="handleSelectMessage"
        :handle-deselect-message="handleDeselectMessage"
      />
    </div>
    <!--typing indicator-->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div v-if="typingUsers.size > 0" class="flex items-end gap-2 mt-1 mb-1">
        <!--bubble-->
        <div
          class="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white dark:bg-gray-700 shadow-sm max-w-[7rem]"
        >
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]"></span>
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]"></span>
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]"></span>
        </div>
        <p class="text-xs text-black/40 dark:text-white/40 mb-1">{{ typingLabel }}</p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type {
  IConversation,
  IMessage,
  IPreviewData,
  IRecording,
} from "@src/types";
import type { Ref } from "vue";

import linkifyStr from "linkify-string";
import { inject, ref } from "vue";

import { getFullName, getMessageById } from "@src/utils";

import Attachments from "@src/components/views/HomeView/Chat/ChatMiddle/Message/Attachments.vue";
import LinkPreview from "@src/components/views/HomeView/Chat/ChatMiddle/Message/LinkPreview.vue";
import MessageContextMenu from "@src/components/views/HomeView/Chat/ChatMiddle/Message/MessageContextMenu.vue";
import Receipt from "@src/components/views/HomeView/Chat/ChatMiddle/Message/Receipt.vue";
import Recording from "@src/components/views/HomeView/Chat/ChatMiddle/Message/Recording.vue";
import MessagePreview from "@src/components/views/HomeView/Chat/MessagePreview.vue";

const props = defineProps<{
  message: IMessage;
  followUp: boolean;
  self: boolean;
  divider?: boolean;
  selected?: boolean;
  selectMode: boolean;
  handleSelectMessage: (messageId: string) => void;
  handleDeselectMessage: (messageId: string) => void;
}>();

const activeConversation = <IConversation>inject("activeConversation");

const showContextMenu = ref(false);

const contextMenuCoordinations: Ref<{ x: number; y: number }> = ref({
  x: 0,
  y: 0,
});

const handleShowContextMenu = (event: any) => {
  if (props.selectMode) return;
  showContextMenu.value = true;
  contextMenuCoordinations.value = {
    x:
      window.innerWidth - 220 <= event.pageX
        ? window.innerWidth - 250
        : event.pageX,
    y:
      window.innerHeight - 300 <= event.pageY
        ? window.innerHeight - 250
        : event.pageY,
  };
};

const handleCloseContextMenu = () => {
  showContextMenu.value = false;
};

const contextConfig = {
  handler: handleCloseContextMenu,
  events: ["contextmenu"],
};

// toggle selection when in select mode
const handleToggleSelect = () => {
  if (!props.selectMode) return;
  if (props.selected) {
    props.handleDeselectMessage(props.message.id);
  } else {
    props.handleSelectMessage(props.message.id);
  }
};

const hideAvatar = () => {
  if (props.divider && !props.self) {
    return false;
  } else {
    if (props.followUp) {
      return true;
    }
    if (props.self) {
      return true;
    }
  }
};

const replyMessage = getMessageById(activeConversation, props.message.replyTo);
</script>

<template>
  <div class="select-none">
    <div
      class="xs:mb-6 md:mb-5 flex items-center"
      :class="[
        props.self ? 'justify-end' : 'justify-start',
        props.selectMode ? 'cursor-pointer' : '',
      ]"
      @click="handleToggleSelect"
    >
      <!--checkbox — left side for others, right side for self-->
      <div
        v-if="selectMode"
        class="flex-shrink-0 flex items-center justify-center w-6 h-6 mx-3"
        :class="props.self ? 'order-last ml-2' : 'order-first mr-2'"
      >
        <div
          class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
          :class="
            props.selected
              ? 'bg-indigo-500 border-indigo-500'
              : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-500'
          "
        >
          <svg
            v-if="props.selected"
            class="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="3"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <!--avatar-->
      <div
        v-if="!selectMode"
        class="mr-4"
        :class="{ 'ml-[2.25rem]': props.followUp && !divider }"
      >
        <div
          v-if="!hideAvatar()"
          :aria-label="getFullName(props.message.sender)"
          class="outline-none"
        >
          <div
            :style="{ backgroundImage: `url(${props.message.sender.avatar})` }"
            class="w-[2.25rem] h-[2.25rem] bg-cover bg-center rounded-full"
          ></div>
        </div>
      </div>

      <div class="flex items-end">
        <!--bubble-->
        <div
          @click.stop="selectMode ? handleToggleSelect() : handleCloseContextMenu()"
          v-click-outside="contextConfig"
          @contextmenu.prevent="handleShowContextMenu"
          class="max-w-125 p-5 rounded-b-xl transition duration-500"
          :class="{
            'rounded-tl-xl ml-4 order-2 bg-indigo-50 dark:bg-gray-600':
              props.self && !props.selected,

            'rounded-tr-xl mr-4 bg-gray-50 dark:bg-gray-600':
              !props.self && !props.selected,

            'rounded-tl-xl ml-4 order-2 bg-indigo-200 dark:bg-indigo-500':
              props.self && props.selected,

            'rounded-tr-xl mr-4 bg-indigo-200 dark:bg-indigo-500':
              !props.self && props.selected,
          }"
        >
          <!--reply to-->
          <MessagePreview
            v-if="replyMessage"
            :message="replyMessage"
            :self="props.self"
            class="mb-5 px-3"
          />

          <!--content-->
          <p
            v-if="props.message.content && props.message.type !== 'recording'"
            class="body-2 outline-none text-black opacity-60 dark:text-white dark:opacity-70"
            v-html="
              linkifyStr(props.message.content as string, {
                className: props.self
                  ? 'text-black opacity-50'
                  : 'text-indigo-500 dark:text-indigo-300',
                format: {
                  url: (value) =>
                    value.length > 50 ? value.slice(0, 50) + `…` : value,
                },
              })
            "
            tabindex="0"
          ></p>

          <!--recording-->
          <div
            v-else-if="
              props.message.content && props.message.type === 'recording'
            "
          >
            <Recording
              :recording="<IRecording>props.message.content"
              :self="props.self"
            />
          </div>

          <!--attachments-->
          <Attachments
            v-if="(props.message.attachments as [])?.length > 0"
            :message="props.message"
            :self="props.self"
          />

          <!--link preview-->
          <LinkPreview
            v-if="props.message.previewData && !props.message.attachments"
            :self="props.self"
            :preview-data="props.message.previewData as IPreviewData"
            class="mt-5"
          />
        </div>

        <!--date-->
        <div v-if="!selectMode" :class="props.self ? ['ml-4', 'order-1'] : ['mr-4']">
          <p class="body-1 text-black/70 dark:text-white/70 whitespace-pre">
            {{ props.message.date }}
          </p>
        </div>

        <!--read receipt-->
        <Receipt v-if="props.self && !selectMode" :state="props.message.state" />
      </div>
    </div>

    <MessageContextMenu
      v-if="!selectMode"
      :selected="props.selected"
      :message="props.message"
      :show="showContextMenu"
      :left="contextMenuCoordinations.x"
      :top="contextMenuCoordinations.y"
      :self="props.self"
      :handle-close-context-menu="handleCloseContextMenu"
      :handle-select-message="handleSelectMessage"
      :handle-deselect-message="handleDeselectMessage"
    />
  </div>
</template>

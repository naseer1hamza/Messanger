<script setup lang="ts">
import type { Ref } from "vue";
import type { IAttachment, IConversation } from "@src/types";

import { computed, inject, onMounted, onUnmounted, ref, watch } from "vue";

import { hasAttachments } from "@src/utils";
import { useFocusTrap } from "@vueuse/integrations/useFocusTrap";
import VideoPlayer from "@src/components/ui/data-display/VideoPlayer.vue";
import IconButton from "@src/components/ui/inputs/IconButton.vue";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
} from "@heroicons/vue/24/outline";

const props = defineProps<{
  open: boolean;
  startingId?: string | number;
  closeCarousel: () => void;
}>();

const carousel: Ref<HTMLElement | undefined> = ref();

const { activate, deactivate } = useFocusTrap(carousel);

// the active conversation — provided as Ref<IConversation | undefined> by Chat.vue
const conversationRef = inject<Ref<IConversation | undefined>>("activeConversation");

// index of the current open attachment in the
const currentIndex = ref(0);

// boolean value used to tell whether we moved from the starting point or not
const moved = ref(false);

// all the attachment in the conversation or an empty array
const attachments = computed(() => {
  const conversation = conversationRef?.value;
  const result: IAttachment[] = [];

  if (conversation?.messages) {
    for (const message of conversation.messages) {
      if (message.attachments && hasAttachments(message)) {
        for (const attachment of message.attachments) {
          if (["video", "image"].includes(attachment.type)) {
            result.push(attachment);
          }
        }
      }
    }
  }

  return result;
});

// the index of the attachment we start from
const startingIndex = computed(() => {
  let startingIndex: number | undefined;

  attachments.value.forEach((value, index) => {
    if (String(value.id) === String(props.startingId)) {
      startingIndex = index;
    }
  });

  return startingIndex;
});

// the selected attachment
const selectedAttachment = computed(() => {
  return attachments.value[
    moved ? (currentIndex.value as number) : (startingIndex.value as number)
  ];
});

// the value of the css visibility property
const imageInvisibility = ref(true);

// (event) set moved to false and then close modal
const handleCloseCarousel = () => {
  moved.value = false;
  zoom.value = 1;
  props.closeCarousel();
};

// check if there is a next attachment.
const isThereANext = () => {
  let length = (attachments.value as IAttachment[])?.length;
  return length > 0 && !(currentIndex.value + 1 >= length);
};

// check if there is a previous attachment.
const isThereAPrevious = () => {
  let length = (attachments.value as IAttachment[])?.length;
  return length > 0 && !(currentIndex.value <= 0);
};

// (event) increase selectedIndex if there is a next attachment.
const handleMoveToNextItem = () => {
  if (isThereANext()) {
    zoom.value = 1;
    moved.value = true;
    (currentIndex.value as number)++;
    imageInvisibility.value = true;
  }
};

// (event) increase selectedIndex if there is a previous attachment.
const handleMoveToPreviousItem = () => {
  if (isThereAPrevious()) {
    zoom.value = 1;
    moved.value = true;
    (currentIndex.value as number)--;
    imageInvisibility.value = true;
  }
};

// when modal opens make the value of currentIndex equal to the starting index
watch(
  () => props.open,
  () => {
    currentIndex.value = startingIndex.value as number;
    // toggle focus when the modal opens
    if (props.open) {
      setTimeout(() => {
        activate();
      }, 500);
    } else {
      setTimeout(() => {
        deactivate();
      }, 200);
    }
  },
);

// image element ref
const image = ref<HTMLImageElement | null>(null);

// the scale of the image
const zoom = ref(1);
// (event) increases the scale of the image
const handleIncreaseZoom = () => {
  if (zoom.value < 2) {
    zoom.value += 0.5;
  }
};
// (event) decreases the scale of the image
const handleDecreaseZoom = () => {
  if (zoom.value > 0.5) {
    zoom.value -= 0.5;
  }
};

const imageLeft = ref(0);
const imageTop = ref(0);
const startingPositionX = ref(0);
const startingPositionY = ref(0);
// (event) add the event listener that will move the image
const handleStartMovingImage = (event: any) => {
  event.preventDefault();
  startingPositionX.value = event.clientX;
  startingPositionY.value = event.clientY;
  document.addEventListener("mousemove", handleMovingImage);
  document.addEventListener("mouseup", () => {
    document.removeEventListener("mousemove", handleMovingImage);
  });
};
// (event) move then image when the cursor starts moving
const handleMovingImage = (event: any) => {
  if (image.value) {
    // calculate the new position
    const newPositionX = startingPositionX.value - event.clientX;
    const newPositionY = startingPositionY.value - event.clientY;
    // with each move we also want to update the start X and Y
    startingPositionX.value = event.clientX;
    startingPositionY.value = event.clientY;
    // set the element's new position:
    imageTop.value = image.value.offsetTop - newPositionY;
    imageLeft.value = image.value.offsetLeft - newPositionX;
  }
};

// (event) runs when a new image loads
const handleImageLoad = (event: any) => {
  if (event.target) {
    setTimeout(() => {
      // make the image visible
      imageInvisibility.value = false;
    }, 200);

    if (event.target.tagName === "IMG") {
      // set the default zoom and position
      imageLeft.value = window.innerWidth / 2 - event.target.offsetWidth / 2;
      imageTop.value = window.innerHeight / 2 - event.target.offsetHeight / 2;
    }
  }
};

// (event) closes carousel on escape and changes images when pressing the arrow keys
const handleKeyboardEvents = (event: KeyboardEvent) => {
  if (["Escape", "Esc"].includes(event.key)) {
    handleCloseCarousel();
  } else if (event.key === "ArrowLeft") {
    handleMoveToPreviousItem();
  } else if (event.key === "ArrowRight") {
    handleMoveToNextItem();
  } else if (event.key === "+") {
    handleIncreaseZoom();
  } else if (event.key === "-") {
    handleDecreaseZoom();
  }
};

// reset the currentIndex and listen to keyboard events
onMounted(() => {
  currentIndex.value = startingIndex.value as number;
  document.addEventListener("keydown", handleKeyboardEvents);
});

// stop listening to keyboard events
onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyboardEvents);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" aria-label="media carousel" role="dialog" aria-modal="true">
      <!--dark overlay — clicking closes the viewer-->
      <div
        class="fixed inset-0 bg-black/80 z-[200]"
        @click="handleCloseCarousel"
      ></div>

      <!--viewer content-->
      <div
        v-if="props.startingId !== undefined"
        ref="carousel"
        class="fixed inset-0 z-[201] flex flex-col"
      >
        <!--top bar with controls-->
        <div class="flex items-center justify-end gap-3 px-4 py-3 bg-black/40">
          <!--decrease zoom-->
          <button
            v-if="selectedAttachment?.type === 'image'"
            title="Zoom out"
            aria-label="Zoom out"
            class="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
            @click.stop="handleDecreaseZoom"
          >
            <MagnifyingGlassMinusIcon class="w-6 h-6" />
          </button>

          <!--increase zoom-->
          <button
            v-if="selectedAttachment?.type === 'image'"
            title="Zoom in"
            aria-label="Zoom in"
            class="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
            @click.stop="handleIncreaseZoom"
          >
            <MagnifyingGlassPlusIcon class="w-6 h-6" />
          </button>

          <!--close button-->
          <button
            title="Close"
            aria-label="Close image viewer"
            class="text-white bg-white/20 hover:bg-white/30 transition-colors p-2 rounded-full"
            @click.stop="handleCloseCarousel"
          >
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <!--image / video area-->
        <div class="relative flex-1 flex items-center justify-center overflow-hidden">
          <!--left nav-->
          <IconButton
            v-if="isThereAPrevious()"
            title="Previous"
            aria-label="Previous item"
            class="ic-btn-contained-glass absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3"
            @click.stop="handleMoveToPreviousItem"
          >
            <ChevronLeftIcon class="w-6 h-6" />
          </IconButton>

          <!--image-->
          <img
            v-if="selectedAttachment?.type === 'image'"
            :src="selectedAttachment.url"
            :key="selectedAttachment.id"
            :alt="selectedAttachment.name"
            ref="image"
            class="absolute w-auto md:max-w-175 xs:max-w-85 cursor-grab transition-[transform,opacity] duration-200"
            :class="{ 'opacity-0': imageInvisibility }"
            :style="{
              transform: `scale(${zoom})`,
              top: `${imageTop}px`,
              left: `${imageLeft}px`,
            }"
            @load="handleImageLoad"
            @mousedown.stop="handleStartMovingImage"
          />

          <!--video-->
          <VideoPlayer
            v-if="selectedAttachment?.type === 'video'"
            :id="'video-player-' + selectedAttachment.id"
            :url="selectedAttachment.url"
            :name="selectedAttachment.name"
            :thumbnail="selectedAttachment.thumbnail as string"
            :key="selectedAttachment.id"
            class="transition-[transform,opacity] duration-200"
            :class="{ 'opacity-0': imageInvisibility }"
            @videoLoad="handleImageLoad"
          />

          <!--right nav-->
          <IconButton
            v-if="isThereANext()"
            title="Next"
            aria-label="Next item"
            class="ic-btn-contained-glass absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3"
            @click.stop="handleMoveToNextItem"
          >
            <ChevronRightIcon class="w-6 h-6" />
          </IconButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

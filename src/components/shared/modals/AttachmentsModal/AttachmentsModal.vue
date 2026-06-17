<script setup lang="ts">
import type { IConversation } from "@src/types";
import type { Ref } from "vue";

import { inject, ref } from "vue";

import { PaperAirplaneIcon, PhotoIcon, XMarkIcon } from "@heroicons/vue/24/outline";
import Modal from "@src/components/ui/utils/Modal.vue";
import { sendImageMessage } from "@src/composables/useConversationMessages";

const props = defineProps<{
  open: boolean;
  closeModal: () => void;
}>();

const activeConversation = inject<Ref<IConversation | undefined>>("activeConversation");

const selectedFiles = ref<File[]>([]);
const previews = ref<string[]>([]);
const caption = ref("");
const sending = ref(false);
const sendError = ref("");
const fileInputRef = ref<HTMLInputElement | null>(null);

const openFilePicker = () => fileInputRef.value?.click();

const handleFilesSelected = (event: Event) => {
  const input = event.target as HTMLInputElement;
  addFiles(Array.from(input.files || []));
  input.value = "";
};

const addFiles = (files: File[]) => {
  for (const file of files.filter((f) => f.type.startsWith("image/"))) {
    selectedFiles.value.push(file);
    previews.value.push(URL.createObjectURL(file));
  }
};

const removeFile = (index: number) => {
  URL.revokeObjectURL(previews.value[index]);
  selectedFiles.value.splice(index, 1);
  previews.value.splice(index, 1);
};

const handleDrop = (event: DragEvent) => {
  addFiles(Array.from(event.dataTransfer?.files || []));
};

const handleClose = () => {
  previews.value.forEach((url) => URL.revokeObjectURL(url));
  selectedFiles.value = [];
  previews.value = [];
  caption.value = "";
  sendError.value = "";
  props.closeModal();
};

const handleSend = async () => {
  if (!activeConversation?.value || !selectedFiles.value.length || sending.value) return;

  sending.value = true;
  sendError.value = "";

  try {
    await sendImageMessage({
      conversationId: activeConversation.value.id,
      files: selectedFiles.value,
      caption: caption.value.trim(),
    });
    handleClose();
  } catch (e: any) {
    sendError.value = e.message || "Failed to send photos";
  } finally {
    sending.value = false;
  }
};
</script>

<template>
  <Modal :open="props.open" :close-modal="handleClose">
    <template #content>
      <div
        class="w-96 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-xl"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <!--header-->
        <div
          class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700"
        >
          <p class="font-semibold text-sm text-black/80 dark:text-white/80">
            Send Photos
          </p>
          <button
            @click="handleClose"
            class="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>

        <!--drop zone (no photos yet)-->
        <div v-if="previews.length === 0" class="p-4">
          <button
            @click="openFilePicker"
            class="w-full h-44 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors focus:outline-none"
          >
            <PhotoIcon class="w-10 h-10 text-gray-300 dark:text-gray-500" />
            <p class="text-sm text-gray-400 dark:text-gray-500">
              Click or drop photos here
            </p>
          </button>
        </div>

        <!--preview grid-->
        <div v-else class="p-4">
          <div class="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-0.5">
            <div
              v-for="(preview, index) in previews"
              :key="index"
              class="relative aspect-square rounded-lg overflow-hidden group"
            >
              <img
                :src="preview"
                :alt="`Photo ${index + 1}`"
                class="w-full h-full object-cover"
              />
              <!--remove button-->
              <button
                @click="removeFile(index)"
                class="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
              >
                <XMarkIcon class="w-3 h-3" />
              </button>
            </div>

            <!--add more cell-->
            <button
              @click="openFilePicker"
              class="aspect-square rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center gap-1 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors focus:outline-none"
            >
              <PhotoIcon class="w-6 h-6 text-gray-300 dark:text-gray-500" />
              <span class="text-xs text-gray-400 dark:text-gray-500">Add</span>
            </button>
          </div>
        </div>

        <!--caption-->
        <div class="px-4 pb-3">
          <input
            v-model="caption"
            type="text"
            placeholder="Add a caption…"
            class="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-700 text-black/70 dark:text-white/70 placeholder-gray-400 dark:placeholder-gray-500 border-0 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 transition"
          />
        </div>

        <!--error-->
        <div v-if="sendError" class="px-4 pb-2">
          <p class="text-xs text-red-500 dark:text-red-400">{{ sendError }}</p>
        </div>

        <!--actions-->
        <div
          class="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-700"
        >
          <button
            @click="handleClose"
            class="px-4 py-2 text-sm rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
          >
            Cancel
          </button>
          <button
            @click="handleSend"
            :disabled="!selectedFiles.length || sending"
            class="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:pointer-events-none transition-colors focus:outline-none"
          >
            <PaperAirplaneIcon class="w-4 h-4" />
            {{ sending ? "Sending…" : `Send ${selectedFiles.length ? `(${selectedFiles.length})` : ""}` }}
          </button>
        </div>

        <!--hidden file input-->
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          multiple
          hidden
          @change="handleFilesSelected"
        />
      </div>
    </template>
  </Modal>
</template>

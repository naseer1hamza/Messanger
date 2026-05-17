<script setup lang="ts">
import { ref } from "vue";
import type { IAttachment } from "@src/types";

import Attachment from "@src/components/shared/modals/AttachmentsModal/Attachment.vue";
import Button from "@src/components/ui/inputs/Button.vue";
import LabeledTextInput from "@src/components/ui/inputs/LabeledTextInput.vue";
import Modal from "@src/components/ui/utils/Modal.vue";
import ScrollBox from "@src/components/ui/utils/ScrollBox.vue";

const props = defineProps<{
  open: boolean;
  closeModal: () => void;
}>();

// Mock attachments for now - in real app, these would come from file picker
const attachments = ref<IAttachment[]>([]);

</script>

<template>
  <Modal :open="props.open" :close-modal="props.closeModal">
    <template v-slot:content>
      <div class="w-100 bg-white dark:bg-gray-800 rounded py-6">
        <!--attachments list-->
        <ScrollBox class="max-h-35 overflow-y-scroll">
          <div v-if="attachments.length === 0" class="px-5 py-8 text-center">
            <p class="body-2 text-black/70 dark:text-white/70">
              No attachments selected. Click "Add" to select files.
            </p>
          </div>
          <Attachment
            v-else
            v-for="(attachment, index) in attachments"
            :attachment="attachment"
            :key="index"
          />
        </ScrollBox>

        <!--Caption input-->
        <div class="px-5 py-6">
          <LabeledTextInput placeholder="Caption" type="text" />
        </div>

        <!--Action buttons-->
        <div class="flex w-full px-5">
          <div class="grow flex justify-start">
            <Button class="ghost-primary ghost-text"> Add </Button>
          </div>

          <Button
            class="ghost-primary ghost-text mr-4"
            @click="props.closeModal"
          >
            Cancel
          </Button>

          <Button class="contained-primary contained-text"> Send </Button>
        </div>
      </div>
    </template>
  </Modal>
</template>

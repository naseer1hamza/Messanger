<script setup lang="ts">
import Button from "@src/components/ui/inputs/Button.vue";
import Checkbox from "@src/components/ui/inputs/Checkbox.vue";

const props = defineProps<{
  selectMode: boolean;
  selectAll: boolean;
  selectedCount: number;
  handleCloseSelect: () => void;
  handleDeselectAll: () => void;
  handleSelectAll: () => void;
  handleDeleteSelected: () => void;
}>();

const handleCheck = () => {
  if (props.selectAll) {
    props.handleDeselectAll();
  } else {
    props.handleSelectAll();
  }
};
</script>

<template>
  <div v-if="props.selectMode" class="w-full flex justify-between items-center">
    <div class="flex items-center">
      <Checkbox
        input-id="select-all"
        :value="props.selectAll"
        class="mr-3"
        :handle-check="handleCheck"
      />
      <label for="select-all">
        <p class="body-2 text-black/70 dark:text-white/70">
          {{ props.selectedCount > 0 ? `${props.selectedCount} selected` : 'Select All' }}
        </p>
      </label>
    </div>
    <div class="flex items-center">
      <Button
        class="ghost-danger ghost-text mr-3"
        :disabled="props.selectedCount === 0"
        @click="props.handleDeleteSelected"
      >
        Delete
      </Button>
      <Button class="ghost-primary ghost-text" @click="props.handleCloseSelect">
        Cancel
      </Button>
    </div>
  </div>
</template>

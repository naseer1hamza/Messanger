<script setup lang="ts">
import { computed } from "vue";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";

const emit = defineEmits<{ (event: "page-changed", page: number): void }>();

const props = defineProps<{
  currentPage: number;
  totalPages: number;
}>();

// builds a compact page list like [1, "...", 4, 5, 6, "...", 12]
const pages = computed<(number | "...")[]>(() => {
  const total = props.totalPages;
  const current = props.currentPage;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const result: (number | "...")[] = [1];

  if (current > 3) result.push("...");

  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page++) {
    result.push(page);
  }

  if (current < total - 2) result.push("...");

  result.push(total);

  return result;
});

const goTo = (page: number) => {
  if (page < 1 || page > props.totalPages || page === props.currentPage) return;
  emit("page-changed", page);
};
</script>

<template>
  <div v-if="totalPages > 1" class="flex items-center justify-center gap-1.5">
    <button
      type="button"
      :disabled="currentPage === 1"
      @click="goTo(currentPage - 1)"
      class="ic-btn ic-btn-ghost-gray w-8 h-8 disabled:opacity-30 disabled:pointer-events-none"
      aria-label="Previous page"
    >
      <ChevronLeftIcon class="w-4 h-4" />
    </button>

    <template v-for="(page, index) in pages" :key="`${page}-${index}`">
      <span v-if="page === '...'" class="w-8 h-8 flex items-center justify-center text-sm text-black/30 dark:text-white/30">
        …
      </span>
      <button
        v-else
        type="button"
        @click="goTo(page)"
        class="w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors duration-150"
        :class="
          page === currentPage
            ? 'bg-indigo-300 dark:bg-indigo-400 text-white font-semibold'
            : 'text-black/60 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-gray-700'
        "
      >
        {{ page }}
      </button>
    </template>

    <button
      type="button"
      :disabled="currentPage === totalPages"
      @click="goTo(currentPage + 1)"
      class="ic-btn ic-btn-ghost-gray w-8 h-8 disabled:opacity-30 disabled:pointer-events-none"
      aria-label="Next page"
    >
      <ChevronRightIcon class="w-4 h-4" />
    </button>
  </div>
</template>

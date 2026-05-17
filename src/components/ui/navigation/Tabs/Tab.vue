<script setup lang="ts">
const props = defineProps<{
  active: boolean;
  name: string;
  /** Pending count badge (e.g. friend requests). Hidden when 0 or undefined. */
  badge?: number;
}>();
</script>

<template>
  <button
    class="p-4 flex-auto rounded-sm outline-none focus:outline-none transition-all duration-200"
    :class="
      props.active
        ? ['bg-indigo-300', 'text-white']
        : ['text-black', 'opacity-60', 'dark:text-white', 'dark:opacity-70']
    "
  >
    <p class="body-5 inline-flex items-center justify-center gap-2">
      <span>{{ props.name }}</span>
      <span
        v-if="props.badge !== undefined && props.badge > 0"
        class="min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-[0.65rem] font-semibold leading-none tabular-nums"
        :class="
          props.active
            ? 'bg-white/25 text-white'
            : 'bg-indigo-500 text-white dark:bg-indigo-400'
        "
        aria-hidden="true"
      >
        {{ props.badge > 99 ? "99+" : props.badge }}
      </span>
    </p>
  </button>
</template>

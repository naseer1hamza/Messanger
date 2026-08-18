<script setup lang="ts">
import { computed } from "vue";

import { getAvatarColor, getInitials } from "@src/utils";

const props = defineProps<{
  src?: string | null;
  name?: string | null;
  /** tailwind size classes for the avatar circle, e.g. "w-9 h-9" */
  sizeClass?: string;
  /** tailwind text size class for the fallback initials, e.g. "text-sm" */
  textClass?: string;
}>();

const initials = computed(() => getInitials(props.name));
const bgColor = computed(() => getAvatarColor(props.name));
</script>

<template>
  <div
    class="shrink-0 rounded-full bg-cover bg-center flex items-center justify-center overflow-hidden"
    :class="props.sizeClass || 'w-7 h-7'"
    :style="
      props.src
        ? { backgroundImage: `url(${props.src})` }
        : { backgroundColor: bgColor }
    "
  >
    <span
      v-if="!props.src"
      class="text-white font-semibold leading-none select-none"
      :class="props.textClass || 'text-xs'"
    >
      {{ initials }}
    </span>
  </div>
</template>

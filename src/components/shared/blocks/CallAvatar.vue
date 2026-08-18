<script setup lang="ts">
import type { IContact } from "@src/types";

import { getFullName } from "@src/utils";

import Avatar from "@src/components/shared/blocks/Avatar.vue";

const props = defineProps<{
  member: IContact;
  index: number;
  membersLength: number;
  large?: Boolean;
}>();
</script>

<template>
  <Avatar
    v-if="index === 0"
    :src="member.avatar"
    :name="getFullName(member)"
    :size-class="props.large ? 'w-25 h-25' : 'w-7 h-7'"
    :text-class="props.large ? 'text-2xl' : 'text-xs'"
  />

  <Avatar
    v-else-if="props.membersLength === 2 && index === 1"
    :src="member.avatar"
    :name="getFullName(member)"
    class="absolute top-0 left-[1.25rem]"
    :size-class="props.large ? 'w-25 h-25' : 'w-7 h-7'"
    :text-class="props.large ? 'text-2xl' : 'text-xs'"
  />

  <div
    v-else-if="props.membersLength > 2 && index === 1"
    class="absolute top-0 left-[1.25rem] flex justify-center items-center rounded-full bg-gray-50 dark:bg-gray-700"
    :class="props.large ? ['w-25', 'h-25'] : ['w-7', 'h-7']"
  >
    <p class="body-4 text-black/70 dark:text-white/70">{{ props.membersLength - 1 }}+</p>
  </div>
</template>

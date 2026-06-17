<script setup lang="ts">
import type { IConversation } from "@src/types";
import type { Ref } from "vue";

import { computed, inject, ref, watch } from "vue";

import { supabase } from "@src/lib/supabase";
import { formatLastSeen, getAvatar, getFullName, getOddContact } from "@src/utils";

import { MagnifyingGlassIcon, PhoneIcon, VideoCameraIcon } from "@heroicons/vue/24/outline";
import IconButton from "@src/components/ui/inputs/IconButton.vue";

defineProps<{
  handleOpenSearch: () => void;
  handleOpenInfo: () => void;
  handleOpenVoiceCall: () => void;
}>();

const activeConversation = inject<Ref<IConversation | undefined>>("activeConversation");

const contact = computed(() => getOddContact(activeConversation?.value));
const avatarUrl = computed(() => getAvatar(activeConversation?.value) || "");
const displayName = computed(() =>
  contact.value ? getFullName(contact.value) : "",
);
const username = computed(() => contact.value?.username);
const lastSeenText = computed(() => formatLastSeen(contact.value?.lastSeen));

// Bio is fetched fresh from the DB so it always reflects the contact's latest profile
const liveBio = ref<string>("");

watch(
  () => contact.value?.id,
  async (id) => {
    liveBio.value = "";
    if (!id) return;
    const { data } = await supabase
      .from("profiles")
      .select("bio")
      .eq("id", id)
      .single();
    liveBio.value = data?.bio || "";
  },
  { immediate: true },
);

const bio = computed(() => liveBio.value || contact.value?.bio || "");
</script>

<template>
  <aside
    class="flex flex-col w-64 shrink-0 h-full border-l border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-500"
  >
    <!--panel actions row-->
    <div class="flex justify-end px-4 pt-4">
      <IconButton
        title="Search messages"
        aria-label="Search messages"
        class="ic-btn-ghost-primary w-7 h-7"
        @click="handleOpenSearch"
      >
        <MagnifyingGlassIcon class="w-[1.15rem] h-[1.15rem]" />
      </IconButton>
    </div>

    <div class="flex flex-col items-center px-6 pt-4 pb-6">
      <!--avatar-->
      <div
        class="w-20 h-20 rounded-full bg-cover bg-center bg-gray-200 dark:bg-gray-600 mb-4 shadow-sm"
        :style="avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : {}"
      />

      <!--name-->
      <p class="text-base font-semibold text-black/80 dark:text-white/80 text-center leading-tight">
        {{ displayName || "—" }}
      </p>
      <p
        v-if="username"
        class="text-xs text-black/40 dark:text-white/40 mt-1"
      >
        @{{ username }}
      </p>

      <!--call buttons-->
      <div class="flex gap-3 mt-5">
        <button
          title="Voice call"
          aria-label="Start voice call"
          class="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-50 dark:bg-gray-700 text-indigo-400 hover:bg-indigo-100 dark:hover:bg-gray-600 transition-colors duration-150 focus:outline-none"
          @click="handleOpenVoiceCall"
        >
          <PhoneIcon class="w-5 h-5" />
        </button>
        <button
          title="Video call"
          aria-label="Start video call"
          class="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-50 dark:bg-gray-700 text-indigo-400 hover:bg-indigo-100 dark:hover:bg-gray-600 transition-colors duration-150 focus:outline-none"
        >
          <VideoCameraIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!--divider-->
    <div class="mx-6 border-t border-gray-100 dark:border-gray-700" />

    <!--bio-->
    <div class="px-6 pt-5">
      <p class="text-xs font-semibold uppercase tracking-wider text-black/30 dark:text-white/30 mb-2">
        About
      </p>
      <p
        v-if="bio"
        class="text-sm text-black/60 dark:text-white/60 leading-relaxed"
      >
        {{ bio }}
      </p>
      <p
        v-else
        class="text-sm text-black/30 dark:text-white/30 italic"
      >
        No bio yet.
      </p>
    </div>
  </aside>
</template>

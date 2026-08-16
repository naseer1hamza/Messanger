<script setup lang="ts">
import type { IConversation } from "@src/types";

import { computed, inject, ref, watch } from "vue";

import router from "@src/router";
import useStore from "@src/store/store";
import { supabase } from "@src/lib/supabase";
import { formatLastSeen, getAvatar, getName, getOddContact } from "@src/utils";

import {
  ChevronLeftIcon,
  EllipsisVerticalIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  PhoneIcon,
  ShareIcon,
  VideoCameraIcon,
} from "@heroicons/vue/24/outline";
import IconButton from "@src/components/ui/inputs/IconButton.vue";
import Dropdown from "@src/components/ui/navigation/Dropdown/Dropdown.vue";
import DropdownLink from "@src/components/ui/navigation/Dropdown/DropdownLink.vue";

const props = defineProps<{
  handleOpenInfo: () => void;
  handleOpenSearch: () => void;
  handleOpenVoiceCall?: () => void;
  handleOpenEditMode: () => void;
}>();

const store = useStore();

const activeConversation = <IConversation>inject("activeConversation");

const showDropdown = ref(false);

const lastSeenText = computed(() => {
  const contact = getOddContact(activeConversation);
  return contact?.lastSeen ? formatLastSeen(contact.lastSeen) : "";
});

// Bio is fetched fresh from the DB so it always reflects the contact's latest profile
const liveBio = ref<string>("");

watch(
  () => getOddContact(activeConversation)?.id,
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

const bioText = computed(
  () => liveBio.value || getOddContact(activeConversation)?.bio || "",
);

// (event) close dropdown menu when click item
const handleCloseDropdown = () => {
  showDropdown.value = false;
};

// (event) close dropdown menu when clicking outside the menu.
const handleClickOutside = (event: Event) => {
  let target = event.target as HTMLElement;
  let parentElement = target.parentElement as HTMLElement;

  if (
    target &&
    !(target.classList as Element["classList"]).contains("open-top-menu") &&
    parentElement &&
    !(parentElement.classList as Element["classList"]).contains("open-top-menu")
  ) {
    handleCloseDropdown();
  }
};

// (event) navigate to the /chat/ url
const handleCloseConversation = () => {
  router.push({ path: "/chat/" });
};

// (event) open the voice call modal and expand call
const handleOpenVoiceCallModal = () => {
  props.handleOpenVoiceCall?.();
};
</script>

<template>
  <!--conversation info-->
  <div class="w-full flex justify-center items-center">
    <div class="group mr-4 md:hidden">
      <IconButton
        class="ic-btn-ghost-primary w-7 h-7"
        @click="handleCloseConversation"
        title="close conversation"
        aria-label="close conversation"
      >
        <ChevronLeftIcon class="w-[1.25rem] h-[1.25rem]" />
      </IconButton>
    </div>

    <div v-if="store.status !== 'loading'" class="flex grow">
      <!--avatar-->
      <button
        class="mr-5 outline-none"
        @click="props.handleOpenInfo"
        aria-label="profile avatar"
      >
        <div
          :style="{
            backgroundImage: `url(${getAvatar(activeConversation)})`,
          }"
          class="w-[2.25rem] h-[2.25rem] rounded-full bg-cover bg-center"
        ></div>
      </button>

      <!--name and last seen-->
      <div class="flex flex-col">
        <p
          class="w-fit heading-2 text-black/70 dark:text-white/70 mb-2 cursor-pointer"
          @click="props.handleOpenInfo"
          tabindex="0"
        >
          {{ getName(activeConversation) }}
        </p>

        <p
          v-if="bioText"
          class="body-2 text-black/60 dark:text-white/60 font-extralight rounded-[.25rem] truncate max-w-100"
          tabindex="0"
          :aria-label="bioText"
        >
          {{ bioText }}
        </p>
        <p
          v-else-if="lastSeenText"
          class="body-2 text-black/70 dark:text-white/70 font-extralight rounded-[.25rem]"
          tabindex="0"
          :aria-label="lastSeenText"
        >
          {{ lastSeenText }}
        </p>
      </div>
    </div>

    <div class="flex items-center" :class="{ hidden: store.status === 'loading' }">
      <!--voice call button-->
      <IconButton
        title="start voice call"
        aria-label="start voice call"
        @click="handleOpenVoiceCallModal"
        class="ic-btn-ghost-primary w-7 h-7 mr-3"
      >
        <PhoneIcon
          class="w-[1.25rem] h-[1.25rem] text-gray-400 group-hover:text-indigo-300"
        />
      </IconButton>

      <!--video call button-->
      <IconButton
        title="start video call"
        aria-label="start video call"
        class="ic-btn-ghost-primary w-7 h-7 mr-3"
      >
        <VideoCameraIcon
          class="w-[1.25rem] h-[1.25rem] text-gray-400 group-hover:text-indigo-300"
        />
      </IconButton>

      <!--divider-->
      <div class="w-px h-5 bg-gray-200 dark:bg-gray-600 mr-3" />

      <!--search button-->
      <IconButton
        title="search messages"
        aria-label="search messages"
        @click="props.handleOpenSearch"
        class="ic-btn-ghost-primary w-7 h-7 mr-3"
      >
        <MagnifyingGlassIcon
          class="w-[1.25rem] h-[1.25rem] text-gray-400 group-hover:text-indigo-300"
        />
      </IconButton>

      <div class="relative">
        <!--dropdown menu button-->
        <IconButton
          id="open-conversation-menu"
          class="ic-btn-ghost-primary open-top-menu group w-7 h-7"
          @click="showDropdown = !showDropdown"
          :aria-expanded="showDropdown"
          tabindex="0"
          aria-controls="conversation-menu"
          title="toggle conversation menu"
          aria-label="toggle conversation menu"
        >
          <EllipsisVerticalIcon class="open-top-menu w-[1.25rem] h-[1.25rem]" />
        </IconButton>

        <!--dropdown menu-->
        <Dropdown
          id="conversation-menu"
          :close-dropdown="() => (showDropdown = false)"
          :show="showDropdown"
          :position="['right-0']"
          :handle-click-outside="handleClickOutside"
          aria-labelledby="open-conversation-menu"
        >
          <button
            class="dropdown-link dropdown-link-primary"
            aria-label="Select and delete messages"
            role="menuitem"
            @click="
              () => {
                handleCloseDropdown();
                props.handleOpenEditMode();
              }
            "
          >
            <PencilSquareIcon
              class="h-5 w-5 mr-3 text-black opacity-60 dark:text-white dark:opacity-70"
            />
            Edit Messages
          </button>
          <button
            class="dropdown-link dropdown-link-primary"
            aria-label="Show profile information"
            role="menuitem"
            @click="
              () => {
                handleCloseDropdown();
                props.handleOpenInfo();
              }
            "
          >
            <InformationCircleIcon
              class="h-5 w-5 mr-3 text-black opacity-60 dark:text-white dark:opacity-70"
            />
            Profile Information
          </button>
          <button
            class="dropdown-link dropdown-link-primary"
            aria-label="start a voice call with this contact"
            role="menuitem"
            @click="
              () => {
                handleCloseDropdown();
                handleOpenVoiceCallModal();
              }
            "
          >
            <PhoneIcon
              class="h-5 w-5 mr-3 text-black opacity-60 dark:text-white dark:opacity-70"
            />
            Voice call
          </button>
          <button
            class="dropdown-link dropdown-link-primary"
            aria-label="share this contact"
            role="menuitem"
            @click="handleCloseDropdown"
          >
            <ShareIcon
              class="h-5 w-5 mr-3 text-black opacity-60 dark:text-white dark:opacity-70"
            />
            Shared media
          </button>
          <button
            class="dropdown-link dropdown-link-danger"
            aria-label="block this contact"
            role="menuitem"
            @click="handleCloseDropdown"
          >
            <NoSymbolIcon class="h-5 w-5 mr-3" />
            Block contact
          </button>
        </Dropdown>
      </div>
    </div>
  </div>
</template>

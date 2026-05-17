<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import useStore from "@src/store/store";
import { supabase } from "@src/lib/supabase";

import {
  ArrowLeftOnRectangleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from "@heroicons/vue/24/outline";
import Dropdown from "@src/components/ui/navigation/Dropdown/Dropdown.vue";
import DropdownLink from "@src/components/ui/navigation/Dropdown/DropdownLink.vue";
import { RouterLink } from "vue-router";

const props = defineProps<{
  showDropdown: boolean;
  handleCloseDropdown: () => void;
  handleShowDropdown: () => void;
  id: string;
}>();

const store = useStore();
const router = useRouter();

// Load user avatar on mount
onMounted(async () => {
  if (store.authUser && !store.profileData.avatar_url) {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", store.authUser.id)
      .single();

    if (data?.avatar_url) {
      store.profileData.avatar_url = data.avatar_url;
    }
  }
});

const avatarUrl = computed(() => {
  return store.profileData.avatar_url || store.user?.avatar || "";
});

// (event) close dropdown menu when clicking outside
const handleCloseOnClickOutside = (event: Event) => {
  if (
    !["user-avatar", "profile-menu-button"].includes(
      (event.target as HTMLButtonElement).id,
    )
  ) {
    props.handleCloseDropdown();
  }
};

// Handle logout
const handleLogout = async () => {
  props.handleCloseDropdown();
  await supabase.auth.signOut();
  router.push("/access/sign-in/");
};
</script>

<template>
  <div class="relative">
    <!--toggle dropdown button-->
    <button
      :id="props.id + '-button'"
      @click="handleShowDropdown"
      class="bg-white rounded-full active:scale-110 focus:outline-none focus:scale-110 transition duration-200 ease-out"
      :style="{
        'box-shadow': !store.settings.darkMode
          ? '0 .125rem .3125rem rgba(193, 202, 255, 0.5),.125rem 0 .3125rem rgba(193, 202, 255, 0.5),-0.125rem 0 .3125rem rgba(193, 202, 255, 0.5),0 -0.125rem .3125rem rgba(193, 202, 255, 0.5)'
          : '0 .125rem .3125rem rgba(0, 70, 128, 0.5),.125rem 0 .3125rem rgba(0, 70, 128, 0.5),-0.125rem 0 .3125rem rgba(0, 70, 128, 0.5),0 -0.125rem .3125rem rgba(0, 70, 128, 0.5)',
      }"
      :aria-expanded="showDropdown"
      aria-controls="profile-menu"
      aria-label="toggle profile menu"
    >
      <div
        id="user-avatar"
        :style="{ backgroundImage: `url(${avatarUrl})` }"
        class="w-7 h-7 rounded-full bg-cover bg-center bg-gray-200 dark:bg-gray-700"
      ></div>
    </button>

    <!--dropdown menu-->
    <Dropdown
      :id="props.id + '-dropdown'"
      :aria-labelledby="props.id + '-button'"
      :show="props.showDropdown"
      :position="[
        'md:bottom-0',
        'md:left-8',
        'md:top-auto',
        'bottom-12.5',
        'left-[-4.8125rem]',
      ]"
      :handle-click-outside="handleCloseOnClickOutside"
      :close-dropdown="props.handleCloseDropdown"
    >
      <button
        class="dropdown-link dropdown-link-primary"
        aria-label="Show profile information"
        role="menuitem"
        @click="props.handleCloseDropdown"
      >
        <InformationCircleIcon
          class="h-5 w-5 mr-3 text-black opacity-60 dark:text-white dark:opacity-70"
        />
        Profile Information
      </button>

      <RouterLink
        to="/reset/"
        class="dropdown-link dropdown-link-primary"
        aria-label="change password"
        role="menuitem"
        @click="props.handleCloseDropdown"
      >
        <ArrowPathIcon
          class="h-5 w-5 mr-3 text-black opacity-60 dark:text-white dark:opacity-70"
        />
        Password Change
      </RouterLink>

      <button
        class="dropdown-link dropdown-link-danger"
        aria-label="logout"
        role="menuitem"
        @click="handleLogout"
      >
        <ArrowLeftOnRectangleIcon class="h-5 w-5 mr-3" />
        Logout
      </button>
    </Dropdown>
  </div>
</template>

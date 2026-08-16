<script setup lang="ts">
import { ref } from "vue";

import useStore from "@src/store/store";

import {
  BellIcon,
  ChatBubbleOvalLeftIcon,
  Cog6ToothIcon,
  PhoneIcon,
  UserGroupIcon,
} from "@heroicons/vue/24/outline";
import AccountDropdown from "@src/components/views/HomeView/Navigation/AccountDropdown.vue";
import Logo from "@src/components/views/HomeView/Navigation/Logo.vue";
import NavLink from "@src/components/views/HomeView/Navigation/NavLink.vue";

const store = useStore();

const showDropdown = ref(false);

// (event) change the active sidebar component when clicking on a NavLink
const handleActiveSidebarComponentChange = (value: string) => {
  store.activeSidebarComponent = value;
};
</script>

<template>
  <div class="w-11 h-full py-7 px-5 flex flex-col items-center transition-all duration-500">

    <!--logo-->
    <Logo />

    <!--main navigation-->
    <div class="grow">
      <nav aria-label="Main navigation">
        <ul>
          <!--message button-->
          <li>
            <NavLink
              :icon="ChatBubbleOvalLeftIcon"
              title="Conversations"
              @click="() => handleActiveSidebarComponentChange('messages')"
              :active="store.activeSidebarComponent === 'messages'"
            />
          </li>

          <!--voice call button-->
          <li>
            <NavLink
              :icon="PhoneIcon"
              title="Call log"
              @click="() => handleActiveSidebarComponentChange('phone')"
              :active="store.activeSidebarComponent === 'phone'"
            />
          </li>

          <!--contacts list button-->
          <li>
            <NavLink
              :icon="UserGroupIcon"
              title="Contacts"
              @click="() => handleActiveSidebarComponentChange('contacts')"
              :active="store.activeSidebarComponent === 'contacts'"
            />
          </li>

          <!--notifications button-->
          <li>
            <NavLink
              :icon="BellIcon"
              title="Notifications"
              :notifications="store.notifications.length"
              @click="() => handleActiveSidebarComponentChange('notifications')"
              :active="store.activeSidebarComponent === 'notifications'"
            />
          </li>
        </ul>
      </nav>
    </div>

    <!--secondary navigation-->
    <div>
      <nav aria-label="Extra navigation">
        <ul>
          <!--settings button-->
          <li>
            <NavLink
              :icon="Cog6ToothIcon"
              title="Settings"
              @click="() => handleActiveSidebarComponentChange('settings')"
              :active="store.activeSidebarComponent === 'settings'"
            />
          </li>
        </ul>
      </nav>

      <!--separator-->
      <hr class="mb-6 border-gray-100 dark:border-gray-600" />

      <!--user avatar-->
      <AccountDropdown
        id="profile-menu"
        aria-labelledby="profile-menu-button"
        :show-dropdown="showDropdown"
        :handle-show-dropdown="() => (showDropdown = true)"
        :handle-close-dropdown="() => (showDropdown = false)"
      />
    </div>
  </div>
</template>

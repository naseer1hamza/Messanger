<script setup lang="ts">
import { computed, inject, ref } from "vue";

import { useFriendsList } from "@src/composables/useFriendsList";
import { openDirectConversationWithContact } from "@src/lib/openDirectConversation";
import useStore from "@src/store/store";
import type { IContact } from "@src/types";
import { getFullName } from "@src/utils";

import NoContacts from "@src/components/states/empty-states/NoContacts.vue";
import Circle2Lines from "@src/components/states/loading-states/Circle2Lines.vue";
import SearchInput from "@src/components/ui/inputs/SearchInput.vue";
import ContactItem from "@src/components/shared/blocks/ContactItem.vue";
import ScrollBox from "@src/components/ui/utils/ScrollBox.vue";

const store = useStore();
const closeComposeModal = inject<() => void>("closeComposeModal", () => {});

const { friends, loading, loadError, loadFriends } = useFriendsList();

const searchQuery = ref("");
const opening = ref(false);
const openError = ref("");

const listSource = computed((): IContact[] => {
  if (friends.value.length > 0) return friends.value;
  if (store.user?.contacts?.length) return store.user.contacts;
  return [];
});

const filteredContacts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return listSource.value;
  return listSource.value.filter((contact) => {
    const blob = [
      getFullName(contact).toLowerCase(),
      contact.email?.toLowerCase() ?? "",
      contact.username?.toLowerCase() ?? "",
      contact.firstName.toLowerCase(),
      contact.lastName.toLowerCase(),
    ].join(" ");
    return blob.includes(q);
  });
});

const showLoading = computed(
  () =>
    loading.value ||
    store.status === "loading" ||
    store.delayLoading,
);

const handleContactSelected = async (contact: IContact) => {
  if (opening.value) return;
  openError.value = "";
  opening.value = true;
  try {
    await openDirectConversationWithContact(contact, closeComposeModal);
  } catch (e) {
    openError.value =
      e instanceof Error ? e.message : "Could not open conversation.";
  } finally {
    opening.value = false;
  }
};
</script>

<template>
  <div class="pb-6">
    <!--search-->
    <div class="mx-5 mb-5">
      <SearchInput
        :value="searchQuery"
        @value-changed="(v: string) => (searchQuery = v)"
      />
    </div>

    <p
      v-if="loadError"
      class="mx-5 mb-3 text-sm text-red-600 dark:text-red-400"
      role="alert"
    >
      {{ loadError }}
      <button
        type="button"
        class="underline ml-1"
        @click="loadFriends"
      >
        Retry
      </button>
    </p>

    <p
      v-if="openError"
      class="mx-5 mb-3 text-sm text-red-600 dark:text-red-400"
      role="alert"
    >
      {{ openError }}
    </p>

    <!--contacts-->
    <ScrollBox class="overflow-y-scroll max-h-50">
      <Circle2Lines v-if="showLoading" v-for="item in 3" :key="item" />

      <template v-else>
        <ContactItem
          v-for="(contact, index) in filteredContacts"
          :key="contact.id + '-' + index"
          :contact="contact"
          :active="false"
          :unselectable="opening"
          @contact-selected="handleContactSelected"
        />

        <NoContacts vertical v-if="filteredContacts.length === 0" />
      </template>
    </ScrollBox>
  </div>
</template>

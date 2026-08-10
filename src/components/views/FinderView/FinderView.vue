<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { supabase } from "@src/lib/supabase";
import {
  FINDER_SELECT_FILTERS,
  NEARBY_DISTANCE_MAX,
  NEARBY_DISTANCE_MIN,
  NEARBY_DISTANCE_STEP,
} from "@src/constants/finderFilters";
import type { IFinderItem } from "@src/types";

import headerImage from "@src/assets/images/header.jpeg";

import {
  BellIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import Pagination from "@src/components/ui/navigation/Pagination.vue";

const NAV_LINKS = ["Home", "Search", "Ad Page", "Inner Pages", "Contact", "Blog"];
const PAGE_SIZE = 40;

const items = ref<IFinderItem[]>([]);
const loadingItems = ref(true);
const loadError = ref("");

const searchQuery = ref("");
const selectedFilters = ref<Record<string, string>>({});
const maxDistance = ref(NEARBY_DISTANCE_MAX);
const distanceFilterActive = computed(() => maxDistance.value < NEARBY_DISTANCE_MAX);

const currentPage = ref(1);

const activeFilterCount = computed(
  () =>
    Object.values(selectedFilters.value).filter(Boolean).length +
    (distanceFilterActive.value ? 1 : 0) +
    (searchQuery.value.trim() ? 1 : 0),
);

const filteredItems = computed(() =>
  items.value.filter((item) => {
    const query = searchQuery.value.trim().toLowerCase();
    if (query && !(item.title || "").toLowerCase().includes(query)) return false;

    const matchesSelects = FINDER_SELECT_FILTERS.every((filter) => {
      const selected = selectedFilters.value[filter.key];
      if (!selected) return true;
      return (item as any)[filter.key] === selected;
    });
    if (!matchesSelects) return false;

    if (distanceFilterActive.value) {
      // items without a distance set aren't excluded by the slider
      if (item.distanceKm === undefined) return true;
      return item.distanceKm <= maxDistance.value;
    }

    return true;
  }),
);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredItems.value.length / PAGE_SIZE)),
);

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredItems.value.slice(start, start + PAGE_SIZE);
});

// jump back to page 1 whenever the result set changes so we never land on
// an empty out-of-range page.
watch(filteredItems, () => {
  currentPage.value = 1;
});

const badgesFor = (item: IFinderItem): string[] =>
  [item.gender, item.ethnicity, item.hairColor, item.eyeColor, item.country].filter(
    (value): value is string => !!value,
  );

const handleFilterChange = (key: string, value: string) => {
  selectedFilters.value = { ...selectedFilters.value, [key]: value };
};

const clearFilters = () => {
  selectedFilters.value = {};
  maxDistance.value = NEARBY_DISTANCE_MAX;
  searchQuery.value = "";
};

const scrollContainer = ref<HTMLElement | null>(null);

const handlePageChanged = (page: number) => {
  currentPage.value = page;
  scrollContainer.value?.scrollTo({ top: 0, behavior: "smooth" });
};

const loadItems = async () => {
  loadingItems.value = true;
  loadError.value = "";

  const { data, error } = await supabase
    .from("finder_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    loadError.value = error.message;
  } else if (data) {
    items.value = (data as any[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      imageUrl: row.image_url,
      title: row.title || undefined,
      country: row.country || undefined,
      drinking: row.drinking || undefined,
      smoking: row.smoking || undefined,
      gender: row.gender || undefined,
      sexuality: row.sexuality || undefined,
      ethnicity: row.ethnicity || undefined,
      eyeColor: row.eye_color || undefined,
      hairColor: row.hair_color || undefined,
      distanceKm: row.distance_km ?? undefined,
      linkUrl: row.link_url || undefined,
      createdAt: new Date(row.created_at),
    }));
  }

  loadingItems.value = false;
};

onMounted(loadItems);
</script>

<template>
  <div ref="scrollContainer" class="w-full h-full overflow-y-auto" style="background-color: #e5e5e5">
    <!--decorative header image strip, scrolls away with the page-->
    <img :src="headerImage" alt="" class="w-full h-auto block" />

    <!--top banner-->
    <div v-if="false" class="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center gap-4">
        <p class="text-xl font-bold tracking-tight whitespace-nowrap">
          <span class="text-gray-900">Need LOGO</span><span class="text-red-500">Here</span>
        </p>

        <!--search-->
        <div class="relative flex-1 min-w-[120px] max-w-[180px]">
          <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            v-model="searchQuery"
            class="w-full h-9 pl-9 pr-3 rounded-full text-sm bg-gray-100 text-gray-700 outline-none focus:ring-2 focus:ring-red-200 transition-shadow duration-150"
          />
        </div>

        <nav class="hidden lg:flex items-center gap-5">
          <a
            v-for="link in NAV_LINKS"
            :key="link"
            href="#"
            @click.prevent
            class="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-150 whitespace-nowrap"
          >
            {{ link }}
          </a>
        </nav>

        <div class="flex items-center gap-3 ml-auto">
          <a
            href="#"
            @click.prevent
            title="Messages"
            aria-label="Messages"
            class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors duration-150"
            style="color: #555555"
          >
            <EnvelopeIcon class="w-5 h-5" />
          </a>
          <a
            href="#"
            @click.prevent
            title="Notifications"
            aria-label="Notifications"
            class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors duration-150"
            style="color: #555555"
          >
            <BellIcon class="w-5 h-5" />
          </a>
          <a
            href="#"
            @click.prevent
            title="Profile"
            aria-label="Profile"
            class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors duration-150"
            style="color: #555555"
          >
            <UserCircleIcon class="w-5 h-5" />
          </a>
          <RouterLink
            to="/chat/"
            title="Back to Messenger"
            aria-label="Back to Messenger"
            class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors duration-150"
            style="color: #555555"
          >
            <ChatBubbleLeftRightIcon class="w-5 h-5" />
          </RouterLink>
          <RouterLink
            to="/AddFinder"
            title="Add Photo"
            aria-label="Add Photo"
            class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors duration-150"
            style="color: #555555"
          >
            <PlusIcon class="w-5 h-5" />
          </RouterLink>
        </div>
      </div>
    </div>

    <!--body: filters sidebar + images-->
    <div class="max-w-7xl mx-auto px-6 py-6 flex flex-col lg:flex-row items-start gap-6">
      <!--filters sidebar-->
      <aside class="w-full lg:w-64 shrink-0">
        <p
          class="inline-block bg-white text-sm font-semibold px-4 py-2 rounded-md shadow-sm mb-4"
          style="font-family: Tahoma, sans-serif; color: #555555"
        >
          Browse
        </p>

        <div class="flex flex-col gap-3">
          <select
            v-for="filter in FINDER_SELECT_FILTERS"
            :key="filter.key"
            class="w-full h-10 px-3 pr-8 rounded-md text-sm shadow-sm outline-none focus:border-red-400 transition-colors duration-150"
            style="font-family: Tahoma, sans-serif; color: #555555; background-color: #ffffff; border: 1px solid #d5d5d5"
            :value="selectedFilters[filter.key] || ''"
            @change="handleFilterChange(filter.key, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ filter.label }}</option>
            <option v-for="option in filter.options" :key="option" :value="option">
              {{ option }}
            </option>
          </select>

          <!--nearby users distance slider-->
          <div
            class="shadow-sm rounded-md px-3 py-2.5"
            style="background-color: #ffffff; border: 1px solid #d5d5d5"
          >
            <label
              for="nearby-distance"
              class="text-xs block mb-1"
              style="font-family: Tahoma, sans-serif; color: #555555"
            >
              Nearby Users
              <span class="font-medium">
                - within {{ maxDistance }} km
              </span>
            </label>
            <input
              id="nearby-distance"
              type="range"
              class="accent-red-500 w-full"
              :min="NEARBY_DISTANCE_MIN"
              :max="NEARBY_DISTANCE_MAX"
              :step="NEARBY_DISTANCE_STEP"
              v-model.number="maxDistance"
            />
          </div>

          <button
            v-if="activeFilterCount > 0"
            type="button"
            @click="clearFilters"
            class="flex items-center justify-center gap-1 text-sm text-red-500 hover:text-red-600 py-2"
            style="font-family: Tahoma, sans-serif"
          >
            <XMarkIcon class="w-4 h-4" />
            Clear filters
          </button>
        </div>
      </aside>

      <!--images-->
      <main class="flex-1 w-full min-w-0">
        <div v-if="loadingItems" class="body-3 text-black/40 py-12 text-center">
          Loading…
        </div>

        <div v-else-if="loadError" class="body-3 text-red-600 py-12 text-center">
          {{ loadError }}
        </div>

        <div
          v-else-if="filteredItems.length === 0"
          class="body-3 text-black/40 py-12 text-center"
        >
          {{ items.length === 0 ? "Nothing has been added yet." : "No images match these filters." }}
        </div>

        <template v-else>
        <p class="body-3 text-black/40 mb-4">
          Showing {{ paginatedItems.length }} of {{ filteredItems.length }}
        </p>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <component
            :is="item.linkUrl ? 'a' : 'div'"
            v-for="item in paginatedItems"
            :key="item.id"
            :href="item.linkUrl"
            :target="item.linkUrl ? '_blank' : undefined"
            :rel="item.linkUrl ? 'noopener noreferrer' : undefined"
            class="group relative rounded-lg overflow-hidden bg-gray-50 block"
            :class="item.linkUrl ? 'cursor-pointer' : 'cursor-default'"
            style="aspect-ratio: 3 / 4"
          >
            <img
              :src="item.imageUrl"
              :alt="item.title || 'Finder image'"
              class="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-110"
              loading="lazy"
            />

            <div
              class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 flex flex-col justify-end p-3"
            >
              <p v-if="item.title" class="text-white text-sm font-semibold truncate">
                {{ item.title }}
              </p>
              <div v-if="badgesFor(item).length > 0" class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="badge in badgesFor(item)"
                  :key="badge"
                  class="px-2 py-0.5 rounded-full bg-white/20 text-white text-[.65rem]"
                >
                  {{ badge }}
                </span>
              </div>
            </div>
          </component>
        </div>

        <Pagination
          :current-page="currentPage"
          :total-pages="totalPages"
          class="mt-8"
          @page-changed="handlePageChanged"
        />
        </template>
      </main>
    </div>
  </div>
</template>

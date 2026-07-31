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

import { PlusIcon, XMarkIcon } from "@heroicons/vue/24/outline";
import Pagination from "@src/components/ui/navigation/Pagination.vue";

const NAV_LINKS = ["Home", "Search", "Ad Page", "Inner Pages", "Contact", "Blog"];
const PAGE_SIZE = 12;

const items = ref<IFinderItem[]>([]);
const loadingItems = ref(true);
const loadError = ref("");

const selectedFilters = ref<Record<string, string>>({});
const maxDistance = ref(NEARBY_DISTANCE_MAX);
const distanceFilterActive = computed(() => maxDistance.value < NEARBY_DISTANCE_MAX);

const currentPage = ref(1);

const activeFilterCount = computed(
  () =>
    Object.values(selectedFilters.value).filter(Boolean).length +
    (distanceFilterActive.value ? 1 : 0),
);

const filteredItems = computed(() =>
  items.value.filter((item) => {
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
      createdAt: new Date(row.created_at),
    }));
  }

  loadingItems.value = false;
};

onMounted(loadItems);
</script>

<template>
  <div ref="scrollContainer" class="w-full h-full overflow-y-auto bg-white dark:bg-gray-800 transition-colors duration-500">
    <!--header + filters-->
    <div class="sticky top-0 z-10 bg-black">
      <div class="max-w-6xl mx-auto px-6">
        <!--logo + nav links + app actions-->
        <div class="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-white/10">
          <p class="text-xl font-bold tracking-tight whitespace-nowrap">
            <span class="text-white">Sexy</span><span class="text-red-500">Singles</span>
          </p>

          <nav class="flex flex-wrap items-center gap-5">
            <a
              v-for="link in NAV_LINKS"
              :key="link"
              href="#"
              @click.prevent
              class="text-sm text-gray-300 hover:text-white transition-colors duration-150"
            >
              {{ link }}
            </a>
          </nav>
        </div>

        <!--filter bar-->
        <div class="flex flex-wrap items-end gap-3 py-4">
          <select
            v-for="filter in FINDER_SELECT_FILTERS"
            :key="filter.key"
            class="w-auto h-9 px-3 pr-8 rounded-sm text-sm bg-gray-800 border border-gray-700 text-gray-200 outline-none focus:border-red-500 transition-colors duration-150"
            :value="selectedFilters[filter.key] || ''"
            @change="handleFilterChange(filter.key, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ filter.label }}</option>
            <option v-for="option in filter.options" :key="option" :value="option">
              {{ option }}
            </option>
          </select>

          <!--nearby users distance slider-->
          <div class="flex flex-col justify-end min-w-[220px]">
            <label for="nearby-distance" class="text-xs text-gray-400 mb-1">
              Nearby Users
              <span class="text-gray-200 font-medium">
                — within {{ maxDistance }} km
              </span>
            </label>
            <input
              id="nearby-distance"
              type="range"
              class="accent-red-500 w-full h-9"
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
            class="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 py-2"
          >
            <XMarkIcon class="w-4 h-4" />
            Clear filters
          </button>
        </div>
      </div>
    </div>

    <!--grid-->
    <div class="max-w-6xl mx-auto px-6 py-6">
      <div v-if="loadingItems" class="body-3 text-black/40 dark:text-white/40 py-12 text-center">
        Loading…
      </div>

      <div v-else-if="loadError" class="body-3 text-red-600 dark:text-red-300 py-12 text-center">
        {{ loadError }}
      </div>

      <div
        v-else-if="filteredItems.length === 0"
        class="body-3 text-black/40 dark:text-white/40 py-12 text-center"
      >
        {{ items.length === 0 ? "Nothing has been added yet." : "No images match these filters." }}
      </div>

      <template v-else>
      <p class="body-3 text-black/40 dark:text-white/40 mb-4">
        Showing {{ paginatedItems.length }} of {{ filteredItems.length }}
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div
          v-for="item in paginatedItems"
          :key="item.id"
          class="group relative rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 cursor-pointer"
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
        </div>
      </div>

      <Pagination
        :current-page="currentPage"
        :total-pages="totalPages"
        class="mt-8"
        @page-changed="handlePageChanged"
      />
      </template>
    </div>
  </div>
</template>

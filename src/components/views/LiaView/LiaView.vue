<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { supabase } from "@src/lib/supabase";
import type { ILiaItem } from "@src/types";

import { Bars3Icon, PlusIcon, ShoppingCartIcon, XMarkIcon } from "@heroicons/vue/24/outline";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/vue/24/solid";
import Pagination from "@src/components/ui/navigation/Pagination.vue";

const ACCENT = "#a567f2";
const DEFAULT_BACKGROUND_COLOR = "#fce0c8";
const PAGE_SIZE = 12;
// minimum horizontal drag distance (px) before a swipe counts as prev/next
const SWIPE_THRESHOLD = 50;

const items = ref<ILiaItem[]>([]);
const loadingItems = ref(true);
const loadError = ref("");

const headerImageUrl = ref<string | undefined>(undefined);
const footerImageUrl = ref<string | undefined>(undefined);
const footerImage2Url = ref<string | undefined>(undefined);
const backgroundColor = ref(DEFAULT_BACKGROUND_COLOR);

const loadHeaderSettings = async () => {
  const { data } = await supabase
    .from("lia_settings")
    .select("header_image_url, background_color, footer_image_url, footer_image_2_url")
    .eq("id", 1)
    .maybeSingle();
  headerImageUrl.value = (data as any)?.header_image_url || undefined;
  footerImageUrl.value = (data as any)?.footer_image_url || undefined;
  footerImage2Url.value = (data as any)?.footer_image_2_url || undefined;
  backgroundColor.value = (data as any)?.background_color || DEFAULT_BACKGROUND_COLOR;
};

const currentPage = ref(1);

const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / PAGE_SIZE)));

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return items.value.slice(start, start + PAGE_SIZE);
});

const scrollContainer = ref<HTMLElement | null>(null);

const handlePageChanged = (page: number) => {
  currentPage.value = page;
  scrollContainer.value?.scrollTo({ top: 0, behavior: "smooth" });
};

// ---- gallery carousel: one image at a time, loops seamlessly ----
// A clone of the last item is placed before the first, and a clone of the
// first item is placed after the last. When a scroll settles on one of
// those clones, we silently (no animation) jump to the matching real
// slide, which is what makes the loop feel continuous.
const galleryTrackRef = ref<HTMLElement | null>(null);
const activeSlide = ref(0);
let scrollSettleTimer: ReturnType<typeof setTimeout> | undefined;

const gallerySlides = computed(() => {
  const list = paginatedItems.value;
  if (list.length <= 1) {
    return list.map((item, index) => ({ item, realIndex: index, slideKey: item.id }));
  }

  const first = list[0];
  const last = list[list.length - 1];
  return [
    { item: last, realIndex: list.length - 1, slideKey: `start-clone-${last.id}` },
    ...list.map((item, index) => ({ item, realIndex: index, slideKey: item.id })),
    { item: first, realIndex: 0, slideKey: `end-clone-${first.id}` },
  ];
});

// index within `gallerySlides` that the real (non-clone) slides start at
const firstRealSlideIndex = computed(() => (paginatedItems.value.length > 1 ? 1 : 0));

// distance from the start of the track's scrollable content to `child`;
// avoids relying on `offsetLeft`, which only works if `track` happens to
// be the nearest positioned ancestor.
const getSlideOffset = (track: HTMLElement, child: HTMLElement) =>
  child.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;

const scrollToSlide = (slideIndex: number, behavior: ScrollBehavior = "smooth") => {
  const track = galleryTrackRef.value;
  const child = track?.children[slideIndex] as HTMLElement | undefined;
  if (!track || !child) return;
  track.scrollTo({ left: getSlideOffset(track, child), behavior });
};

const handleGalleryScroll = () => {
  if (scrollSettleTimer) clearTimeout(scrollSettleTimer);
  scrollSettleTimer = setTimeout(handleGalleryScrollSettled, 120);
};

const handleGalleryScrollSettled = () => {
  const track = galleryTrackRef.value;
  if (!track || paginatedItems.value.length <= 1) return;

  // find whichever slide is snapped closest to the current scroll position
  let closestIndex = 0;
  let closestDistance = Infinity;
  Array.from(track.children).forEach((child, index) => {
    const distance = Math.abs(getSlideOffset(track, child as HTMLElement) - track.scrollLeft);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  const lastSlideIndex = gallerySlides.value.length - 1;

  if (closestIndex === 0) {
    // landed on the start clone -> silently jump to the real last slide
    scrollToSlide(lastSlideIndex - 1, "auto");
    activeSlide.value = paginatedItems.value.length - 1;
  } else if (closestIndex === lastSlideIndex) {
    // landed on the end clone -> silently jump to the real first slide
    scrollToSlide(firstRealSlideIndex.value, "auto");
    activeSlide.value = 0;
  } else {
    activeSlide.value = closestIndex - firstRealSlideIndex.value;
  }
};

const goToSlide = (index: number) => {
  activeSlide.value = index;
  scrollToSlide(index + firstRealSlideIndex.value);
};

watch(paginatedItems, () => {
  activeSlide.value = 0;
  nextTick(() => scrollToSlide(firstRealSlideIndex.value, "auto"));
});

// ---- lightbox ----
const activeIndex = ref<number | null>(null);
const lightboxOpen = computed(() => activeIndex.value !== null);
const activeItem = computed(() =>
  activeIndex.value !== null ? paginatedItems.value[activeIndex.value] : null,
);

const openLightbox = (index: number) => {
  activeIndex.value = index;
};

const closeLightbox = () => {
  activeIndex.value = null;
};

const showPrev = () => {
  if (activeIndex.value === null) return;
  activeIndex.value =
    (activeIndex.value - 1 + paginatedItems.value.length) % paginatedItems.value.length;
};

const showNext = () => {
  if (activeIndex.value === null) return;
  activeIndex.value = (activeIndex.value + 1) % paginatedItems.value.length;
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!lightboxOpen.value) return;
  if (event.key === "Escape") closeLightbox();
  else if (event.key === "ArrowLeft") showPrev();
  else if (event.key === "ArrowRight") showNext();
};

let touchStartX = 0;
const handleTouchStart = (event: TouchEvent) => {
  touchStartX = event.changedTouches[0].clientX;
};
const handleTouchEnd = (event: TouchEvent) => {
  const deltaX = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
  if (deltaX > 0) showPrev();
  else showNext();
};

const loadItems = async () => {
  loadingItems.value = true;
  loadError.value = "";

  const { data, error } = await supabase
    .from("lia_items")
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
      createdAt: new Date(row.created_at),
    }));
  }

  loadingItems.value = false;
};

// closing/reopening the lightbox shouldn't survive a page change
watch(currentPage, () => {
  activeIndex.value = null;
});

onMounted(async () => {
  await Promise.all([loadItems(), loadHeaderSettings()]);
  await nextTick();
  scrollToSlide(firstRealSlideIndex.value, "auto");
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  if (scrollSettleTimer) clearTimeout(scrollSettleTimer);
});
</script>

<template>
  <div
    ref="scrollContainer"
    class="w-full h-full overflow-y-auto"
    :style="{ fontFamily: 'Arimo, sans-serif', backgroundColor: backgroundColor }"
  >
    <!--header: scrolls away with the page (not sticky) so the full background photo can be seen-->
    <div
      class="relative border-b border-gray-100 overflow-hidden"
      :class="headerImageUrl ? 'min-h-[280px] sm:min-h-[320px]' : ''"
      :style="{ backgroundColor: backgroundColor }"
    >
      <img
        v-if="headerImageUrl"
        :src="headerImageUrl"
        alt=""
        class="absolute inset-0 w-full h-full object-cover"
      />
      <div v-if="headerImageUrl" class="absolute inset-0" :style="{ backgroundColor: backgroundColor, opacity: 0.75 }"></div>

      <div class="relative max-w-2xl mx-auto px-4 py-12 h-full flex flex-col items-center justify-center gap-2">
        <p
          class="text-5xl leading-none"
          :style="{ fontFamily: 'Dancing Script, cursive', color: ACCENT }"
        >
          Lia
        </p>
        <p class="text-[11px] uppercase tracking-[0.2em] color: ACCENT">Paints Girls</p>

        <div class="flex items-center gap-3 mt-2">
          <RouterLink
            to="/AddLia"
            title="Add to gallery"
            aria-label="Add to gallery"
            class="w-6 h-6 flex items-center justify-center rounded-full text-white transition-opacity duration-150 hover:opacity-90"
            :style="{ backgroundColor: ACCENT }"
          >
            <PlusIcon class="w-3.5 h-3.5" />
          </RouterLink>
          <button
            type="button"
            title="Menu"
            aria-label="Menu"
            class="w-9 h-9 flex items-center justify-center rounded-full text-white transition-opacity duration-150 hover:opacity-90"
            :style="{ backgroundColor: ACCENT }"
            @click.prevent
          >
            <Bars3Icon class="w-5 h-5" />
          </button>
          <button
            type="button"
            title="Cart"
            aria-label="Cart"
            class="w-6 h-6 flex items-center justify-center rounded-full text-white transition-opacity duration-150 hover:opacity-90"
            :style="{ backgroundColor: ACCENT }"
            @click.prevent
          >
            <ShoppingCartIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!--gallery-->
    <div class="py-6">
      <div v-if="loadingItems" class="text-sm text-black/40 py-16 text-center">Loading…</div>

      <div v-else-if="loadError" class="text-sm text-red-600 py-16 text-center">
        {{ loadError }}
      </div>

      <div v-else-if="items.length === 0" class="text-sm text-black/40 py-16 text-center">
        Nothing has been added to the gallery yet.
      </div>

      <template v-else>
        <!--one image at a time, loops seamlessly when you keep scrolling past either end-->
        <div
          ref="galleryTrackRef"
          class="hide-scrollbar flex overflow-x-auto snap-x snap-mandatory scroll-smooth max-w-2xl mx-auto"
          style="scrollbar-width: none"
          @scroll="handleGalleryScroll"
        >
          <button
            v-for="slide in gallerySlides"
            :key="slide.slideKey"
            type="button"
            class="group text-left shrink-0 w-full snap-center px-4"
            @click="openLightbox(slide.realIndex)"
          >
            <div class="rounded-md overflow-hidden bg-gray-50" style="aspect-ratio: 4 / 5">
              <img
                :src="slide.item.imageUrl"
                :alt="slide.item.title || 'Gallery image'"
                class="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <p v-if="slide.item.title" class="mt-2 text-sm font-bold text-center text-gray-700 truncate">
              {{ slide.item.title }}
            </p>
          </button>
        </div>

        <!--dot indicators-->
        <div v-if="paginatedItems.length > 1" class="flex items-center justify-center gap-1.5 mt-3">
          <button
            v-for="(item, index) in paginatedItems"
            :key="item.id"
            type="button"
            :aria-label="`Go to image ${index + 1}`"
            class="w-1.5 h-1.5 rounded-full transition-all duration-150"
            :style="{ backgroundColor: index === activeSlide ? ACCENT : '#d1d5db' }"
            @click="goToSlide(index)"
          />
        </div>

        <Pagination
          :current-page="currentPage"
          :total-pages="totalPages"
          class="mt-6 px-4 max-w-2xl mx-auto"
          @page-changed="handlePageChanged"
        />

        <!--featured video-->
        <div class="mt-10 px-4 max-w-2xl mx-auto">
          <div class="rounded-md overflow-hidden bg-gray-50" style="aspect-ratio: 16 / 9">
            <iframe
              class="w-full h-full"
              src="https://www.youtube.com/embed/e77S5x3ibo0"
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen
            ></iframe>
          </div>
        </div>

        <!--footer image-->
        <div v-if="footerImageUrl" class="mt-6 px-4 max-w-2xl mx-auto">
          <div class="rounded-md overflow-hidden bg-gray-50">
            <img :src="footerImageUrl" alt="" class="w-full h-auto object-cover" loading="lazy" />
          </div>
        </div>

        <!--second featured video-->
        <div class="mt-6 px-4 max-w-2xl mx-auto">
          <div class="rounded-md overflow-hidden bg-gray-50" style="aspect-ratio: 16 / 9">
            <iframe
              class="w-full h-full"
              src="https://www.youtube.com/embed/l5Uqa3haaQA"
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen
            ></iframe>
          </div>
        </div>

        <!--footer image 2-->
        <div v-if="footerImage2Url" class="mt-6 px-4 max-w-2xl mx-auto">
          <div class="rounded-md overflow-hidden bg-gray-50">
            <img :src="footerImage2Url" alt="" class="w-full h-auto object-cover" loading="lazy" />
          </div>
        </div>
      </template>
    </div>

    <!--lightbox-->
    <div
      v-if="lightboxOpen && activeItem"
      class="fixed inset-0 z-50 bg-black/95 flex flex-col"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <div class="flex items-center justify-between px-4 py-3 text-white/80 text-sm shrink-0">
        <span>{{ (activeIndex ?? 0) + 1 }} / {{ paginatedItems.length }}</span>
        <button
          type="button"
          class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-150"
          aria-label="Close"
          @click="closeLightbox"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <div class="relative flex-1 flex items-center justify-center min-h-0 px-2">
        <button
          v-if="paginatedItems.length > 1"
          type="button"
          class="absolute left-1 sm:left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors duration-150"
          aria-label="Previous image"
          @click="showPrev"
        >
          <ChevronLeftIcon class="w-5 h-5" />
        </button>

        <img
          :src="activeItem.imageUrl"
          :alt="activeItem.title || 'Gallery image'"
          class="max-w-full max-h-full object-contain"
        />

        <button
          v-if="paginatedItems.length > 1"
          type="button"
          class="absolute right-1 sm:right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors duration-150"
          aria-label="Next image"
          @click="showNext"
        >
          <ChevronRightIcon class="w-5 h-5" />
        </button>
      </div>

      <p v-if="activeItem.title" class="text-center text-white/80 text-sm py-3 px-4 shrink-0">
        {{ activeItem.title }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import useStore from "@src/store/store";
import { supabase } from "@src/lib/supabase";
import { FINDER_SELECT_FILTERS, FINDER_COLUMN_BY_KEY } from "@src/constants/finderFilters";
import type { IFinderItem } from "@src/types";

import { ArrowLeftIcon, TrashIcon } from "@heroicons/vue/24/outline";
import Button from "@src/components/ui/inputs/Button.vue";
import DropFileUpload from "@src/components/ui/inputs/DropFileUpload.vue";
import LabeledTextInput from "@src/components/ui/inputs/LabeledTextInput.vue";
import Pagination from "@src/components/ui/navigation/Pagination.vue";

const MY_ITEMS_PAGE_SIZE = 8;

const store = useStore();

// ---- upload form state ----
const imageFile = ref<File | undefined>(undefined);
const imagePreviewUrl = ref("");

watch(imageFile, (file) => {
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
  imagePreviewUrl.value = file ? URL.createObjectURL(file) : "";
});

const title = ref("");
const distanceKm = ref("");
const selections = reactive<Record<string, string>>({});

const uploading = ref(false);
const uploadError = ref("");
const uploadSuccess = ref("");

// ---- "your uploads" state ----
const myItems = ref<IFinderItem[]>([]);
const loadingItems = ref(true);
const deletingId = ref("");
const myItemsPage = ref(1);

const myItemsTotalPages = computed(() =>
  Math.max(1, Math.ceil(myItems.value.length / MY_ITEMS_PAGE_SIZE)),
);

const paginatedMyItems = computed(() => {
  const start = (myItemsPage.value - 1) * MY_ITEMS_PAGE_SIZE;
  return myItems.value.slice(start, start + MY_ITEMS_PAGE_SIZE);
});

const badgesFor = (item: IFinderItem): string[] =>
  [item.gender, item.ethnicity, item.hairColor, item.eyeColor, item.country].filter(
    (value): value is string => !!value,
  );

const loadMyItems = async () => {
  if (!store.authUser) return;
  loadingItems.value = true;

  const { data, error } = await supabase
    .from("finder_items")
    .select("*")
    .eq("user_id", store.authUser.id)
    .order("created_at", { ascending: false });

  if (!error && data) {
    myItems.value = (data as any[]).map((row) => ({
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

const resetForm = () => {
  imageFile.value = undefined;
  title.value = "";
  distanceKm.value = "";
  for (const key of Object.keys(selections)) delete selections[key];
};

const handleUpload = async () => {
  if (!store.authUser || !imageFile.value) return;

  uploadError.value = "";
  uploadSuccess.value = "";
  uploading.value = true;

  try {
    const fileExt = imageFile.value.name.split(".").pop();
    const filePath = `${store.authUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: storageError } = await supabase.storage
      .from("finder-images")
      .upload(filePath, imageFile.value);
    if (storageError) throw storageError;

    const { data: urlData } = supabase.storage
      .from("finder-images")
      .getPublicUrl(filePath);

    const payload: Record<string, any> = {
      user_id: store.authUser.id,
      image_url: urlData.publicUrl,
      title: title.value.trim() || null,
      distance_km: distanceKm.value.trim() ? Number(distanceKm.value) : null,
    };

    for (const filter of FINDER_SELECT_FILTERS) {
      const column = FINDER_COLUMN_BY_KEY[filter.key];
      payload[column] = selections[filter.key] || null;
    }

    const { error: insertError } = await supabase.from("finder_items").insert(payload);
    if (insertError) throw insertError;

    uploadSuccess.value = "Image uploaded!";
    resetForm();
    myItemsPage.value = 1;
    await loadMyItems();

    setTimeout(() => {
      uploadSuccess.value = "";
    }, 3000);
  } catch (err: any) {
    uploadError.value = err.message || "Failed to upload image";
  } finally {
    uploading.value = false;
  }
};

const handleDelete = async (item: IFinderItem) => {
  if (!confirm("Delete this image? This can't be undone.")) return;

  uploadError.value = "";
  deletingId.value = item.id;

  try {
    const marker = "/finder-images/";
    const markerIndex = item.imageUrl.indexOf(marker);
    if (markerIndex !== -1) {
      const path = item.imageUrl.slice(markerIndex + marker.length);
      await supabase.storage.from("finder-images").remove([path]);
    }

    const { error } = await supabase
      .from("finder_items")
      .delete()
      .eq("id", item.id);
    if (error) throw error;

    myItems.value = myItems.value.filter((existing) => existing.id !== item.id);
    if (myItemsPage.value > myItemsTotalPages.value) {
      myItemsPage.value = myItemsTotalPages.value;
    }
  } catch (err: any) {
    uploadError.value = err.message || "Failed to delete image";
  } finally {
    deletingId.value = "";
  }
};

const handleMyItemsPageChanged = (page: number) => {
  myItemsPage.value = page;
};

const canUpload = computed(() => !!imageFile.value && !uploading.value);

onMounted(loadMyItems);

onUnmounted(() => {
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
});
</script>

<template>
  <div class="w-full h-full overflow-y-auto bg-white dark:bg-gray-800 transition-colors duration-500">
    <div class="max-w-4xl mx-auto px-6 py-8">
      <!--header-->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-3">
          <RouterLink
            to="/finder"
            class="ic-btn ic-btn-ghost-primary w-9 h-9"
            aria-label="Back to Finder"
            title="Back to Finder"
          >
            <ArrowLeftIcon class="w-5 h-5" />
          </RouterLink>
          <div>
            <p class="heading-1 text-black/80 dark:text-white/80">Add to Finder</p>
            <p class="body-3 text-black/50 dark:text-white/50">
              Upload an image and set its filters.
            </p>
          </div>
        </div>
      </div>

      <!--upload form-->
      <div class="rounded-lg border border-gray-100 dark:border-gray-700 p-6 mb-10">
        <div class="grid md:grid-cols-2 gap-6">
          <!--image picker + preview-->
          <div>
            <DropFileUpload
              id="finder-image-upload"
              label="Image"
              accept="image/*"
              :value="imageFile"
              @value-changed="(value) => (imageFile = value)"
            />

            <div
              v-if="imagePreviewUrl"
              class="mt-3 rounded-lg overflow-hidden"
              style="height: 180px"
            >
              <img
                :src="imagePreviewUrl"
                alt="Selected image preview"
                class="w-full h-full object-cover"
              />
            </div>

            <div class="mt-4">
              <LabeledTextInput
                id="finder-title"
                label="Title (optional)"
                placeholder="Give it a short name"
                :value="title"
                @value-changed="(value) => (title = value)"
              />
            </div>

            <div class="mt-4">
              <LabeledTextInput
                id="finder-distance"
                type="number"
                label="Distance (km, optional)"
                placeholder="e.g. 12"
                :value="distanceKm"
                @value-changed="(value) => (distanceKm = value)"
              />
            </div>
          </div>

          <!--static filter fields-->
          <div class="flex flex-col gap-4">
            <div v-for="filter in FINDER_SELECT_FILTERS" :key="filter.key">
              <label :for="`field-${filter.key}`" class="body-2 text-black/70 dark:text-white/70 mb-1 block">
                {{ filter.label }}
              </label>
              <select
                :id="`field-${filter.key}`"
                class="text-input ringed-input"
                v-model="selections[filter.key]"
              >
                <option value="">Not specified</option>
                <option v-for="option in filter.options" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <p v-if="uploadSuccess" class="mt-5 body-3 text-green-600 dark:text-green-300">
          {{ uploadSuccess }}
        </p>
        <p v-if="uploadError" class="mt-5 body-3 text-red-600 dark:text-red-300">
          {{ uploadError }}
        </p>

        <Button
          class="contained-primary contained-text w-full py-3 mt-6"
          :disabled="!canUpload"
          :class="{ 'opacity-50 pointer-events-none': !canUpload }"
          :loading="uploading"
          @click="handleUpload"
        >
          Upload
        </Button>
      </div>

      <!--your uploads-->
      <div>
        <p class="heading-2 text-black/70 dark:text-white/70 mb-5">Your uploads</p>

        <div v-if="loadingItems" class="body-3 text-black/40 dark:text-white/40 py-6">
          Loading…
        </div>

        <div
          v-else-if="myItems.length === 0"
          class="body-3 text-black/40 dark:text-white/40 py-6"
        >
          You haven't uploaded anything yet.
        </div>

        <template v-else>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <div
            v-for="item in paginatedMyItems"
            :key="item.id"
            class="relative group rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700"
            style="aspect-ratio: 3 / 4"
          >
            <img
              :src="item.imageUrl"
              :alt="item.title || 'Uploaded image'"
              class="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-110"
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

            <button
              type="button"
              @click="handleDelete(item)"
              :disabled="deletingId === item.id"
              title="Delete image"
              aria-label="Delete image"
              class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors duration-150 focus:outline-none disabled:opacity-50"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <Pagination
          :current-page="myItemsPage"
          :total-pages="myItemsTotalPages"
          class="mt-6"
          @page-changed="handleMyItemsPageChanged"
        />
        </template>
      </div>
    </div>
  </div>
</template>

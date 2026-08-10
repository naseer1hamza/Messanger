<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import useStore from "@src/store/store";
import { supabase } from "@src/lib/supabase";
import { ensureWebSafeImage } from "@src/lib/webSafeImage";
import type { ILiaItem } from "@src/types";

import { ArrowLeftIcon, TrashIcon } from "@heroicons/vue/24/outline";
import Button from "@src/components/ui/inputs/Button.vue";
import DropFileUpload from "@src/components/ui/inputs/DropFileUpload.vue";
import LabeledTextInput from "@src/components/ui/inputs/LabeledTextInput.vue";
import Pagination from "@src/components/ui/navigation/Pagination.vue";

const MY_ITEMS_PAGE_SIZE = 8;
const DEFAULT_BACKGROUND_COLOR = "#fce0c8";
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const store = useStore();

// ---- upload form state ----
const imageFile = ref<File | undefined>(undefined);
const imagePreviewUrl = ref("");

watch(imageFile, (file) => {
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
  imagePreviewUrl.value = file ? URL.createObjectURL(file) : "";
});

const title = ref("");

const uploading = ref(false);
const converting = ref(false);
const uploadError = ref("");
const uploadSuccess = ref("");

// TIFF files aren't renderable in <img> tags, so convert them to PNG
// before they're previewed or uploaded.
const handleFileSelected = async (file: File | undefined) => {
  if (!file) {
    imageFile.value = undefined;
    return;
  }

  uploadError.value = "";
  converting.value = true;
  try {
    imageFile.value = await ensureWebSafeImage(file);
  } catch (err: any) {
    uploadError.value = err.message || "This image format isn't supported.";
    imageFile.value = undefined;
  } finally {
    converting.value = false;
  }
};

// ---- header background state ----
const currentHeaderImageUrl = ref<string | undefined>(undefined);
const headerImageFile = ref<File | undefined>(undefined);
const headerImagePreviewUrl = ref("");

watch(headerImageFile, (file) => {
  if (headerImagePreviewUrl.value) URL.revokeObjectURL(headerImagePreviewUrl.value);
  headerImagePreviewUrl.value = file ? URL.createObjectURL(file) : "";
});

const headerConverting = ref(false);
const headerUploading = ref(false);
const headerError = ref("");
const headerSuccess = ref("");

const handleHeaderFileSelected = async (file: File | undefined) => {
  if (!file) {
    headerImageFile.value = undefined;
    return;
  }

  headerError.value = "";
  headerConverting.value = true;
  try {
    headerImageFile.value = await ensureWebSafeImage(file);
  } catch (err: any) {
    headerError.value = err.message || "This image format isn't supported.";
    headerImageFile.value = undefined;
  } finally {
    headerConverting.value = false;
  }
};

const loadHeaderSettings = async () => {
  const { data } = await supabase
    .from("lia_settings")
    .select("header_image_url, background_color, footer_image_url")
    .eq("id", 1)
    .maybeSingle();
  currentHeaderImageUrl.value = (data as any)?.header_image_url || undefined;
  currentBackgroundColor.value = (data as any)?.background_color || undefined;
  backgroundColorInput.value = currentBackgroundColor.value || "";
  currentFooterImageUrl.value = (data as any)?.footer_image_url || undefined;
};

const canUploadHeader = computed(
  () => !!headerImageFile.value && !headerUploading.value && !headerConverting.value,
);

const handleHeaderUpload = async () => {
  if (!store.authUser || !headerImageFile.value) return;

  headerError.value = "";
  headerSuccess.value = "";
  headerUploading.value = true;

  try {
    const fileExt = headerImageFile.value.name.split(".").pop();
    const filePath = `${store.authUser.id}/header-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: storageError } = await supabase.storage
      .from("lia-images")
      .upload(filePath, headerImageFile.value);
    if (storageError) throw storageError;

    const { data: urlData } = supabase.storage.from("lia-images").getPublicUrl(filePath);

    const { error: upsertError } = await supabase.from("lia_settings").upsert(
      {
        id: 1,
        header_image_url: urlData.publicUrl,
        updated_by: store.authUser.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (upsertError) throw upsertError;

    currentHeaderImageUrl.value = urlData.publicUrl;
    headerImageFile.value = undefined;
    headerSuccess.value = "Header background updated!";

    setTimeout(() => {
      headerSuccess.value = "";
    }, 3000);
  } catch (err: any) {
    headerError.value = err.message || "Failed to update header background";
  } finally {
    headerUploading.value = false;
  }
};

const handleRemoveHeader = async () => {
  if (!store.authUser || !confirm("Remove the header background image?")) return;

  headerError.value = "";

  try {
    const { error } = await supabase.from("lia_settings").upsert(
      {
        id: 1,
        header_image_url: null,
        updated_by: store.authUser.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) throw error;

    currentHeaderImageUrl.value = undefined;
  } catch (err: any) {
    headerError.value = err.message || "Failed to remove header background";
  }
};

// ---- background color state ----
const currentBackgroundColor = ref<string | undefined>(undefined);
const backgroundColorInput = ref("");
const savingBackgroundColor = ref(false);
const backgroundColorError = ref("");
const backgroundColorSuccess = ref("");

const isValidHexColor = computed(() => HEX_COLOR_PATTERN.test(backgroundColorInput.value.trim()));
const canSaveBackgroundColor = computed(() => isValidHexColor.value && !savingBackgroundColor.value);

const handleSaveBackgroundColor = async () => {
  if (!store.authUser) return;

  const value = backgroundColorInput.value.trim();
  if (!HEX_COLOR_PATTERN.test(value)) {
    backgroundColorError.value = "Enter a valid hex color, e.g. #fce0c8";
    return;
  }

  backgroundColorError.value = "";
  backgroundColorSuccess.value = "";
  savingBackgroundColor.value = true;

  try {
    const { error } = await supabase.from("lia_settings").upsert(
      {
        id: 1,
        background_color: value,
        updated_by: store.authUser.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) throw error;

    currentBackgroundColor.value = value;
    backgroundColorSuccess.value = "Background color updated!";

    setTimeout(() => {
      backgroundColorSuccess.value = "";
    }, 3000);
  } catch (err: any) {
    backgroundColorError.value = err.message || "Failed to update background color";
  } finally {
    savingBackgroundColor.value = false;
  }
};

const handleResetBackgroundColor = async () => {
  if (!store.authUser || !confirm("Reset to the default background color?")) return;

  backgroundColorError.value = "";

  try {
    const { error } = await supabase.from("lia_settings").upsert(
      {
        id: 1,
        background_color: null,
        updated_by: store.authUser.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) throw error;

    currentBackgroundColor.value = undefined;
    backgroundColorInput.value = "";
  } catch (err: any) {
    backgroundColorError.value = err.message || "Failed to reset background color";
  }
};

// ---- footer image state (shown under the videos on /Lia) ----
const currentFooterImageUrl = ref<string | undefined>(undefined);
const footerImageFile = ref<File | undefined>(undefined);
const footerImagePreviewUrl = ref("");

watch(footerImageFile, (file) => {
  if (footerImagePreviewUrl.value) URL.revokeObjectURL(footerImagePreviewUrl.value);
  footerImagePreviewUrl.value = file ? URL.createObjectURL(file) : "";
});

const footerConverting = ref(false);
const footerUploading = ref(false);
const footerError = ref("");
const footerSuccess = ref("");

const handleFooterFileSelected = async (file: File | undefined) => {
  if (!file) {
    footerImageFile.value = undefined;
    return;
  }

  footerError.value = "";
  footerConverting.value = true;
  try {
    footerImageFile.value = await ensureWebSafeImage(file);
  } catch (err: any) {
    footerError.value = err.message || "This image format isn't supported.";
    footerImageFile.value = undefined;
  } finally {
    footerConverting.value = false;
  }
};

const canUploadFooter = computed(
  () => !!footerImageFile.value && !footerUploading.value && !footerConverting.value,
);

const handleFooterUpload = async () => {
  if (!store.authUser || !footerImageFile.value) return;

  footerError.value = "";
  footerSuccess.value = "";
  footerUploading.value = true;

  try {
    const fileExt = footerImageFile.value.name.split(".").pop();
    const filePath = `${store.authUser.id}/footer-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: storageError } = await supabase.storage
      .from("lia-images")
      .upload(filePath, footerImageFile.value);
    if (storageError) throw storageError;

    const { data: urlData } = supabase.storage.from("lia-images").getPublicUrl(filePath);

    const { error: upsertError } = await supabase.from("lia_settings").upsert(
      {
        id: 1,
        footer_image_url: urlData.publicUrl,
        updated_by: store.authUser.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (upsertError) throw upsertError;

    currentFooterImageUrl.value = urlData.publicUrl;
    footerImageFile.value = undefined;
    footerSuccess.value = "Footer image updated!";

    setTimeout(() => {
      footerSuccess.value = "";
    }, 3000);
  } catch (err: any) {
    footerError.value = err.message || "Failed to update footer image";
  } finally {
    footerUploading.value = false;
  }
};

const handleRemoveFooter = async () => {
  if (!store.authUser || !confirm("Remove the footer image?")) return;

  footerError.value = "";

  try {
    const { error } = await supabase.from("lia_settings").upsert(
      {
        id: 1,
        footer_image_url: null,
        updated_by: store.authUser.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) throw error;

    currentFooterImageUrl.value = undefined;
  } catch (err: any) {
    footerError.value = err.message || "Failed to remove footer image";
  }
};

// ---- "your uploads" state ----
const myItems = ref<ILiaItem[]>([]);
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

const loadMyItems = async () => {
  if (!store.authUser) return;
  loadingItems.value = true;

  const { data, error } = await supabase
    .from("lia_items")
    .select("*")
    .eq("user_id", store.authUser.id)
    .order("created_at", { ascending: false });

  if (!error && data) {
    myItems.value = (data as any[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      imageUrl: row.image_url,
      title: row.title || undefined,
      createdAt: new Date(row.created_at),
    }));
  }

  loadingItems.value = false;
};

const resetForm = () => {
  imageFile.value = undefined;
  title.value = "";
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
      .from("lia-images")
      .upload(filePath, imageFile.value);
    if (storageError) throw storageError;

    const { data: urlData } = supabase.storage.from("lia-images").getPublicUrl(filePath);

    const payload = {
      user_id: store.authUser.id,
      image_url: urlData.publicUrl,
      title: title.value.trim() || null,
    };

    const { error: insertError } = await supabase.from("lia_items").insert(payload);
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

const handleDelete = async (item: ILiaItem) => {
  if (!confirm("Delete this image? This can't be undone.")) return;

  uploadError.value = "";
  deletingId.value = item.id;

  try {
    const marker = "/lia-images/";
    const markerIndex = item.imageUrl.indexOf(marker);
    if (markerIndex !== -1) {
      const path = item.imageUrl.slice(markerIndex + marker.length);
      await supabase.storage.from("lia-images").remove([path]);
    }

    const { error } = await supabase.from("lia_items").delete().eq("id", item.id);
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

const canUpload = computed(
  () => !!imageFile.value && !uploading.value && !converting.value,
);

onMounted(() => {
  loadMyItems();
  loadHeaderSettings();
});

onUnmounted(() => {
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
  if (headerImagePreviewUrl.value) URL.revokeObjectURL(headerImagePreviewUrl.value);
});
</script>

<template>
  <div class="w-full h-full overflow-y-auto bg-white dark:bg-gray-800 transition-colors duration-500">
    <div class="max-w-2xl mx-auto px-6 py-8">
      <!--header-->
      <div class="flex items-center gap-3 mb-8">
        <RouterLink
          to="/Lia"
          class="ic-btn ic-btn-ghost-primary w-9 h-9"
          aria-label="Back to Lia"
          title="Back to Lia"
        >
          <ArrowLeftIcon class="w-5 h-5" />
        </RouterLink>
        <div>
          <p class="heading-1 text-black/80 dark:text-white/80">Add to Lia</p>
          <p class="body-3 text-black/50 dark:text-white/50">
            Upload an image to the portfolio gallery.
          </p>
        </div>
      </div>

      <!--header background-->
      <div class="rounded-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <p class="heading-2 text-black/70 dark:text-white/70 mb-1">Header background</p>
        <p class="body-3 text-black/50 dark:text-white/50 mb-4">
          Optional photo shown behind the Lia header.
        </p>

        <div
          v-if="currentHeaderImageUrl && !headerImagePreviewUrl"
          class="mb-4 rounded-lg overflow-hidden"
          style="aspect-ratio: 16 / 6"
        >
          <img
            :src="currentHeaderImageUrl"
            alt="Current header background"
            class="w-full h-full object-cover"
          />
        </div>

        <DropFileUpload
          id="lia-header-upload"
          label="Image"
          accept="image/*,.tif,.tiff"
          :value="headerImageFile"
          @value-changed="handleHeaderFileSelected"
        />

        <p v-if="headerConverting" class="mt-2 body-3 text-black/40 dark:text-white/40">
          Converting image…
        </p>

        <div v-if="headerImagePreviewUrl" class="mt-3 rounded-lg overflow-hidden" style="aspect-ratio: 16 / 6">
          <img
            :src="headerImagePreviewUrl"
            alt="Selected header background preview"
            class="w-full h-full object-cover"
          />
        </div>

        <p v-if="headerSuccess" class="mt-4 body-3 text-green-600 dark:text-green-300">
          {{ headerSuccess }}
        </p>
        <p v-if="headerError" class="mt-4 body-3 text-red-600 dark:text-red-300">
          {{ headerError }}
        </p>

        <div class="flex gap-3 mt-5">
          <Button
            class="contained-primary contained-text flex-1 py-3"
            :disabled="!canUploadHeader"
            :class="{ 'opacity-50 pointer-events-none': !canUploadHeader }"
            :loading="headerUploading"
            @click="handleHeaderUpload"
          >
            Save background
          </Button>
          <Button
            v-if="currentHeaderImageUrl"
            class="outlined-danger outlined-text py-3 px-5"
            @click="handleRemoveHeader"
          >
            Remove
          </Button>
        </div>
      </div>

      <!--background color-->
      <div class="rounded-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <p class="heading-2 text-black/70 dark:text-white/70 mb-1">Background color</p>
        <p class="body-3 text-black/50 dark:text-white/50 mb-4">
          Hex code used for the Lia page background. Defaults to {{ DEFAULT_BACKGROUND_COLOR }}.
        </p>

        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-md border border-gray-200 dark:border-gray-600 shrink-0"
            :style="{ backgroundColor: isValidHexColor ? backgroundColorInput : (currentBackgroundColor || DEFAULT_BACKGROUND_COLOR) }"
          ></div>
          <div class="flex-1">
            <LabeledTextInput
              id="lia-background-color"
              placeholder="#fce0c8"
              :value="backgroundColorInput"
              @value-changed="(value) => (backgroundColorInput = value)"
            />
          </div>
        </div>

        <p v-if="backgroundColorSuccess" class="mt-4 body-3 text-green-600 dark:text-green-300">
          {{ backgroundColorSuccess }}
        </p>
        <p v-if="backgroundColorError" class="mt-4 body-3 text-red-600 dark:text-red-300">
          {{ backgroundColorError }}
        </p>

        <div class="flex gap-3 mt-5">
          <Button
            class="contained-primary contained-text flex-1 py-3"
            :disabled="!canSaveBackgroundColor"
            :class="{ 'opacity-50 pointer-events-none': !canSaveBackgroundColor }"
            :loading="savingBackgroundColor"
            @click="handleSaveBackgroundColor"
          >
            Save color
          </Button>
          <Button
            v-if="currentBackgroundColor"
            class="outlined-danger outlined-text py-3 px-5"
            @click="handleResetBackgroundColor"
          >
            Reset
          </Button>
        </div>
      </div>

      <!--footer image-->
      <div class="rounded-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <p class="heading-2 text-black/70 dark:text-white/70 mb-1">Footer image</p>
        <p class="body-3 text-black/50 dark:text-white/50 mb-4">
          Optional photo shown below the videos on the Lia page.
        </p>

        <div
          v-if="currentFooterImageUrl && !footerImagePreviewUrl"
          class="mb-4 rounded-lg overflow-hidden bg-gray-50"
        >
          <img
            :src="currentFooterImageUrl"
            alt="Current footer image"
            class="w-full h-auto object-cover"
          />
        </div>

        <DropFileUpload
          id="lia-footer-upload"
          label="Image"
          accept="image/*,.tif,.tiff"
          :value="footerImageFile"
          @value-changed="handleFooterFileSelected"
        />

        <p v-if="footerConverting" class="mt-2 body-3 text-black/40 dark:text-white/40">
          Converting image…
        </p>

        <div v-if="footerImagePreviewUrl" class="mt-3 rounded-lg overflow-hidden bg-gray-50">
          <img
            :src="footerImagePreviewUrl"
            alt="Selected footer image preview"
            class="w-full h-auto object-cover"
          />
        </div>

        <p v-if="footerSuccess" class="mt-4 body-3 text-green-600 dark:text-green-300">
          {{ footerSuccess }}
        </p>
        <p v-if="footerError" class="mt-4 body-3 text-red-600 dark:text-red-300">
          {{ footerError }}
        </p>

        <div class="flex gap-3 mt-5">
          <Button
            class="contained-primary contained-text flex-1 py-3"
            :disabled="!canUploadFooter"
            :class="{ 'opacity-50 pointer-events-none': !canUploadFooter }"
            :loading="footerUploading"
            @click="handleFooterUpload"
          >
            Save image
          </Button>
          <Button
            v-if="currentFooterImageUrl"
            class="outlined-danger outlined-text py-3 px-5"
            @click="handleRemoveFooter"
          >
            Remove
          </Button>
        </div>
      </div>

      <!--upload form-->
      <div class="rounded-lg border border-gray-100 dark:border-gray-700 p-6 mb-10">
        <DropFileUpload
          id="lia-image-upload"
          label="Image"
          accept="image/*,.tif,.tiff"
          :value="imageFile"
          @value-changed="handleFileSelected"
        />

        <p v-if="converting" class="mt-2 body-3 text-black/40 dark:text-white/40">
          Converting image…
        </p>

        <div v-if="imagePreviewUrl" class="mt-3 rounded-lg overflow-hidden" style="aspect-ratio: 16 / 9">
          <img :src="imagePreviewUrl" alt="Selected image preview" class="w-full h-full object-cover" />
        </div>

        <div class="mt-4">
          <LabeledTextInput
            id="lia-title"
            label="Title (optional)"
            placeholder="Give it a short name"
            :value="title"
            @value-changed="(value) => (title = value)"
          />
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

        <div v-if="loadingItems" class="body-3 text-black/40 dark:text-white/40 py-6">Loading…</div>

        <div v-else-if="myItems.length === 0" class="body-3 text-black/40 dark:text-white/40 py-6">
          You haven't uploaded anything yet.
        </div>

        <template v-else>
          <div class="grid grid-cols-2 gap-4">
            <div
              v-for="item in paginatedMyItems"
              :key="item.id"
              class="relative group rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700"
              style="aspect-ratio: 16 / 9"
            >
              <img
                :src="item.imageUrl"
                :alt="item.title || 'Uploaded image'"
                class="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
              />

              <div
                v-if="item.title"
                class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 flex flex-col justify-end p-2"
              >
                <p class="text-white text-xs font-semibold truncate">{{ item.title }}</p>
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

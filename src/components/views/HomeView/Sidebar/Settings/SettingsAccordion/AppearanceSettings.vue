<script setup lang="ts">
import { ref, onMounted } from "vue";

import useStore from "@src/store/store";
import { supabase } from "@src/lib/supabase";

import AccordionButton from "@src/components/ui/data-display/AccordionButton.vue";
import Button from "@src/components/ui/inputs/Button.vue";
import DropFileUpload from "@src/components/ui/inputs/DropFileUpload.vue";
import Collapse from "@src/components/ui/utils/Collapse.vue";
import SettingsSwitch from "@src/components/views/HomeView/Sidebar/Settings/SettingsAccordion/SettingsSwitch.vue";

const props = defineProps<{
  collapsed: boolean;
  handleToggle: () => void;
}>();

const store = useStore();

const backgroundFile = ref<File | undefined>(undefined);
const backgroundLoading = ref(false);
const backgroundError = ref("");
const backgroundSuccess = ref("");

onMounted(async () => {
  if (!store.authUser) return;

  const { data } = await supabase
    .from("profiles")
    .select("chat_background_url")
    .eq("id", store.authUser.id)
    .single();

  if (data?.chat_background_url) {
    store.settings.chatBackground = data.chat_background_url;
    store.profileData.chat_background_url = data.chat_background_url;
  }
});

const handleSaveBackground = async () => {
  if (!store.authUser || !backgroundFile.value) return;

  backgroundError.value = "";
  backgroundSuccess.value = "";
  backgroundLoading.value = true;

  try {
    const fileExt = backgroundFile.value.name.split(".").pop();
    const fileName = `${store.authUser.id}-bg-${Date.now()}.${fileExt}`;
    const filePath = `backgrounds/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-backgrounds")
      .upload(filePath, backgroundFile.value, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("chat-backgrounds")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ chat_background_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", store.authUser.id);

    if (updateError) throw updateError;

    store.settings.chatBackground = publicUrl;
    store.profileData.chat_background_url = publicUrl;
    backgroundFile.value = undefined;
    backgroundSuccess.value = "Background updated!";

    setTimeout(() => { backgroundSuccess.value = ""; }, 3000);
  } catch (err: any) {
    backgroundError.value = err.message || "Failed to upload background";
  } finally {
    backgroundLoading.value = false;
  }
};

const handleRemoveBackground = async () => {
  if (!store.authUser) return;

  backgroundError.value = "";
  backgroundLoading.value = true;

  try {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ chat_background_url: null, updated_at: new Date().toISOString() })
      .eq("id", store.authUser.id);

    if (updateError) throw updateError;

    store.settings.chatBackground = "";
    store.profileData.chat_background_url = "";
    backgroundSuccess.value = "Background removed!";

    setTimeout(() => { backgroundSuccess.value = ""; }, 3000);
  } catch (err: any) {
    backgroundError.value = err.message || "Failed to remove background";
  } finally {
    backgroundLoading.value = false;
  }
};
</script>

<template>
  <!--appearance settings-->
  <AccordionButton
    id="appearance-settings-toggler"
    class="w-full flex px-5 py-6 mb-3 rounded focus:outline-none"
    :collapsed="props.collapsed"
    chevron
    aria-controls="appearance-settings-collapse"
    @click="props.handleToggle()"
  >
    <p class="heading-2 text-black/70 dark:text-white/70 mb-4">Appearance</p>
    <p class="body-2 text-black/70 dark:text-white/70">
      Customize the look and feel
    </p>
  </AccordionButton>

  <Collapse id="appearance-settings-collapse" :collapsed="props.collapsed">
    <SettingsSwitch
      title="Dark Mode"
      description="Apply a theme with dark colors"
      :value="!!store.settings.darkMode"
      :handle-toggle-switch="(value) => (store.settings.darkMode = value)"
      class="mb-7"
    />
    <SettingsSwitch
      title="Bordered Theme"
      description="Apply borders to the theme"
      :value="!!store.settings.borderedTheme"
      :handle-toggle-switch="(value) => (store.settings.borderedTheme = value)"
      class="mb-7"
    />

    <!--chat background-->
    <div class="flex flex-col mb-7">
      <p class="heading-2 text-black/70 dark:text-white/70 mb-1">Chat Background</p>
      <p class="body-2 text-black/70 dark:text-white/70 mb-4">
        Set a custom image as your chat background
      </p>

      <!--current background preview-->
      <div
        v-if="store.settings.chatBackground"
        class="relative mb-4 rounded-lg overflow-hidden"
        style="height: 100px;"
      >
        <img
          :src="store.settings.chatBackground"
          alt="Current chat background"
          class="w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-black/30 flex items-center justify-center">
          <p class="text-white text-xs font-medium">Current Background</p>
        </div>
      </div>

      <DropFileUpload
        id="chat-background-upload"
        label="Upload Background Image"
        accept="image/*"
        :value="backgroundFile"
        @value-changed="(value) => (backgroundFile = value)"
        class="mb-3"
      />

      <div v-if="backgroundSuccess" class="mb-3 p-3 bg-green-100 dark:bg-green-900 rounded">
        <p class="body-3 text-green-700 dark:text-green-200">{{ backgroundSuccess }}</p>
      </div>

      <div v-if="backgroundError" class="mb-3 p-3 bg-red-100 dark:bg-red-900 rounded">
        <p class="body-3 text-red-700 dark:text-red-200">{{ backgroundError }}</p>
      </div>

      <div class="flex gap-2">
        <Button
          v-if="backgroundFile"
          class="contained-primary contained-text flex-1 py-3"
          @click="handleSaveBackground"
          :loading="backgroundLoading"
        >
          {{ backgroundLoading ? "Uploading..." : "Apply Background" }}
        </Button>
        <Button
          v-if="store.settings.chatBackground"
          class="outlined-danger outlined-text flex-1 py-3"
          @click="handleRemoveBackground"
          :loading="backgroundLoading"
        >
          Remove
        </Button>
      </div>
    </div>
  </Collapse>
</template>

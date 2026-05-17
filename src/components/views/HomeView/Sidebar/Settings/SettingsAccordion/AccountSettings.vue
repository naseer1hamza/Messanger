<script setup lang="ts">
import type { Ref } from "vue";

import { ref, onMounted } from "vue";

import useStore from "@src/store/store";
import { supabase } from "@src/lib/supabase";

import AccordionButton from "@src/components/ui/data-display/AccordionButton.vue";
import Button from "@src/components/ui/inputs/Button.vue";
import DropFileUpload from "@src/components/ui/inputs/DropFileUpload.vue";
import LabeledTextInput from "@src/components/ui/inputs/LabeledTextInput.vue";
import Collapse from "@src/components/ui/utils/Collapse.vue";

// Types
interface AccountValues {
  username: string | undefined;
  displayName: string | undefined;
  bio: string | undefined;
  avatar: File | undefined;
}

// Variables
const props = defineProps<{
  collapsed: boolean;
  handleToggle: () => void;
}>();

const store = useStore();

const accountValues: Ref<AccountValues> = ref({
  username: "",
  displayName: "",
  bio: "",
  avatar: undefined,
});

const loading = ref(false);
const loadingProfile = ref(true);
const error = ref("");
const success = ref("");
const avatarUrl = ref("");

// Load current profile data
onMounted(async () => {
  if (!store.authUser) {
    loadingProfile.value = false;
    return;
  }

  try {
    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", store.authUser.id)
      .single();

    // If profile doesn't exist, create it
    if (fetchError && fetchError.code === "PGRST116") {
      console.log("No profile found, creating one...");
      
      const username = store.authUser.email?.split("@")[0] || `user_${store.authUser.id.substring(0, 8)}`;
      const displayName = store.authUser.user_metadata?.display_name || "User";
      
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: store.authUser.id,
          username: username,
          display_name: displayName,
        })
        .select()
        .single();

      if (createError) {
        console.error("Failed to create profile:", createError);
        throw createError;
      }

      if (newProfile) {
        accountValues.value = {
          username: newProfile.username,
          displayName: newProfile.display_name,
          bio: newProfile.bio || "",
          avatar: undefined,
        };
        avatarUrl.value = newProfile.avatar_url || "";
        
        // Update store
        store.profileData = {
          username: newProfile.username,
          display_name: newProfile.display_name,
          bio: newProfile.bio || "",
          avatar_url: newProfile.avatar_url || "",
        };
      }
    } else if (fetchError) {
      console.error("Profile fetch error:", fetchError);
      throw fetchError;
    } else if (data) {
      console.log("Loaded profile data:", data);
      accountValues.value = {
        username: data.username,
        displayName: data.display_name,
        bio: data.bio || "",
        avatar: undefined,
      };
      avatarUrl.value = data.avatar_url || "";
      
      // Update store
      store.profileData = {
        username: data.username,
        display_name: data.display_name,
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
      };
    }
  } catch (err: any) {
    console.error("Failed to load profile:", err);
    error.value = "Failed to load profile data. " + err.message;
  } finally {
    loadingProfile.value = false;
  }
});

// (event) handle submitting the values of the form.
const handleSubmit = async () => {
  error.value = "";
  success.value = "";
  loading.value = true;

  if (!store.authUser) {
    error.value = "Not authenticated";
    loading.value = false;
    return;
  }

  try {
    let uploadedAvatarUrl = avatarUrl.value;

    // Upload avatar if a new file was selected
    if (accountValues.value.avatar) {
      const fileExt = accountValues.value.avatar.name.split(".").pop();
      const fileName = `${store.authUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, accountValues.value.avatar, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      uploadedAvatarUrl = urlData.publicUrl;
    }

    // Update profile in database
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: accountValues.value.username,
        display_name: accountValues.value.displayName,
        bio: accountValues.value.bio,
        avatar_url: uploadedAvatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", store.authUser.id);

    if (updateError) throw updateError;

    avatarUrl.value = uploadedAvatarUrl;
    
    // Update store with new profile data
    store.profileData = {
      username: accountValues.value.username,
      display_name: accountValues.value.displayName,
      bio: accountValues.value.bio,
      avatar_url: uploadedAvatarUrl,
    };
    
    success.value = "Profile updated successfully!";

    setTimeout(() => {
      success.value = "";
    }, 3000);
  } catch (err: any) {
    error.value = err.message || "Failed to update profile";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <!--account settings-->
  <AccordionButton
    id="account-settings-toggler"
    class="w-full flex px-5 py-6 mb-3 rounded focus:outline-none"
    :collapsed="props.collapsed"
    chevron
    aria-controls="account-settings-collapse"
    @click="handleToggle()"
  >
    <p class="heading-2 text-black/70 dark:text-white/70 mb-4">Account</p>
    <p class="body-2 text-black/70 dark:text-white/70">
      Update your profile details
    </p>
  </AccordionButton>

  <Collapse id="account-settings-collapse" :collapsed="props.collapsed">
    <div class="px-5">
      <!-- Loading State -->
      <div v-if="loadingProfile" class="mb-5 text-center">
        <p class="body-3 text-black/70 dark:text-white/70">Loading profile...</p>
      </div>

      <!-- Profile Form -->
      <div v-else>
        <!-- Current Avatar Preview -->
        <div v-if="avatarUrl" class="mb-5 flex items-center">
          <img
            :src="avatarUrl"
            alt="Current avatar"
            class="w-16 h-16 rounded-full object-cover mr-4"
          />
          <p class="body-3 text-black/70 dark:text-white/70">Current Avatar</p>
        </div>

        <LabeledTextInput
          label="Username"
          class="mb-5"
          :value="accountValues?.username"
          @valueChanged="(value) => (accountValues.username = value)"
          placeholder="Your unique username"
        />
        <LabeledTextInput
          label="Display Name"
          class="mb-5"
          :value="accountValues?.displayName"
          @valueChanged="(value) => (accountValues.displayName = value)"
          placeholder="How others see you"
        />
        <LabeledTextInput
          label="Bio"
          class="mb-5"
          :value="accountValues?.bio"
          @valueChanged="(value) => (accountValues.bio = value)"
          placeholder="Tell others about yourself"
        />
        <DropFileUpload
          label="Update Avatar"
          class="mb-5"
          accept="image/*"
          :value="accountValues.avatar"
          @value-changed="(value) => (accountValues.avatar = value)"
        />

        <!-- Success Message -->
        <div v-if="success" class="mb-4 p-3 bg-green-100 dark:bg-green-900 rounded">
          <p class="body-3 text-green-700 dark:text-green-200">{{ success }}</p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="mb-4 p-3 bg-red-100 dark:bg-red-900 rounded">
          <p class="body-3 text-red-700 dark:text-red-200">{{ error }}</p>
        </div>

        <Button
          class="contained-primary contained-text w-full py-4"
          @click="handleSubmit"
          :loading="loading"
        >
          {{ loading ? "Saving..." : "Save Settings" }}
        </Button>
      </div>
    </div>
  </Collapse>
</template>

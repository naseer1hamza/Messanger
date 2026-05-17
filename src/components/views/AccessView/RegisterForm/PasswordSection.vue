<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";

import PasswordInput from "@src/components/ui/inputs/PasswordInput.vue";
import Button from "@src/components/ui/inputs/Button.vue";
import { supabase } from "@src/lib/supabase";
import useStore from "@src/store/store";

const props = defineProps<{
  formData: {
    email: string;
    username: string;
    displayName: string;
    password: string;
    confirmPassword: string;
  };
}>();

const emit = defineEmits(["active-section-change", "update:formData"]);

const router = useRouter();
const store = useStore();

const password = ref(props.formData.password);
const confirmPassword = ref(props.formData.confirmPassword);
const error = ref("");
const isLoading = ref(false);

const canSubmit = computed(() => {
  return password.value && confirmPassword.value && !isLoading.value;
});

const handleSignUp = async () => {
  error.value = "";

  if (!password.value || !confirmPassword.value) {
    error.value = "Please fill in all fields";
    return;
  }

  if (password.value.length < 6) {
    error.value = "Password must be at least 6 characters";
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match";
    return;
  }

  isLoading.value = true;

  try {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: props.formData.email,
      password: password.value,
      options: {
        data: {
          username: props.formData.username,
          display_name: props.formData.displayName,
        },
      },
    });

    if (signUpError) {
      // Handle specific error codes
      if (signUpError.message.includes("email_send_rate_limit")) {
        throw new Error("Please wait a few seconds before trying again.");
      }
      if (signUpError.message.includes("User already registered")) {
        throw new Error("This email is already registered. Try signing in instead.");
      }
      throw signUpError;
    }

    if (data.user) {
      // Profile is created automatically by database trigger
      // Just redirect to chat
      router.push("/chat/");
    }
  } catch (err: any) {
    error.value = err.message || "Failed to sign up. Please try again.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div>
    <div class="mb-5">
      <!--form-->
      <PasswordInput
        @valueChanged="(value) => (password = value)"
        :value="password"
        label="Password"
        placeholder="Enter your password (min 6 characters)"
        class="mb-4"
      />

      <PasswordInput
        @valueChanged="(value) => (confirmPassword = value)"
        :value="confirmPassword"
        label="Confirm Password"
        placeholder="Enter your password again"
      />
    </div>

    <!--error message-->
    <div v-if="error" class="mb-4">
      <p class="body-3 text-red-500">{{ error }}</p>
    </div>

    <!--controls-->
    <div class="mb-5">
      <Button
        class="contained-primary contained-text w-full mb-4"
        :disabled="!canSubmit"
        @click="handleSignUp"
      >
        {{ isLoading ? "Signing up..." : "Sign up" }}
      </Button>
      <Button
        class="outlined-primary outlined-text w-full"
        :disabled="isLoading"
        @click="
          $emit('active-section-change', {
            sectionName: 'personal-section',
            animationName: 'slide-right',
          })
        "
      >
        Back
      </Button>
    </div>
  </div>
</template>

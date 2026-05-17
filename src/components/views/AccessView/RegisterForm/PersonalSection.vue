<script setup lang="ts">
import { ref, computed } from "vue";
import Button from "@src/components/ui/inputs/Button.vue";
import LabeledTextInput from "@src/components/ui/inputs/LabeledTextInput.vue";

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

const email = ref(props.formData.email);
const username = ref(props.formData.username);
const displayName = ref(props.formData.displayName);
const error = ref("");

const canProceed = computed(() => {
  return email.value && username.value && displayName.value;
});

const handleNext = () => {
  error.value = "";

  if (!email.value || !username.value || !displayName.value) {
    error.value = "Please fill in all fields";
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value)) {
    error.value = "Please enter a valid email address";
    return;
  }

  emit("update:formData", {
    ...props.formData,
    email: email.value,
    username: username.value,
    displayName: displayName.value,
  });

  emit("active-section-change", {
    sectionName: "password-section",
    animationName: "slide-left",
  });
};
</script>

<template>
  <div>
    <!--form-->
    <div class="mb-5">
      <LabeledTextInput
        :value="email"
        @valueChanged="(value) => (email = value)"
        type="email"
        label="Email"
        placeholder="Enter your email"
        class="mb-5"
      />
      <LabeledTextInput
        :value="username"
        @valueChanged="(value) => (username = value)"
        label="Username"
        placeholder="Choose a unique username"
        class="mb-5"
      />
      <LabeledTextInput
        :value="displayName"
        @valueChanged="(value) => (displayName = value)"
        label="Display Name"
        placeholder="Enter your display name"
        class="mb-5"
      />
    </div>

    <!--error message-->
    <div v-if="error" class="mb-4">
      <p class="body-3 text-red-500">{{ error }}</p>
    </div>

    <!--local controls-->
    <div class="mb-6">
      <Button
        class="contained-primary contained-text w-full mb-4"
        :disabled="!canProceed"
        @click="handleNext"
        >Next</Button
      >
    </div>

    <!--divider-->
    <div class="mb-6 flex items-center">
      <span
        class="w-full border border-dashed border-gray-100 dark:border-gray-600 rounded-[.0625rem]"
      ></span>
      <p class="body-3 text-black/75 dark:text-white/70 px-4 font-light">or</p>
      <span
        class="w-full border border-dashed border-gray-100 dark:border-gray-600 rounded-[.0625rem]"
      ></span>
    </div>

    <!--oauth controls-->
    <Button class="outlined-primary outlined-text w-full mb-5">
      <img
        src="@src/assets/vectors/google-logo.svg"
        class="mr-3"
        alt="google-logo"
      />
      Sign in with google
    </Button>
  </div>
</template>

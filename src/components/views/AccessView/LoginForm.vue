<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";

import Button from "@src/components/ui/inputs/Button.vue";
import LabeledTextInput from "@src/components/ui/inputs/LabeledTextInput.vue";
import PasswordInput from "@src/components/ui/inputs/PasswordInput.vue";
import { RouterLink } from "vue-router";
import { supabase } from "@src/lib/supabase";
import useStore from "@src/store/store";

const router = useRouter();
const store = useStore();

const email = ref("");
const password = ref("");
const error = ref("");
const isLoading = ref(false);

const canSubmit = computed(() => {
  return email.value && password.value && !isLoading.value;
});

const handleSignIn = async () => {
  error.value = "";

  if (!email.value || !password.value) {
    error.value = "Please fill in all fields";
    return;
  }

  isLoading.value = true;

  try {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (signInError) throw signInError;

    if (data.session) {
      router.push("/chat/");
    }
  } catch (err: any) {
    error.value = err.message || "Failed to sign in. Please check your credentials.";
  } finally {
    isLoading.value = false;
  }
};

const handleGoogleSignIn = async () => {
  try {
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/chat/`,
      },
    });

    if (signInError) throw signInError;
  } catch (err: any) {
    error.value = err.message || "Failed to sign in with Google";
  }
};
</script>

<template>
  <div
    class="p-5 md:basis-1/2 xs:basis-full flex flex-col justify-center items-center"
  >
    <div class="w-full md:px-[26%] xs:px-[10%]">
      <!--header-->
      <div class="mb-6 flex flex-col">
        <img
          src="@src/assets/vectors/logo-gradient.svg"
          class="w-5.5 h-4.5 mb-4 opacity-70"
          alt="bird logo"
        />
        <p class="heading-2 text-black/70 dark:text-white/70 mb-4">
          Welcome back
        </p>
        <p class="body-3 text-black/75 dark:text-white/70 font-light">
          Sign in to start messaging now!
        </p>
      </div>

      <!--form-->
      <div class="mb-6">
        <LabeledTextInput
          :value="email"
          @valueChanged="(value) => (email = value)"
          type="email"
          label="Email"
          placeholder="Enter your email"
          class="mb-5"
        />
        <PasswordInput
          @value-changed="(value) => (password = value)"
          :value="password"
          label="Password"
          placeholder="Enter your password"
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
          :disabled="!canSubmit"
          @click="handleSignIn"
        >
          {{ isLoading ? "Signing in..." : "Sign in" }}
        </Button>
      </div>

      <!--divider-->
      <div class="mb-6 flex items-center">
        <span
          class="w-full border border-dashed border-gray-100 dark:border-gray-600 rounded-[.0625rem]"
        ></span>
        <p class="body-3 text-black/75 dark:text-white/70 px-4 font-light">
          or
        </p>
        <span
          class="w-full border border-dashed border-gray-100 dark:border-gray-600 rounded-[.0625rem]"
        ></span>
      </div>

      <!--oauth controls-->
      <div>
        <Button
          class="outlined-primary outlined-text w-full mb-5"
          @click="handleGoogleSignIn"
        >
          <img
            src="@src/assets/vectors/google-logo.svg"
            class="mr-3"
            alt="google logo"
          />
          Sign in with google
        </Button>

        <!--bottom text-->
        <div class="flex justify-center">
          <p class="body-2 text-black/70 dark:text-white/70">
            Don’t have an account?
            <RouterLink
              to="/access/sign-up/"
              class="text-indigo-400 opacity-100"
            >
              Sign up
            </RouterLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IContact } from "@src/types";

import { computed, onUnmounted, ref, watch } from "vue";

import { PhoneIcon } from "@heroicons/vue/24/solid";
import Modal from "@src/components/ui/utils/Modal.vue";

const props = defineProps<{
  open: boolean;
  contact: IContact | undefined;
  closeModal: () => void;
}>();

// ─── state ───────────────────────────────────────────────────────────────────
type Phase = "ringing" | "connected";
const phase = ref<Phase>("ringing");
const elapsed = ref(0); // seconds since connected

let ringTimer: ReturnType<typeof setTimeout> | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;

const clear = () => {
  if (ringTimer) { clearTimeout(ringTimer); ringTimer = null; }
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
};

const reset = () => {
  clear();
  phase.value = "ringing";
  elapsed.value = 0;
};

// Start the sequence whenever the modal opens
watch(
  () => props.open,
  (open) => {
    if (open) {
      reset();
      // After 3 s → answer
      ringTimer = setTimeout(() => {
        phase.value = "connected";
        tickTimer = setInterval(() => { elapsed.value++; }, 1000);
      }, 3000);
    } else {
      reset();
    }
  },
);

onUnmounted(clear);

// ─── helpers ─────────────────────────────────────────────────────────────────
const displayName = computed(() =>
  props.contact
    ? `${props.contact.firstName} ${props.contact.lastName}`.trim()
    : "Unknown",
);

const avatarUrl = computed(() => props.contact?.avatar || "");

const formattedTime = computed(() => {
  const m = Math.floor(elapsed.value / 60).toString().padStart(2, "0");
  const s = (elapsed.value % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
});

const handleEndCall = () => {
  reset();
  props.closeModal();
};
</script>

<template>
  <Modal :open="props.open" :close-modal="handleEndCall">
    <template #content>
      <div
        class="relative flex flex-col items-center justify-between w-72 rounded-3xl overflow-hidden"
        style="height: 420px; background: linear-gradient(160deg, #1e1b4b 0%, #312e81 40%, #1e293b 100%);"
      >
        <!-- top area -->
        <div class="flex flex-col items-center pt-12 px-6 w-full">
          <!-- contact name -->
          <p class="text-white font-semibold text-xl mb-1 tracking-tight">
            {{ displayName }}
          </p>

          <!-- status label -->
          <Transition
            enter-active-class="transition-opacity duration-300"
            leave-active-class="transition-opacity duration-200"
            enter-from-class="opacity-0"
            leave-to-class="opacity-0"
            mode="out-in"
          >
            <p v-if="phase === 'ringing'" key="ringing" class="text-indigo-300 text-sm mb-8">
              Calling<span class="animate-pulse">…</span>
            </p>
            <p v-else key="timer" class="text-green-400 text-sm font-mono mb-8">
              {{ formattedTime }}
            </p>
          </Transition>

          <!-- avatar with pulsing rings -->
          <div class="relative flex items-center justify-center">
            <!-- ring 1 -->
            <span
              v-if="phase === 'ringing'"
              class="absolute w-36 h-36 rounded-full border-2 border-indigo-400/40 animate-ping"
              style="animation-duration: 1.6s;"
            />
            <!-- ring 2 -->
            <span
              v-if="phase === 'ringing'"
              class="absolute w-28 h-28 rounded-full border-2 border-indigo-400/50 animate-ping"
              style="animation-duration: 1.6s; animation-delay: 0.4s;"
            />

            <!-- avatar -->
            <div
              class="relative z-10 w-24 h-24 rounded-full bg-gray-600 bg-cover bg-center ring-4 ring-white/20 shadow-xl"
              :style="avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : {}"
            >
              <!-- fallback initials -->
              <div
                v-if="!avatarUrl"
                class="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
              >
                {{ (contact?.firstName?.[0] || '?').toUpperCase() }}
              </div>
            </div>

            <!-- green connected ring -->
            <Transition
              enter-active-class="transition-all duration-500"
              enter-from-class="opacity-0 scale-75"
              enter-to-class="opacity-100 scale-100"
            >
              <span
                v-if="phase === 'connected'"
                class="absolute w-28 h-28 rounded-full border-2 border-green-400/60 z-0"
              />
            </Transition>
          </div>
        </div>

        <!-- bottom controls -->
        <div
          class="w-full flex justify-center items-center pb-10"
          style="background: linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%);"
        >
          <!-- end call button -->
          <button
            @click="handleEndCall"
            title="End call"
            aria-label="End call"
            class="w-16 h-16 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all duration-150 shadow-lg focus:outline-none"
          >
            <!-- rotated phone = hang up -->
            <PhoneIcon class="w-7 h-7 text-white rotate-[135deg]" />
          </button>
        </div>
      </div>
    </template>
  </Modal>
</template>

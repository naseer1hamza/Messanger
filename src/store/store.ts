import { defineStore } from "pinia";
import type { Ref } from "vue";
import { computed, ref } from "vue";
import type { User } from "@supabase/supabase-js";

import type {
  IConversation,
  IContactGroup,
  IUser,
  INotification,
  ICall,
  ISettings,
  IEmoji,
} from "@src/types";
import { supabase } from "@src/lib/supabase";

const defaultSettings: ISettings = {
  lastSeen: false,
  readReceipt: false,
  joiningGroups: false,
  privateMessages: false,
  darkMode: false,
  borderedTheme: false,
  allowNotifications: false,
  keepNotifications: false,
};

const useStore = defineStore("chat", () => {
  // local storage
  const storage = JSON.parse(localStorage.getItem("chat") || "{}");

  // app status refs
  const status = ref("idle");
  
  // auth state
  const authUser: Ref<User | null> = ref(null);
  const isAuthenticated = computed(() => authUser.value !== null);
  
  // profile state
  const profileData = ref<{
    username?: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string;
  }>({});

  // app data refs
  // data refs
  const user: Ref<IUser | undefined> = ref(undefined);
  const conversations: Ref<IConversation[]> = ref([]);
  const notifications: Ref<INotification[]> = ref([]);
  const archivedConversations: Ref<IConversation[]> = ref([]);
  const calls: Ref<ICall[]> = ref([]);
  const settings: Ref<ISettings> = ref(
    storage.settings || defaultSettings
  );
  const activeCall: Ref<ICall | undefined> = ref(undefined);
  const recentEmoji: Ref<IEmoji[]> = ref(storage.recentEmoji || []);
  const emojiSkinTone: Ref<string> = ref(storage.emojiSkinTone || "neutral");

  // ui refs
  const activeSidebarComponent: Ref<string> = ref(
    storage.activeSidebarComponent || "messages"
  );
  const delayLoading = ref(true);
  const conversationOpen: Ref<string | undefined> = ref(
    storage.conversationOpen
  );
  const callMinimized = ref(false);
  const openVoiceCall = ref(false);

  // contacts grouped alphabetically.
  const contactGroups: Ref<IContactGroup[] | undefined> = computed(() => {
    if (user.value) {
      let sortedContacts = [...user.value.contacts];

      sortedContacts.sort();

      let groups: IContactGroup[] = [];
      let currentLetter: string = "";
      let groupNames: string[] = [];

      // create an array of letter for every different sort level.
      for (let contact of sortedContacts) {
        // if the first letter is different create a new group.
        if (contact.firstName[0].toUpperCase() !== currentLetter) {
          currentLetter = contact.firstName[0].toUpperCase();
          groupNames.push(currentLetter);
        }
      }

      // create an array that groups contact names based on the first letter;
      for (let groupName of groupNames) {
        let group: IContactGroup = { letter: groupName, contacts: [] };
        for (let contact of sortedContacts) {
          if (contact.firstName[0].toUpperCase() === groupName) {
            group.contacts.push(contact);
          }
        }
        groups.push(group);
      }

      return groups;
    }
  });

  const getStatus = computed(() => status);

  // Initialize auth state
  const initAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    authUser.value = session?.user ?? null;

    supabase.auth.onAuthStateChange((_event, session) => {
      authUser.value = session?.user ?? null;
    });
  };

  return {
    // status refs
    status,
    getStatus,

    // auth refs
    authUser,
    isAuthenticated,
    initAuth,

    // profile refs
    profileData,

    // data refs
    user,
    conversations,
    contactGroups,
    notifications,
    archivedConversations,
    calls,
    settings,
    activeCall,
    recentEmoji,
    emojiSkinTone,

    // ui refs
    activeSidebarComponent,
    delayLoading,
    conversationOpen,
    callMinimized,
    openVoiceCall,
  };
});

export default useStore;

import { createRouter, createWebHistory } from "vue-router";
import AccessView from "@src/components/views/AccessView/AccessView.vue";
import HomeView from "@src/components/views/HomeView/HomeView.vue";
import PasswordResetView from "@src/components/views/PasswordResetView/PasswordResetView.vue";
import { supabase } from "@src/lib/supabase";

// Lazy load Chat to avoid circular dependency
const Chat = () => import("@src/components/views/HomeView/Chat/Chat.vue");

const routes = [
  {
    path: "/chat/",
    name: "Home",
    alias: "/",
    component: HomeView,
    meta: { requiresAuth: true },
    children: [
      {
        path: "/chat/",
        alias: "/",
        name: "No-Chat",
        component: Chat,
        meta: { requiresAuth: true },
      },
      {
        path: "/chat/:id/",
        name: "Chat",
        component: Chat,
        meta: { requiresAuth: true },
      },
    ],
  },
  {
    path: "/access/:method/",
    name: "Access",
    component: AccessView,
  },
  {
    path: "/reset/",
    name: "Password Reset",
    component: PasswordResetView,
  },
];

// create the router
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Auth guard - redirect to login if not authenticated
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  if (requiresAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      next({ name: "Access", params: { method: "sign-in" } });
    } else {
      next();
    }
  } else {
    next();
  }
});

// (router guard) when navigating in mobile screen from chat to chatlist,
// don't navigate to the previous chat navigate to the chatlist.
router.beforeEach((to, from, next) => {
  if (from.name === "Chat" && to.name === "Chat" && window.innerWidth <= 967)
    next({ name: "No-Chat" });
  else next();
});

export default router;

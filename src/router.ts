import { createRouter, createWebHistory } from "vue-router";
import AccessView from "@src/components/views/AccessView/AccessView.vue";
import HomeView from "@src/components/views/HomeView/HomeView.vue";
import PasswordResetView from "@src/components/views/PasswordResetView/PasswordResetView.vue";
import { supabase } from "@src/lib/supabase";

// Lazy load Chat to avoid circular dependency
const Chat = () => import("@src/components/views/HomeView/Chat/Chat.vue");

// Finder is a standalone side app, lazy loaded since most users won't visit it
const FinderView = () => import("@src/components/views/FinderView/FinderView.vue");
const AddFinderView = () => import("@src/components/views/AddFinderView/AddFinderView.vue");

// Lia is a standalone portfolio/gallery page, lazy loaded since most users won't visit it
const LiaView = () => import("@src/components/views/LiaView/LiaView.vue");
const AddLiaView = () => import("@src/components/views/AddLiaView/AddLiaView.vue");

const routes = [
  {
    path: "/chat/",
    name: "Home",
    alias: "/messanger",
    component: HomeView,
    meta: { requiresAuth: true },
    children: [
      {
        path: "/chat/",
        alias: "/messanger",
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
  {
    path: "/finder",
    name: "Finder",
    component: FinderView,
    meta: { requiresAuth: true },
  },
  {
    path: "/AddFinder",
    name: "Add Finder",
    component: AddFinderView,
    meta: { requiresAuth: true },
  },
  {
    // public portfolio gallery - anyone can view, no login required
    path: "/",
    name: "Lia",
    component: LiaView,
  },
  {
    path: "/AddLia",
    name: "Add Lia",
    component: AddLiaView,
    meta: { requiresAuth: true },
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

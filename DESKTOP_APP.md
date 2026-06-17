# Desktop App — Windows

## Recommended Solution: Tauri

### Why Tauri over Electron?

| | Tauri | Electron |
|---|---|---|
| **Bundle size** | ~3–10 MB | ~80–150 MB |
| **Memory usage** | Uses OS WebView (Edge/WebKit) | Ships full Chromium |
| **Performance** | Near-native | Heavy |
| **Security** | Rust backend, minimal attack surface | Node.js in renderer |
| **Build time** | Fast (Vite stays unchanged) | Slower |
| **Windows support** | ✅ Uses WebView2 (built into Win 10/11) | ✅ |

Tauri wraps the existing Vite + Vue app with almost zero changes to the frontend code. The Rust backend handles OS integration (window chrome, tray, notifications, auto-update). Since this app is entirely Supabase-backed with no local server, Tauri is a perfect fit.

---

## Prerequisites

1. **Rust** — [rustup.rs](https://rustup.rs)
2. **WebView2** — already installed on Windows 10/11. For older machines: [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
3. **Node / Yarn** — already installed
4. **Visual Studio C++ Build Tools** — needed by Rust on Windows ([vs_buildtools](https://visualstudio.microsoft.com/visual-cpp-build-tools/))

---

## Setup Steps

### 1. Install the Tauri CLI

```bash
yarn add -D @tauri-apps/cli@latest
yarn add @tauri-apps/api@latest
```

### 2. Initialise Tauri

```bash
yarn tauri init
```

When prompted:

| Prompt | Value |
|---|---|
| App name | `Messenger` |
| Window title | `Messenger` |
| Web assets location | `../dist` |
| Dev server URL | `http://localhost:5173` |
| Dev command | `yarn dev` |
| Build command | `yarn build` |

This creates a `src-tauri/` folder alongside `src/`.

### 3. Update `src-tauri/tauri.conf.json`

```json
{
  "productName": "Messenger",
  "version": "0.1.0",
  "build": {
    "beforeDevCommand": "yarn dev",
    "beforeBuildCommand": "yarn build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Messenger",
        "width": 1200,
        "height": 780,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis", "msi"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

### 4. Add scripts to `package.json`

```json
"scripts": {
  "dev": "vite",
  "build": "vue-tsc --noEmit && vite build",
  "preview": "vite preview",
  "tauri": "tauri",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build"
}
```

### 5. Run in development

```bash
yarn tauri:dev
```

This starts the Vite dev server and opens a native window — hot reload works exactly as in the browser.

### 6. Build the Windows installer

```bash
yarn tauri:build
```

Outputs to `src-tauri/target/release/bundle/`:
- `nsis/Messenger_0.1.0_x64-setup.exe` — single-file installer
- `msi/Messenger_0.1.0_x64_en-US.msi` — MSI package

---

## Optional Enhancements

### System tray icon
Keep the app running in the background with a tray icon. Add to `tauri.conf.json`:
```json
"trayIcon": {
  "iconPath": "icons/32x32.png",
  "iconAsTemplate": true
}
```

### Native notifications
Replace browser `Notification` API with Tauri's plugin for reliable OS-level notifications:
```bash
yarn add @tauri-apps/plugin-notification
```

### Auto-updater
Tauri has a built-in updater plugin that checks a release endpoint and installs patches silently — useful once the app is distributed.

### Custom titlebar
Since Tauri lets you remove the native titlebar (`"decorations": false`), you can style a custom drag-handle bar in Vue to match the app's design.

---

## Project Structure After Setup

```
Messenger/
├── src/                  # Vue app (unchanged)
├── src-tauri/
│   ├── src/
│   │   └── main.rs       # Rust entry point (minimal boilerplate)
│   ├── icons/            # App icons (replace with your own)
│   ├── Cargo.toml
│   └── tauri.conf.json   # Window + bundle config
├── dist/                 # Built frontend (gitignored)
├── package.json
└── vite.config.ts
```

---

## Environment Variables

Supabase keys are read from `.env` at build time by Vite — nothing changes. The keys are embedded in the frontend bundle exactly as they are for the web version. For production, consider restricting the Supabase anon key's RLS policies rather than trying to hide it (it is public by design).

---

## Distribution

1. Build with `yarn tauri:build`
2. Share `Messenger_x.x.x_x64-setup.exe` directly, or upload to GitHub Releases and use the auto-updater to push future versions automatically

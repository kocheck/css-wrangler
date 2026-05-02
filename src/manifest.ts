import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "CSS Wrangler",
  version: "0.1.0",
  description: "Visually edit CSS on any site and copy an LLM-ready patch into Claude Code.",
  minimum_chrome_version: "116",
  action: {
    default_title: "Open CSS Wrangler",
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  side_panel: {
    default_path: "src/panel/index.html",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
      all_frames: false,
    },
  ],
  permissions: ["activeTab", "sidePanel", "scripting"],
  host_permissions: ["<all_urls>"],
  web_accessible_resources: [
    {
      resources: ["src/assets/*"],
      matches: ["<all_urls>"],
    },
  ],
});

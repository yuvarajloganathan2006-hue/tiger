import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tiger.companion",
  appName: "TIGER",
  webDir: "dist",
  server: {
    androidScheme: "http"
  }
};

export default config;

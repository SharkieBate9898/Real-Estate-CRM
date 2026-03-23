/**
 * Capacitor configuration for Mini CRM.
 *
 * Publishing (iOS):
 * 1) npm run build
 * 2) npx cap sync
 * 3) npx cap open ios
 * 4) Build + archive in Xcode, then submit to App Store Connect.
 *
 * Publishing (Android):
 * 1) npm run build
 * 2) npx cap sync
 * 3) npx cap open android
 * 4) Build signed bundle in Android Studio, then upload to Google Play.
 *
 * Local dev with live reload:
 * - Start Next dev server: npm run dev
 * - Set CAP_SERVER_URL=http://localhost:3000
 * - npx cap sync (once), then open iOS/Android.
 */

import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.minicrm.app",
  appName: "Mini CRM",
  webDir: "out",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: true,
        },
      }
    : {}),
};

export default config;

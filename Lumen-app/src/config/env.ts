import { Platform } from "react-native";

const DEFAULT_API_URL = "https://backend.render.com";

/** Android emulators cannot reach the host's localhost — 10.0.2.2 is the bridge.
 *  Hosted URLs contain neither token and pass through untouched. */
const forEmulator = (url: string) =>
  Platform.OS === "android"
    ? url.replace("localhost", "10.0.2.2").replace("127.0.0.1", "10.0.2.2")
    : url;

const clean = (url: string) => url.trim().replace(/\/+$/, "");

const rawApiUrl = clean(process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL);
const rawSocketUrl = clean(process.env.EXPO_PUBLIC_SOCKET_URL || rawApiUrl);

export const env = {
  apiUrl: forEmulator(rawApiUrl),
  socketUrl: forEmulator(rawSocketUrl),
} as const;

if (__DEV__) {
  if (!process.env.EXPO_PUBLIC_API_URL) {
    console.warn(
      `[LUMEN] EXPO_PUBLIC_API_URL is not set — falling back to ${DEFAULT_API_URL}. ` +
        "Copy .env.example to .env and point it at your backend.",
    );
  }
  // Android (outside the emulator bridge) blocks cleartext HTTP by default.
  if (Platform.OS === "android" && rawApiUrl.startsWith("http://") && !rawApiUrl.includes("10.0.2.2")) {
    console.warn(`[LUMEN] ${rawApiUrl} is plain HTTP; Android blocks cleartext traffic in release builds.`);
  }
}

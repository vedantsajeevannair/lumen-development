import { Platform } from "react-native";

const getBackendUrl = (defaultUrl: string) => {
  if (Platform.OS === "android") {
    return defaultUrl.replace("localhost", "10.0.2.2").replace("127.0.0.1", "10.0.2.2");
  }
  return defaultUrl;
};

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || "https://api.lumen.example.com";
const rawSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || "wss://api.lumen.example.com";

export const env = {
  apiUrl: getBackendUrl(rawApiUrl),
  socketUrl: getBackendUrl(rawSocketUrl),
} as const;

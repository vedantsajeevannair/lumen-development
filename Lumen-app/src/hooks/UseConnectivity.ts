import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

export interface UseConnectivityState {
  readonly online: boolean;
  readonly reachable: boolean;
}

export function useConnectivity(): UseConnectivityState {
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleOnline = () => setOnline(true);
      const handleOffline = () => setOnline(false);

      setOnline(navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        await fetch("https://clients3.google.com/generate_204", {
          method: "HEAD",
          signal: controller.signal,
          mode: "no-cors",
          cache: "no-store",
        });

        clearTimeout(timeoutId);
        setOnline(true);
      } catch {
        setOnline(false);
      }
    };

    checkConnection();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkConnection();
      }
    });

    const intervalId = setInterval(checkConnection, 15000);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  return {
    online,
    reachable: online,
  } as const;
}

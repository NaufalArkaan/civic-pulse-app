import { useEffect } from "react";
import { Stack } from "expo-router";
import { registerBackgroundSyncAsync } from "../services/background/backgroundSyncTask";

export default function RootLayout() {
  useEffect(() => {
    // Opportunistic registration of background sync task
    void registerBackgroundSyncAsync();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

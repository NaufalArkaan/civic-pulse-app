import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { registerBackgroundSyncAsync } from "../services/background/backgroundSyncTask";

export default function RootLayout() {
  useEffect(() => {
    // Opportunistic registration of background sync task
    void registerBackgroundSyncAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </SafeAreaProvider>
  );
}

/**
 * Civic Pulse - Pertemuan 11
 * Service: BackgroundSyncTask (Opportunistic Background Sync Execution)
 * Role: Anggota 3 (Lead Network, Offline Storage & Background Processing Engineer)
 *
 * Architecture & Real-world OS Constraints:
 * 1. Top-Level Task Definition: TaskManager.defineTask WAJIB didefinisikan di module top-level
 *    sebelum React tree mounting agar OS dapat memanggilnya saat aplikasi di background.
 * 2. OS Background Execution Reality:
 *    - Android: Dikelola oleh WorkManager / JobScheduler dengan interval minimum 15 menit.
 *      Dibatasi oleh Doze Mode, App Standby Buckets, dan mode Battery Saver.
 *    - iOS: Dikelola oleh BGAppRefreshTask (Background Fetch). Jadwal bersifat oportunistik
 *      bergantung pada machine learning iOS, level baterai, dan kebiasaan pengguna.
 *    - Expo Go: Tidak mendukung background task saat aplikasi di-kill/suspended.
 *    - Kesimpulan: Background sync adalah OPUNTUNISTIK. Mekanisme sinkronisasi deterministik
 *      utama tetaplah Foreground Sync on App Launch / Reconnection.
 */

import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { syncEngine } from "../sync/syncEngine";

export const BACKGROUND_SYNC_TASK_NAME = "CIVIC_PULSE_BACKGROUND_SYNC";

// WAJIB: Didefinisikan di top-level scope (bukan di dalam lifecycle component)
TaskManager.defineTask(BACKGROUND_SYNC_TASK_NAME, async () => {
  const startTime = Date.now();
  console.log(`[BackgroundSync] Opportunistic task started at ${new Date(startTime).toISOString()}`);

  try {
    const result = await syncEngine.syncAll();

    console.log(
      `[BackgroundSync] Task finished. Synced: ${result.syncedCount}, Failed: ${result.failedCount}`
    );

    if (result.syncedCount > 0) {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.warn("[BackgroundSync] Execution error in background task:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export type BackgroundSyncRegistrationStatus = {
  isDefined: boolean;
  isRegistered: boolean;
  status: BackgroundFetch.BackgroundFetchStatus;
  statusDescription: string;
};

/**
 * Mendaftarkan background task ke sistem operasi secara aman.
 */
export async function registerBackgroundSyncAsync(): Promise<boolean> {
  try {
    const isAvailable = await TaskManager.isAvailableAsync();
    if (!isAvailable) {
      console.warn("[BackgroundSync] TaskManager is not available in current environment (Expo Go / Web).");
      return false;
    }

    const isDefined = TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK_NAME);
    if (!isDefined) {
      console.warn(`[BackgroundSync] Task ${BACKGROUND_SYNC_TASK_NAME} is not defined in TaskManager.`);
      return false;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK_NAME);
    if (isRegistered) {
      return true;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK_NAME, {
      minimumInterval: 15 * 60, // 15 menit (standar minimum Android WorkManager)
      stopOnTerminate: false,   // Berusaha melanjutkan setelah app terminate jika OS mengizinkan
      startOnBoot: true,        // Minta trigger setelah perangkat reboot
    });

    return true;
  } catch (error) {
    console.warn("[BackgroundSync] Failed to register background task (expected in Expo Go/Web):", error);
    return false;
  }
}

/**
 * Mencabut registrasi background task.
 */
export async function unregisterBackgroundSyncAsync(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK_NAME);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK_NAME);
    }
    return true;
  } catch (error) {
    console.warn("[BackgroundSync] Failed to unregister background task:", error);
    return false;
  }
}

/**
 * Mengecek status ketersediaan background fetch pada perangkat.
 */
export async function getBackgroundSyncStatusAsync(): Promise<BackgroundSyncRegistrationStatus> {
  const isDefined = TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK_NAME);
  let isRegistered = false;
  let status = BackgroundFetch.BackgroundFetchStatus.Denied;

  try {
    isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK_NAME);
    const fetchedStatus = await BackgroundFetch.getStatusAsync();
    if (fetchedStatus !== null) {
      status = fetchedStatus;
    }
  } catch {
    // Fallback untuk environment tanpa native background fetch
  }

  let statusDescription = "Available";
  switch (status) {
    case BackgroundFetch.BackgroundFetchStatus.Restricted:
      statusDescription = "Restricted (e.g. Parental controls or battery saver)";
      break;
    case BackgroundFetch.BackgroundFetchStatus.Denied:
      statusDescription = "Denied by user / OS";
      break;
    case BackgroundFetch.BackgroundFetchStatus.Available:
      statusDescription = "Available for background scheduling";
      break;
  }

  return {
    isDefined,
    isRegistered,
    status,
    statusDescription,
  };
}

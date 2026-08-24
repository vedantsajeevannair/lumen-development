import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { apiClient } from "@/services/api.client";

const OFFLINE_QUEUE_KEY = "@lumen_offline_reports_queue";

export interface QueuedReport {
  id: string;
  category: string;
  description: string;
  priority: string;
  latitude?: number;
  longitude?: number;
  queuedAt: number;
}

class SyncManager {
  private isOnline = true;
  private isSyncing = false;

  constructor() {
    // Listen to network changes
    NetInfo.addEventListener((state) => {
      // Use isConnected as the primary indicator to avoid simulator issues with isInternetReachable
      const currentlyOnline = !!state.isConnected;
      if (currentlyOnline && !this.isOnline) {
        this.isOnline = true;
        this.syncOfflineReports();
      } else {
        this.isOnline = currentlyOnline;
      }
    });
  }

  get isCurrentlyOnline() {
    return this.isOnline;
  }

  async enqueueReport(report: Omit<QueuedReport, "id" | "queuedAt">) {
    const queue = await this.getQueue();
    const newReport: QueuedReport = {
      ...report,
      id: `offline-${Date.now()}`,
      queuedAt: Date.now(),
    };

    queue.push(newReport);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return newReport;
  }

  async getQueue(): Promise<QueuedReport[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async clearQueue() {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  }

  async syncOfflineReports() {
    if (this.isSyncing) return;

    const queue = await this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;

    try {
      // Map queued reports to the format expected by the API
      const payload = queue.map((q) => ({
        title: `Offline Report - ${q.category}`,
        description: q.description,
        category: q.category,
        priority: q.priority,
        latitude: q.latitude,
        longitude: q.longitude,
      }));

      await apiClient.post("/complaints/sync", { complaints: payload });

      // Clear queue upon success
      await this.clearQueue();
      console.log(`Successfully synced ${queue.length} offline reports.`);
    } catch (e) {
      console.error("Failed to sync offline reports", e);
      // Keep in queue for next time
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncManager = new SyncManager();

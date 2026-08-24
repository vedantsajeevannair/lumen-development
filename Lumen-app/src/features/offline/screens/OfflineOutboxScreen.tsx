import { useTheme } from "@/design-system/ThemeContext";
import { Button } from "@/design-system/components/Button";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Radius, Spacing, TextStyles } from "@/design-system/tokens";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, View, Text, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QueuedReport, syncManager } from "../services/SyncManager";

export default function OfflineOutboxScreen() {
  const { colors, isDark } = useTheme();
  const [queue, setQueue] = useState<QueuedReport[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    const data = await syncManager.getQueue();
    setQueue(data);
  };

  const handleSync = async () => {
    if (!syncManager.isCurrentlyOnline) {
      Alert.alert("Offline", "You are currently offline. Cannot sync right now.");
      return;
    }
    setSyncing(true);
    await syncManager.syncOfflineReports();
    await loadQueue();
    setSyncing(false);
  };

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgBase, padding: Spacing[6] },
    header: { marginBottom: Spacing[6] },
    title: { ...TextStyles.heading2, color: colors.textPrimary },
    subtitle: {
      ...TextStyles.body,
      color: colors.textSecondary,
      marginTop: Spacing[2],
    },
    card: {
      backgroundColor: colors.bgSurfaceRaised,
      borderRadius: Radius.md,
      padding: Spacing[4],
      marginBottom: Spacing[4],
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    category: { ...TextStyles.title, color: colors.textPrimary },
    date: { ...TextStyles.caption, color: colors.textSecondary, marginTop: Spacing[2] },
    empty: {
      ...TextStyles.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: Spacing[12],
    },
  });

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Offline Outbox</Text>
        <Text style={s.subtitle}>Reports waiting to be synced to the server.</Text>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.category}>{item.category.toUpperCase()}</Text>
              <LumenIcon name="alert" size="sm" color={colors.warningText} />
            </View>
            <Text style={s.subtitle} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={s.date}>{new Date(item.queuedAt).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>No offline reports in queue.</Text>}
      />

      <View style={{ marginTop: Spacing[6] }}>
        {queue.length > 0 && (
          <Button label="Sync Now" onPress={handleSync} loading={syncing} variant="primary" />
        )}
        <View style={{ marginTop: Spacing[4] }}>
          <Button label="Back" onPress={() => router.back()} variant="outline" />
        </View>
      </View>
    </SafeAreaView>
  );
}

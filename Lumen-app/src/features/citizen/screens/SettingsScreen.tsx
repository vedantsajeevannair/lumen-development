// ============================================================
// LUMEN — Settings Screen (Citizen)
// Phase 3: Citizen Experience
// ============================================================
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Switch,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Card } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { TextStyles, Spacing, Radius } from "@/design-system/tokens";
import type { LumenIconName } from "@/design-system";
import { useAuthStore } from "@/store/AuthStore";
import { AuthService } from "@/services/auth.service";
import * as SecureStore from "expo-secure-store";

interface ToggleSetting {
  icon: LumenIconName;
  label: string;
  desc?: string;
  key: string;
}

interface LinkSetting {
  icon: LumenIconName;
  label: string;
  value?: string;
}

const TOGGLE_SETTINGS: ToggleSetting[] = [
  {
    icon: "notifications",
    label: "Push Notifications",
    desc: "Report updates & alerts",
    key: "push",
  },
  { icon: "email", label: "Email Notifications", desc: "Weekly digest", key: "email" },
  { icon: "locate", label: "Location Services", desc: "For issue reporting", key: "location" },
  { icon: "biometric", label: "Biometric Login", desc: "Face ID / Fingerprint", key: "biometric" },
  { icon: "offline", label: "Offline Mode", desc: "Cache data for offline use", key: "offline" },
];

const APPEARANCE: LinkSetting[] = [
  { icon: "sun", label: "Theme", value: "System" },
  { icon: "globe", label: "Language", value: "English" },
  { icon: "info", label: "App Version", value: "v1.0.0" },
];

export default function SettingsScreen() {
  const { colors, isDark, shadows } = useTheme();
  const user = useAuthStore((state) => state.session?.user);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    push: true,
    email: false,
    location: true,
    biometric: false,
    offline: true,
  });

  useEffect(() => {
    const checkBiometric = async () => {
      if (user?.email) {
        try {
          const userBiometricKey = AuthService.getBiometricKey(user.email);
          const storedCreds = await SecureStore.getItemAsync(userBiometricKey);
          setToggles((t) => ({ ...t, biometric: !!storedCreds }));
        } catch (e) {
          console.warn("Failed to check biometric status in settings", e);
        }
      }
    };
    checkBiometric();
  }, [user]);

  const handleToggle = async (key: string) => {
    if (key === "biometric") {
      const currentVal = toggles.biometric;
      if (!currentVal) {
        // Enable biometric
        try {
          if (!user?.email) throw new Error("No active user session");
          await AuthService.enrollBiometric(user.email);
          setToggles((t) => ({ ...t, biometric: true }));
          Alert.alert("Success", "Biometric login has been enabled.");
        } catch (err: any) {
          Alert.alert("Enrollment Failed", err.message || "Failed to enable biometric login.");
        }
      } else {
        // Disable biometric
        try {
          if (!user?.email) throw new Error("No active user session");
          const userBiometricKey = AuthService.getBiometricKey(user.email);
          await SecureStore.deleteItemAsync(userBiometricKey);
          setToggles((t) => ({ ...t, biometric: false }));
          Alert.alert("Disabled", "Biometric login has been disabled for this device.");
        } catch (err: any) {
          Alert.alert("Error", err.message || "Failed to disable biometric login.");
        }
      }
    } else {
      setToggles((t) => ({ ...t, [key]: !t[key] }));
    }
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bgBase }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bgBase}
      />

      <View style={[s.header, { borderBottomColor: colors.borderDefault }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <LumenIcon name="back" size="md" color={colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <Text style={[TextStyles.title, { color: colors.textPrimary }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Notifications & Privacy */}
        <Text style={[TextStyles.label, s.sectionLabel, { color: colors.textTertiary }]}>
          Notifications & Privacy
        </Text>
        <Card variant="elevated" padding={0} style={s.card}>
          {TOGGLE_SETTINGS.map((setting, i) => (
            <View
              key={setting.key}
              style={[
                s.row,
                {
                  borderBottomColor: colors.borderDefault,
                  borderBottomWidth: i < TOGGLE_SETTINGS.length - 1 ? 1 : 0,
                },
              ]}
            >
              <View style={[s.rowIcon, { backgroundColor: colors.bgSubtle }]}>
                <LumenIcon name={setting.icon} size="sm" color={colors.brand} strokeWidth={2} />
              </View>
              <View style={s.rowInfo}>
                <Text style={[TextStyles.bodyMedium, { color: colors.textPrimary }]}>
                  {setting.label}
                </Text>
                {setting.desc && (
                  <Text style={[TextStyles.caption, { color: colors.textSecondary }]}>
                    {setting.desc}
                  </Text>
                )}
              </View>
              <Switch
                value={toggles[setting.key]}
                onValueChange={() => handleToggle(setting.key)}
                trackColor={{ false: colors.borderDefault, true: colors.brand }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </Card>

        {/* Appearance */}
        <Text style={[TextStyles.label, s.sectionLabel, { color: colors.textTertiary }]}>
          Appearance & General
        </Text>
        <Card variant="elevated" padding={0} style={s.card}>
          {APPEARANCE.map((item, i) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                s.row,
                {
                  borderBottomColor: colors.borderDefault,
                  borderBottomWidth: i < APPEARANCE.length - 1 ? 1 : 0,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={[s.rowIcon, { backgroundColor: colors.bgSubtle }]}>
                <LumenIcon
                  name={item.icon}
                  size="sm"
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
              </View>
              <Text style={[TextStyles.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
                {item.label}
              </Text>
              {item.value && (
                <Text style={[TextStyles.body, { color: colors.textTertiary }]}>{item.value}</Text>
              )}
              <LumenIcon
                name="chevronRight"
                size="sm"
                color={colors.textTertiary}
                strokeWidth={2}
              />
            </Pressable>
          ))}
        </Card>

        {/* Danger Zone */}
        <Text style={[TextStyles.label, s.sectionLabel, { color: colors.textTertiary }]}>
          Account
        </Text>
        <Card variant="elevated" padding={0} style={s.card}>
          {[
            { label: "Change Password", icon: "lock" as LumenIconName },
            { label: "Delete Account", icon: "error" as LumenIconName, danger: true },
          ].map((item, i) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                s.row,
                {
                  borderBottomColor: colors.borderDefault,
                  borderBottomWidth: i === 0 ? 1 : 0,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View
                style={[s.rowIcon, { backgroundColor: item.danger ? "#FEF3F2" : colors.bgSubtle }]}
              >
                <LumenIcon
                  name={item.icon}
                  size="sm"
                  color={item.danger ? "#F04438" : colors.textSecondary}
                  strokeWidth={2}
                />
              </View>
              <Text
                style={[
                  TextStyles.bodyMedium,
                  { color: item.danger ? "#F04438" : colors.textPrimary, flex: 1 },
                ]}
              >
                {item.label}
              </Text>
              <LumenIcon
                name="chevronRight"
                size="sm"
                color={item.danger ? "#F04438" : colors.textTertiary}
                strokeWidth={2}
              />
            </Pressable>
          ))}
        </Card>

        <View style={{ height: Spacing[10] }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[5],
    paddingTop: 52,
    paddingBottom: Spacing[4],
    borderBottomWidth: 1,
  },
  scroll: { padding: Spacing[5] },
  sectionLabel: { marginBottom: Spacing[2], marginTop: Spacing[2] },
  card: { borderRadius: Radius["2xl"], overflow: "hidden", marginBottom: Spacing[5] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[4],
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: { flex: 1 },
});

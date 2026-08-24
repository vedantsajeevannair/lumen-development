// ============================================================
// LUMEN — Help Screen (Citizen)
// Phase 3: Citizen Experience
// ============================================================
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  LayoutAnimation,
} from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Card } from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";
import { TextStyles, Spacing, Radius } from "@/design-system/tokens";

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    q: "How do I report a civic issue?",
    a: "Tap the '+' button on your dashboard or go to 'Report an Issue'. Select the category, drop a location pin, add a description and photos, then submit. You'll get a tracking ID immediately.",
  },
  {
    q: "How long does it take to resolve an issue?",
    a: "Resolution time depends on issue priority. High-priority issues (fire, electricity) are typically addressed within 4-6 hours. Standard issues take 24-72 hours. You'll receive status updates throughout.",
  },
  {
    q: "Can I track the progress of my report?",
    a: "Yes! Go to 'My Reports' to see real-time progress, assigned engineer details, and a step-by-step resolution timeline for all your submitted reports.",
  },
  {
    q: "What happens after I submit a report?",
    a: "Your report is reviewed by the relevant department within 2 hours. An engineer is then assigned and you'll be notified at every step — assignment, start of work, and completion.",
  },
  {
    q: "Can I submit anonymous reports?",
    a: "Yes, during submission you can toggle 'Submit Anonymously'. Your identity will be hidden, but you'll still receive status notifications if you're logged in.",
  },
  {
    q: "How do I update or delete a submitted report?",
    a: "Go to 'My Reports', open the report, and tap the edit icon. You can update photos or description before it's assigned to an engineer. After assignment, contact support to modify.",
  },
];

export default function HelpScreen() {
  const { colors, isDark, shadows } = useTheme();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIdx((prev) => (prev === i ? null : i));
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
        <Text style={[TextStyles.title, { color: colors.textPrimary }]}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View
          style={[
            s.heroCard,
            { backgroundColor: colors.brandSoft, borderColor: colors.brandBorder },
          ]}
        >
          <LumenIcon name="help" size="xl" color={colors.brand} strokeWidth={1.5} />
          <Text style={[TextStyles.title, { color: colors.textPrimary }]}>How can we help?</Text>
          <Text style={[TextStyles.body, { color: colors.textSecondary, textAlign: "center" }]}>
            Find answers to common questions or reach our support team.
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={s.quickRow}>
          {[
            { icon: "comment", label: "Live Chat", color: "#208AEF" },
            { icon: "email", label: "Email Us", color: "#7C3AED" },
            { icon: "phone", label: "Call Support", color: "#12B76A" },
          ].map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [
                s.quickBtn,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderDefault,
                  ...shadows.sm,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[s.quickIcon, { backgroundColor: action.color + "15" }]}>
                <LumenIcon
                  name={action.icon as any}
                  size="md"
                  color={action.color}
                  strokeWidth={2}
                />
              </View>
              <Text
                style={[TextStyles.bodySmall, { color: colors.textPrimary, fontWeight: "600" }]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* FAQ Accordion */}
        <Text
          style={[TextStyles.subtitle, { color: colors.textPrimary, marginBottom: Spacing[4] }]}
        >
          Frequently Asked Questions
        </Text>
        <View style={s.faqList}>
          {FAQS.map((faq, i) => {
            const open = openIdx === i;
            return (
              <Card key={i} variant="elevated" padding={0} style={s.faqCard}>
                <Pressable
                  style={[
                    s.faqQ,
                    { borderBottomColor: colors.borderDefault, borderBottomWidth: open ? 1 : 0 },
                  ]}
                  onPress={() => toggle(i)}
                >
                  <Text style={[TextStyles.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
                    {faq.q}
                  </Text>
                  <LumenIcon
                    name={open ? "chevronUp" : "chevronDown"}
                    size="sm"
                    color={colors.textTertiary}
                    strokeWidth={2}
                  />
                </Pressable>
                {open && (
                  <View style={s.faqA}>
                    <Text style={[TextStyles.body, { color: colors.textSecondary }]}>{faq.a}</Text>
                  </View>
                )}
              </Card>
            );
          })}
        </View>

        {/* Emergency */}
        <Card variant="glass" style={s.emergencyCard}>
          <View style={s.emergencyRow}>
            <View style={[s.emergencyIcon, { backgroundColor: "#FEF3F2" }]}>
              <LumenIcon name="emergency" size="lg" color="#F04438" strokeWidth={2} />
            </View>
            <View style={s.emergencyInfo}>
              <Text style={[TextStyles.subtitle, { color: colors.textPrimary }]}>Emergency?</Text>
              <Text style={[TextStyles.bodySmall, { color: colors.textSecondary }]}>
                For life-threatening situations, call emergency services immediately.
              </Text>
            </View>
          </View>
          <Button
            label="Call Emergency: 112"
            variant="danger"
            size="md"
            fullWidth
            iconLeft="phone"
            onPress={() => {}}
          />
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
  heroCard: {
    borderRadius: Radius["3xl"],
    borderWidth: 1,
    alignItems: "center",
    padding: Spacing[8],
    gap: Spacing[3],
    marginBottom: Spacing[6],
  },
  quickRow: { flexDirection: "row", gap: Spacing[3], marginBottom: Spacing[6] },
  quickBtn: {
    flex: 1,
    alignItems: "center",
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    padding: Spacing[4],
    gap: Spacing[2],
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  faqList: { gap: Spacing[3], marginBottom: Spacing[6] },
  faqCard: { borderRadius: Radius["2xl"], overflow: "hidden" },
  faqQ: { flexDirection: "row", alignItems: "center", gap: Spacing[4], padding: Spacing[4] },
  faqA: { padding: Spacing[5], paddingTop: Spacing[4] },
  emergencyCard: { gap: Spacing[5] },
  emergencyRow: { flexDirection: "row", gap: Spacing[4], alignItems: "flex-start" },
  emergencyIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyInfo: { flex: 1, gap: 4 },
});

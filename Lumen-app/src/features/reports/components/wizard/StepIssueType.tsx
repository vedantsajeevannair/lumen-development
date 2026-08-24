import React from "react";
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from "react-native";
import { useTheme, LumenIcon, Button, Spacing, Radius, TextStyles } from "@/design-system";
import { WizardData } from "../../screens/CreateReportWizard";
import { ROUTING_RULES } from "../../application/RoutingEngine";

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export function StepIssueType({ data, updateData, onNext }: StepProps) {
  const { colors } = useTheme();
  const categories = ROUTING_RULES.map((r) => r.issueType);

  return (
    <View style={styles.container}>
      <Text
        style={[
          TextStyles.heading2,
          { color: colors.textPrimary, paddingHorizontal: Spacing[5], marginTop: Spacing[4] },
        ]}
      >
        What kind of issue are you reporting?
      </Text>
      <Text
        style={[
          TextStyles.body,
          {
            color: colors.textSecondary,
            paddingHorizontal: Spacing[5],
            marginTop: Spacing[2],
            marginBottom: Spacing[5],
          },
        ]}
      >
        Select the category that best fits the problem.
      </Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingHorizontal: Spacing[5], paddingBottom: Spacing[6] }}
      >
        {categories.map((cat) => {
          const isSelected = data.issueType === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.card,
                {
                  backgroundColor: colors.bgSurface,
                  marginBottom: Spacing[2],
                  borderRadius: Radius.md,
                },
                isSelected && { borderColor: colors.brand, backgroundColor: `${colors.brand}10` },
              ]}
              onPress={() => updateData({ issueType: cat })}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text
                  style={[
                    TextStyles.bodyMedium,
                    { color: colors.textPrimary },
                    isSelected && { color: colors.brand, fontWeight: "bold" },
                  ]}
                >
                  {cat}
                </Text>
                {isSelected && <LumenIcon name="checkCircle" size="md" color={colors.brand} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.borderDefault }]}>
        <Button label="Continue" onPress={onNext} disabled={!data.issueType} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footer: { padding: 16, borderTopWidth: 1 },
});

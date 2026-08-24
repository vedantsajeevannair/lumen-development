import React from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useTheme, LumenIcon, Button, Spacing, Radius, TextStyles } from "@/design-system";
import { WizardData } from "../../screens/CreateReportWizard";
import { RoutingEngine } from "../../application/RoutingEngine";

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export function StepPriority({ data, updateData, onNext }: StepProps) {
  const { colors } = useTheme();

  const priorities = [
    {
      id: "low",
      label: "Low",
      desc: "No immediate danger or major inconvenience.",
      color: "#0BA5EC",
    },
    {
      id: "medium",
      label: "Medium",
      desc: "Causes inconvenience but not dangerous.",
      color: "#F79009",
    },
    {
      id: "high",
      label: "High",
      desc: "Significant disruption to services or traffic.",
      color: "#F04438",
    },
    {
      id: "critical",
      label: "Critical",
      desc: "Immediate danger to life or property.",
      color: "#7A271A",
    },
  ] as const;

  const defaultMapping = RoutingEngine.determineRouting(data.issueType);
  const suggestedPriority = defaultMapping.defaultPriority;

  return (
    <View style={styles.container}>
      <Text
        style={[
          TextStyles.heading2,
          { color: colors.textPrimary, paddingHorizontal: Spacing[5], marginTop: Spacing[4] },
        ]}
      >
        Set Priority
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
        Our system suggested '{suggestedPriority}' based on the issue type, but you can override it
        if needed.
      </Text>

      <View style={[styles.content, { paddingHorizontal: Spacing[5] }]}>
        {priorities.map((p) => {
          const isSelected = data.priority === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.bgSurface,
                  borderRadius: Radius.md,
                  marginBottom: Spacing[4],
                },
                isSelected && { borderColor: p.color, backgroundColor: `${p.color}10` },
              ]}
              onPress={() => updateData({ priority: p.id })}
              activeOpacity={0.7}
            >
              <View style={[styles.cardHeader, { marginBottom: Spacing[1] }]}>
                <View style={[styles.headerLeft, { gap: Spacing[2] }]}>
                  <LumenIcon name="alert" size="sm" color={p.color} />
                  <Text
                    style={[
                      TextStyles.bodyMedium,
                      { color: colors.textPrimary, textTransform: "capitalize" },
                      isSelected && { color: p.color, fontWeight: "bold" },
                    ]}
                  >
                    {p.label} {suggestedPriority === p.id && "(Suggested)"}
                  </Text>
                </View>
                {isSelected && <LumenIcon name="checkCircle" size="sm" color={p.color} />}
              </View>
              <Text
                style={[TextStyles.bodySmall, { color: colors.textSecondary, paddingLeft: 28 }]}
              >
                {p.desc}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.footer, { padding: Spacing[5], borderTopColor: colors.borderDefault }]}>
        <Button label="Review Report" onPress={onNext} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  footer: { borderTopWidth: 1 },
});

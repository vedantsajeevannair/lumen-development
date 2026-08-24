import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import { useTheme, LumenIcon, Button, Spacing, Radius, TextStyles } from "@/design-system";
import { WizardData } from "../../screens/CreateReportWizard";
import { RoutingEngine } from "../../application/RoutingEngine";

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export function StepAiSuggestion({ data, updateData, onNext }: StepProps) {
  const { colors } = useTheme();
  const [analyzing, setAnalyzing] = useState(true);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    const runAnalysis = async () => {
      setAnalyzing(true);
      try {
        const result = await RoutingEngine.mockAiCategorySuggestion(data.issueType);
        setSuggestion(result.issueType);
        updateData({ aiSuggestedCategory: result.issueType });
      } catch (e) {
        console.error("AI Error:", e);
      } finally {
        setAnalyzing(false);
      }
    };
    runAnalysis();
  }, [data.issueType]);

  return (
    <View style={styles.container}>
      <Text
        style={[
          TextStyles.heading2,
          { color: colors.textPrimary, paddingHorizontal: Spacing[5], marginTop: Spacing[4] },
        ]}
      >
        LUMEN AI Analysis
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
        We use AI to route your issue to the correct department automatically.
      </Text>

      <View style={[styles.content, { padding: Spacing[5] }]}>
        {analyzing ? (
          <View
            style={[
              styles.centerCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderDefault,
                borderRadius: Radius.lg,
              },
            ]}
          >
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={[TextStyles.body, { color: colors.textSecondary, marginTop: Spacing[4] }]}>
              Analyzing report metadata...
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.centerCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderDefault,
                borderRadius: Radius.lg,
              },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: `${colors.brand}15`, marginBottom: Spacing[4] },
              ]}
            >
              <LumenIcon name="circle" size="md" color={colors.brand} />
            </View>
            <Text
              style={[
                TextStyles.bodySmall,
                { color: colors.textSecondary, textTransform: "uppercase" },
              ]}
            >
              Suggested Category
            </Text>
            <Text
              style={[
                TextStyles.title,
                { color: colors.brand, marginTop: Spacing[1], marginBottom: Spacing[2] },
              ]}
            >
              {suggestion}
            </Text>
            <Text style={[TextStyles.body, { color: colors.textSecondary, textAlign: "center" }]}>
              This matches your manual selection of "{data.issueType}". This will be routed to the
              appropriate department.
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.borderDefault, padding: Spacing[5] }]}>
        <Button
          label={analyzing ? "Analyzing..." : "Confirm & Continue"}
          onPress={onNext}
          disabled={analyzing}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center" },
  centerCard: {
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { borderTopWidth: 1 },
});

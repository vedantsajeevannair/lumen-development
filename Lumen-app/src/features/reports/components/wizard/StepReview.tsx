import React, { useState } from "react";
import { Image } from "expo-image";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { useTheme, LumenIcon, Button, Spacing, Radius, TextStyles } from "@/design-system";
import { WizardData } from "../../screens/CreateReportWizard";
import { RoutingEngine } from "../../application/RoutingEngine";

interface StepProps {
  data: WizardData;
  onSubmit: () => Promise<void>;
}

export function StepReview({ data, onSubmit }: StepProps) {
  const { colors } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mapping = RoutingEngine.determineRouting(data.issueType);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text
        style={[
          TextStyles.heading2,
          { color: colors.textPrimary, paddingHorizontal: Spacing[5], marginTop: Spacing[4] },
        ]}
      >
        Review & Submit
      </Text>
      <Text
        style={[
          TextStyles.body,
          {
            color: colors.textSecondary,
            paddingHorizontal: Spacing[5],
            marginTop: Spacing[2],
            marginBottom: Spacing[4],
          },
        ]}
      >
        Ensure all details are correct before sending this to the{" "}
        {mapping.department.replace(/_/g, " ")}.
      </Text>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingHorizontal: Spacing[5], paddingBottom: Spacing[6] }}
      >
        <View style={{ marginBottom: Spacing[5] }}>
          <Text
            style={[
              TextStyles.bodyMedium,
              { fontWeight: "bold", color: colors.textPrimary, marginBottom: Spacing[2] },
            ]}
          >
            Location
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderDefault,
                borderRadius: Radius.md,
              },
            ]}
          >
            <View style={[styles.row, { gap: Spacing[2] }]}>
              <LumenIcon name="map" size="sm" color={colors.brand} />
              <Text
                style={[TextStyles.body, { color: colors.textPrimary, flex: 1 }]}
                numberOfLines={2}
              >
                {data.location?.address}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ marginBottom: Spacing[5] }}>
          <Text
            style={[
              TextStyles.bodyMedium,
              { fontWeight: "bold", color: colors.textPrimary, marginBottom: Spacing[2] },
            ]}
          >
            Issue Details
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderDefault,
                borderRadius: Radius.md,
              },
            ]}
          >
            <View style={[styles.row, { gap: Spacing[2] }]}>
              <Text style={[styles.label, TextStyles.bodySmall, { color: colors.textSecondary }]}>
                Type:
              </Text>
              <Text style={[TextStyles.body, { color: colors.textPrimary, flex: 1 }]}>
                {data.issueType}
              </Text>
            </View>
            <View
              style={[
                styles.divider,
                { backgroundColor: colors.borderDefault, marginVertical: Spacing[2] },
              ]}
            />
            <View style={[styles.row, { gap: Spacing[2] }]}>
              <Text style={[styles.label, TextStyles.bodySmall, { color: colors.textSecondary }]}>
                Priority:
              </Text>
              <Text
                style={[
                  TextStyles.body,
                  { color: colors.textPrimary, flex: 1, textTransform: "capitalize" },
                ]}
              >
                {data.priority}
              </Text>
            </View>
            <View
              style={[
                styles.divider,
                { backgroundColor: colors.borderDefault, marginVertical: Spacing[2] },
              ]}
            />
            <View style={styles.column}>
              <Text style={[styles.label, TextStyles.bodySmall, { color: colors.textSecondary }]}>
                Description:
              </Text>
              <Text style={[TextStyles.body, { color: colors.textPrimary, marginTop: Spacing[1] }]}>
                {data.description.written || "No written description provided."}
              </Text>
            </View>
          </View>
        </View>

        {data.media.length > 0 && (
          <View style={{ marginBottom: Spacing[5] }}>
            <Text
              style={[
                TextStyles.bodyMedium,
                { fontWeight: "bold", color: colors.textPrimary, marginBottom: Spacing[2] },
              ]}
            >
              Evidence ({data.media.length})
            </Text>
            <View style={[styles.mediaRow, { gap: Spacing[2] }]}>
              {data.media.map((m, i) => (
                <Image
                  key={i}
                  source={{ uri: m.uri }}
                  style={[styles.thumbnail, { borderRadius: Radius.sm }]}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { padding: Spacing[5], borderTopColor: colors.borderDefault }]}>
        <Button
          label={isSubmitting ? "Submitting Report..." : "Submit Report"}
          onPress={handleSubmit}
          disabled={isSubmitting}
          fullWidth
        />
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
  },
  row: { flexDirection: "row", alignItems: "center" },
  column: { flexDirection: "column" },
  divider: { height: 1 },
  label: { width: 80 },
  mediaRow: { flexDirection: "row", flexWrap: "wrap" },
  thumbnail: { width: 64, height: 64 },
  footer: { borderTopWidth: 1 },
});

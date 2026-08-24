import React from "react";
import { View, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { useTheme, LumenIcon, Button, Spacing, Radius, TextStyles } from "@/design-system";
import { WizardData } from "../../screens/CreateReportWizard";

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export function StepDescription({ data, updateData, onNext }: StepProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text
        style={[
          TextStyles.heading2,
          { color: colors.textPrimary, paddingHorizontal: Spacing[5], marginTop: Spacing[4] },
        ]}
      >
        Describe the issue
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
        Provide any extra details that might help the department resolve this faster.
      </Text>

      <View style={[styles.content, { paddingHorizontal: Spacing[5] }]}>
        <TextInput
          style={[
            styles.textInput,
            TextStyles.bodyMedium,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
              borderRadius: Radius.md,
              color: colors.textPrimary,
              padding: Spacing[4],
            },
          ]}
          multiline
          placeholder="E.g., The pipe burst yesterday and water is flooding the street..."
          placeholderTextColor={colors.textTertiary}
          value={data.description.written}
          onChangeText={(text) =>
            updateData({ description: { ...data.description, written: text } })
          }
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[
            styles.voiceBtn,
            {
              backgroundColor: `${colors.brand}10`,
              borderRadius: Radius.md,
              padding: Spacing[4],
              marginTop: Spacing[5],
            },
          ]}
        >
          <LumenIcon name="circle" size="md" color={colors.brand} />
          <Text
            style={[
              TextStyles.body,
              { color: colors.brand, fontWeight: "bold", marginLeft: Spacing[2] },
            ]}
          >
            Record Voice Description
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.footer, { padding: Spacing[5], borderTopColor: colors.borderDefault }]}>
        <Button
          label={data.description.written.length > 5 ? "Continue" : "Skip"}
          variant={data.description.written.length > 5 ? "primary" : "outline"}
          onPress={onNext}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  textInput: {
    borderWidth: 1,
    height: 160,
  },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { borderTopWidth: 1 },
});

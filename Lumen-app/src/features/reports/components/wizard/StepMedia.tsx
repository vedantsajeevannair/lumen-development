import React from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useTheme, LumenIcon, Button, Spacing, Radius, TextStyles } from "@/design-system";
import { WizardData } from "../../screens/CreateReportWizard";
import * as ImagePicker from "expo-image-picker";

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export function StepMedia({ data, updateData, onNext }: StepProps) {
  const { colors } = useTheme();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      updateData({
        media: [...data.media, { uri: result.assets[0].uri, type: "image" }],
      });
    }
  };

  const removeMedia = (index: number) => {
    const newMedia = [...data.media];
    newMedia.splice(index, 1);
    updateData({ media: newMedia });
  };

  return (
    <View style={styles.container}>
      <Text
        style={[
          TextStyles.heading2,
          { color: colors.textPrimary, paddingHorizontal: Spacing[5], marginTop: Spacing[4] },
        ]}
      >
        Add Evidence
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
        Upload photos or videos of the issue. (Optional but recommended)
      </Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing[5] }}>
        <View style={styles.mediaGrid}>
          {data.media.map((item, index) => (
            <View key={index} style={[styles.mediaContainer, { borderRadius: Radius.md }]}>
              <Image source={{ uri: item.uri }} style={styles.mediaPreview} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeMedia(index)}>
                <LumenIcon name="circle" size="sm" color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}

          {data.media.length < 4 && (
            <TouchableOpacity
              style={[
                styles.uploadBtn,
                {
                  borderRadius: Radius.md,
                  borderColor: colors.borderDefault,
                  backgroundColor: `${colors.brand}05`,
                },
              ]}
              onPress={pickImage}
            >
              <LumenIcon name="camera" size="lg" color={colors.brand} />
              <Text style={[TextStyles.bodySmall, { color: colors.brand, marginTop: Spacing[2] }]}>
                Add Photo
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.borderDefault, padding: Spacing[5] }]}>
        <Button
          label={data.media.length > 0 ? "Continue" : "Skip for now"}
          variant={data.media.length > 0 ? "primary" : "outline"}
          onPress={onNext}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  mediaContainer: {
    width: "47%",
    aspectRatio: 1,
    overflow: "hidden",
  },
  mediaPreview: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#F04438",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtn: {
    width: "47%",
    aspectRatio: 1,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { borderTopWidth: 1 },
});

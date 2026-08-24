import { useTheme } from "@/design-system/ThemeContext";
import { Button } from "@/design-system/components/Button";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Radius, Spacing, TextStyles } from "@/design-system/tokens";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, View, Text, StyleSheet, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/AuthStore";
import { apiClient, queryClient } from "@/services/api.client";
import * as ImagePicker from "expo-image-picker";

export default function IdentityVerificationScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore((s) => s);
  const [submitting, setSubmitting] = useState(false);
  const [docType, setDocType] = useState<"PASSPORT" | "NATIONAL_ID" | "DRIVERS_LICENSE">(
    "PASSPORT"
  );
  const [idImage, setIdImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [status, setStatus] = useState<"UNVERIFIED" | "PENDING" | "VERIFIED">(
    (user as any)?.verificationStatus || "UNVERIFIED"
  );

  const handleSelectImage = async (type: "id" | "selfie") => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (type === "id") {
        setIdImage(result.assets[0].uri);
      } else {
        setSelfieImage(result.assets[0].uri);
      }
    }
  };

  const handleSubmit = async () => {
    if (!idImage || !selfieImage) {
      Alert.alert("Required", "Please upload both your ID document and a Selfie.");
      return;
    }

    setSubmitting(true);
    try {
      const uploadSingleImage = async (uri: string) => {
        const filename = uri.split("/").pop() || "document.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `image/${match[1]}` : `image/jpeg`;

        const formData = new FormData();
        formData.append("file", { uri, name: filename, type: fileType } as any);

        const uploadResponse = await apiClient.post("/storage/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const finalUrl = uploadResponse.data.imageUrl || uploadResponse.data.url;
        if (!finalUrl) throw new Error("Failed to get uploaded document URL");
        return finalUrl;
      };

      // 1. Upload both images concurrently
      const [idDocumentUrl, selfieUrl] = await Promise.all([
        uploadSingleImage(idImage),
        uploadSingleImage(selfieImage),
      ]);

      // 2. Submit to verify-identity
      await apiClient.post("/api/v1/citizen/verify-identity", {
        documentType: docType,
        documents: { idDocumentUrl, selfieUrl },
      });

      // 3. Update local auth state so frontend reflects verified status
      const session = useAuthStore.getState().session;
      if (session) {
        useAuthStore.getState().setSession({
          ...session,
          user: {
            ...session.user,
            verificationStatus: "VERIFIED",
            isVerified: true,
          },
        });
      }

      // 4. Invalidate dashboard query to update Quick Actions
      queryClient.invalidateQueries({ queryKey: ["citizen-dashboard"] });

      setStatus("VERIFIED");
      Alert.alert("Success", "Identity verified successfully! You now have full access.");
    } catch (e: any) {
      Alert.alert(
        "Verification Failed",
        e.response?.data?.message || e.message || "Failed to verify identity"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgBase, padding: Spacing[6] },
    header: { marginBottom: Spacing[6], alignItems: "center" },
    title: { ...TextStyles.heading2, color: colors.textPrimary, marginTop: Spacing[4] },
    subtitle: {
      ...TextStyles.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: Spacing[2],
    },
    card: {
      backgroundColor: colors.bgSurfaceRaised,
      borderRadius: Radius.lg,
      padding: Spacing[6],
      borderWidth: 1,
      borderColor: colors.borderDefault,
      alignItems: "center",
      marginBottom: Spacing[6],
    },
    statusText: {
      ...TextStyles.title,
      color: colors.textPrimary,
      marginTop: Spacing[4],
    },
    buttonContainer: { marginTop: "auto" },
    selectorContainer: {
      marginBottom: Spacing[6],
    },
    chipsRow: {
      flexDirection: "row",
      gap: Spacing[2],
      flexWrap: "wrap",
      marginTop: 8,
    },
    chip: {
      paddingHorizontal: Spacing[4],
      paddingVertical: Spacing[2],
      borderRadius: Radius.full,
      borderWidth: 1,
    },
    chipText: {
      ...TextStyles.bodySmall,
      fontWeight: "600",
    },
    uploadGrid: {
      flexDirection: "row",
      gap: Spacing[4],
      marginBottom: Spacing[6],
    },
    uploadCol: {
      flex: 1,
    },
    uploadLabel: {
      ...TextStyles.bodySmall,
      color: colors.textPrimary,
      fontWeight: "700",
      marginBottom: Spacing[2],
    },
    uploadBox: {
      backgroundColor: colors.bgSurface,
      borderColor: colors.borderDefault,
      borderWidth: 1,
      borderStyle: "dashed",
      borderRadius: Radius.md,
      padding: Spacing[3],
      alignItems: "center",
      justifyContent: "center",
      minHeight: 140,
    },
    uploadPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing[4],
    },
    clearBtn: {
      position: "absolute",
      top: 4,
      right: 4,
      backgroundColor: "rgba(0,0,0,0.6)",
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
  });

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: status === "VERIFIED" ? colors.successBg : colors.brandSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LumenIcon
            name={status === "VERIFIED" ? "success" : "profile"}
            color={status === "VERIFIED" ? colors.successText : colors.textBrand}
            size="xl"
          />
        </View>
        <Text style={s.title}>Identity Verification</Text>
        <Text style={s.subtitle}>
          Verify your identity to unlock advanced civic features and ensure trust in the community.
        </Text>
      </View>

      {status === "VERIFIED" ? (
        <View style={s.card}>
          <LumenIcon name="success" color={colors.successText} size="2xl" />
          <Text style={s.statusText}>Status: VERIFIED</Text>
          <Text style={[s.subtitle, { marginTop: Spacing[4] }]}>
            Your identity is verified. You now have full access to LUMEN civic features.
          </Text>
        </View>
      ) : (
        <>
          <View style={s.selectorContainer}>
            <Text style={[TextStyles.bodyMedium, { color: colors.textPrimary, fontWeight: "600" }]}>
              Select Document Type
            </Text>
            <View style={s.chipsRow}>
              {(["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE"] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setDocType(type)}
                  style={[
                    s.chip,
                    docType === type
                      ? { backgroundColor: colors.brand, borderColor: colors.brand }
                      : { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
                  ]}
                >
                  <Text
                    style={[
                      s.chipText,
                      docType === type ? { color: "#FFFFFF" } : { color: colors.textSecondary },
                    ]}
                  >
                    {type.replace("_", " ")}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={s.uploadGrid}>
            <View style={s.uploadCol}>
              <Text style={s.uploadLabel}>1. Document Photo</Text>
              <View style={s.uploadBox}>
                {idImage ? (
                  <View style={{ width: "100%", height: 110, position: "relative" }}>
                    <Image
                      source={{ uri: idImage }}
                      style={{ width: "100%", height: "100%", borderRadius: Radius.md }}
                    />
                    <Pressable onPress={() => setIdImage(null)} style={s.clearBtn}>
                      <LumenIcon name="close" size="xs" color="#FFF" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => handleSelectImage("id")} style={s.uploadPlaceholder}>
                    <LumenIcon name="camera" size="xl" color={colors.textSecondary} />
                    <Text
                      style={[
                        TextStyles.bodySmall,
                        { color: colors.textSecondary, marginTop: Spacing[2], textAlign: "center" },
                      ]}
                    >
                      Upload ID
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={s.uploadCol}>
              <Text style={s.uploadLabel}>2. Clear Selfie</Text>
              <View style={s.uploadBox}>
                {selfieImage ? (
                  <View style={{ width: "100%", height: 110, position: "relative" }}>
                    <Image
                      source={{ uri: selfieImage }}
                      style={{ width: "100%", height: "100%", borderRadius: Radius.md }}
                    />
                    <Pressable onPress={() => setSelfieImage(null)} style={s.clearBtn}>
                      <LumenIcon name="close" size="xs" color="#FFF" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleSelectImage("selfie")}
                    style={s.uploadPlaceholder}
                  >
                    <LumenIcon name="profile" size="xl" color={colors.textSecondary} />
                    <Text
                      style={[
                        TextStyles.bodySmall,
                        { color: colors.textSecondary, marginTop: Spacing[2], textAlign: "center" },
                      ]}
                    >
                      Upload Selfie
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </>
      )}

      <View style={s.buttonContainer}>
        {status === "UNVERIFIED" && (
          <Button
            label="Submit Verification"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!idImage || !selfieImage}
            variant="primary"
          />
        )}
        <View style={{ marginTop: Spacing[4] }}>
          <Button label="Back to Dashboard" onPress={() => router.back()} variant="outline" />
        </View>
      </View>
    </SafeAreaView>
  );
}

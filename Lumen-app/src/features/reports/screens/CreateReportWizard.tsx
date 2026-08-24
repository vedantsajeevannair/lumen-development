import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  Alert,
  BackHandler,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiView, AnimatePresence } from "moti";
import { useTheme, LumenIcon, Spacing, TextStyles } from "@/design-system";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { useQueryClient } from "@tanstack/react-query";
import { ComplaintsService } from "@/services/complaints.service";

// Wizard Steps
import {
  StepIssueType,
  StepAiSuggestion,
  StepLocation,
  StepMedia,
  StepDescription,
  StepPriority,
  StepReview,
} from "../components/wizard";

export type WizardData = {
  issueType: string;
  aiSuggestedCategory: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    accuracy?: number;
    capturedAt?: string;
  } | null;
  media: { uri: string; type: "image" | "video" }[];
  description: { written: string; voiceUrl?: string };
  priority: "low" | "medium" | "high" | "critical";
};

const TOTAL_STEPS = 7;

export default function CreateReportWizard() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    issueType: "",
    aiSuggestedCategory: "",
    location: null,
    media: [],
    description: { written: "" },
    priority: "medium",
  });

  const [permissionState, setPermissionState] = useState<
    "checking" | "granted" | "denied" | "undetermined" | "blocked" | "disabled"
  >("checking");
  const [submitted, setSubmitted] = useState(false);
  const [createdReport, setCreatedReport] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submittedRef = useRef(submitted);
  submittedRef.current = submitted;

  useFocusEffect(
    useCallback(() => {
      if (submittedRef.current) {
        setSubmitted(false);
        setCurrentStep(1);
        setData({
          issueType: "",
          aiSuggestedCategory: "",
          location: null,
          media: [],
          description: { written: "" },
          priority: "medium",
        });
        setCreatedReport(null);
      }
    }, [])
  );

  useEffect(() => {
    checkLocationPermissions();
  }, []);

  useEffect(() => {
    const handleBackPress = () => {
      if (submitted) {
        router.replace("/(citizen)/My-report");
        return true;
      }
      if (permissionState !== "granted") {
        router.replace("/(citizen)/Dashboard");
        return true;
      }
      if (currentStep > 1) {
        prevStep();
        return true;
      }
      router.replace("/(citizen)/Dashboard");
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => {
      if (backHandler && typeof backHandler.remove === "function") {
        backHandler.remove();
      } else {
        (BackHandler as any).removeEventListener("hardwareBackPress", handleBackPress);
      }
    };
  }, [currentStep, submitted, permissionState]);

  const checkLocationPermissions = async () => {
    try {
      setPermissionState("checking");
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        setPermissionState("disabled");
        return;
      }

      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status === "granted") {
        await acquireLocation();
      } else if (perm.status === "denied" && !perm.canAskAgain) {
        setPermissionState("blocked");
      } else if (perm.status === "denied") {
        setPermissionState("denied");
      } else {
        setPermissionState("undetermined");
      }
    } catch (e) {
      setPermissionState("undetermined");
    }
  };

  const requestPermission = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === "granted") {
        await acquireLocation();
      } else if (!perm.canAskAgain) {
        setPermissionState("blocked");
      } else {
        setPermissionState("denied");
      }
    } catch (e) {
      setPermissionState("denied");
    }
  };

  const acquireLocation = async () => {
    try {
      setPermissionState("checking");
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.LocationAccuracy.High,
      });
      setData((prev) => ({
        ...prev,
        location: {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy || 0,
          capturedAt: new Date(loc.timestamp).toISOString(),
          address: "Validating Location...",
        },
      }));
      setPermissionState("granted");

      Alert.alert("GPS Enabled", "GPS location is already enabled! Now you can submit the report.");
    } catch (e) {
      setPermissionState("denied");
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    if (!data.media || data.media.length === 0) {
      Alert.alert("Required", "An image is required to submit a complaint.");
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUri = data.media[0].uri;
      const filename = imageUri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      const formData = new FormData();
      formData.append("file", { uri: imageUri, name: filename, type } as any);

      console.log("[REPORT] Uploading image...");
      const uploadResponse = await ComplaintsService.uploadImage(formData);
      const finalImageUrl = uploadResponse.imageUrl || uploadResponse.url;

      if (!finalImageUrl) throw new Error("Failed to get uploaded image URL");

      const payload = {
        title: `Report - ${data.issueType}`,
        description: data.description.written,
        category: data.issueType.toUpperCase(),
        priority: data.priority.toUpperCase(),
        latitude: data.location?.latitude,
        longitude: data.location?.longitude,
        accuracy: data.location?.accuracy,
        capturedAt: data.location?.capturedAt,
        isAnonymous: false,
        imageUrl: finalImageUrl,
      };

      console.log("[REPORT] Submitting to backend...");
      const createResult = await ComplaintsService.create(payload as any);

      queryClient.invalidateQueries({ queryKey: ["citizen-complaints"] });
      queryClient.invalidateQueries({ queryKey: ["citizen-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["nearby-complaints"] });

      setCreatedReport(createResult);
      setSubmitted(true);
    } catch (e: any) {
      console.error("[REPORT] Submission failed:", e);
      const errorMessage = e.response?.data?.message || e.message || "Failed to submit report";

      // If the error is an AI validation error, offer a "Retake Photo" button
      if (
        errorMessage.includes("blurry") ||
        errorMessage.includes("identified clearly") ||
        errorMessage.includes("match the selected issue")
      ) {
        Alert.alert("Image Validation Failed", errorMessage, [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Retake Photo",
            onPress: () => setCurrentStep(4), // StepMedia is step 4
            style: "default",
          },
        ]);
      } else {
        Alert.alert("Submission Failed", errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepIssueType data={data} updateData={updateData} onNext={nextStep} />;
      case 2:
        return <StepAiSuggestion data={data} updateData={updateData} onNext={nextStep} />;
      case 3:
        return <StepLocation data={data} updateData={updateData} onNext={nextStep} />;
      case 4:
        return <StepMedia data={data} updateData={updateData} onNext={nextStep} />;
      case 5:
        return <StepDescription data={data} updateData={updateData} onNext={nextStep} />;
      case 6:
        return <StepPriority data={data} updateData={updateData} onNext={nextStep} />;
      case 7:
        return (
          <View style={{ flex: 1 }}>
            <StepReview data={data} onSubmit={handleSubmit} />
            {isSubmitting && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: "rgba(0,0,0,0.5)",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <ActivityIndicator size="large" color="#FFF" />
                <Text style={{ color: "#FFF", marginTop: 10, fontWeight: "bold" }}>
                  Submitting...
                </Text>
              </View>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bgBase, padding: Spacing[5] }]}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#DCFCE7",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <LumenIcon name="check" size="xl" color="#15803D" />
          </View>
          <Text
            style={{ fontSize: 28, fontWeight: "800", color: colors.textPrimary, marginBottom: 10 }}
          >
            Report Submitted!
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: colors.textSecondary,
              textAlign: "center",
              marginBottom: 30,
            }}
          >
            Your tracking ID is{" "}
            <Text style={{ fontWeight: "bold", color: colors.textPrimary }}>
              {createdReport?.trackingId}
            </Text>
            . We will notify you of any updates.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.brand,
              paddingHorizontal: 30,
              paddingVertical: 15,
              borderRadius: 12,
              marginBottom: 15,
              width: "100%",
            }}
            onPress={() =>
              router.replace({
                pathname: "/(citizen)/Report-details",
                params: { id: createdReport?.id },
              } as any)
            }
          >
            <Text style={{ color: "white", fontWeight: "bold", textAlign: "center", fontSize: 16 }}>
              View Report
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ padding: 15 }}
            onPress={() => router.replace("/(citizen)/My-report")}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontWeight: "600",
                textAlign: "center",
                fontSize: 16,
              }}
            >
              Back to My Reports
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (permissionState !== "granted") {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.bgBase,
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          },
        ]}
      >
        <LumenIcon name="mapPin" size="xl" color={colors.brand} />
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            marginVertical: 20,
            color: colors.textPrimary,
            textAlign: "center",
          }}
        >
          Location Required
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: "center",
            marginBottom: 30,
          }}
        >
          {permissionState === "disabled"
            ? "Device GPS services are disabled. Please enable them to continue."
            : permissionState === "blocked"
              ? "Location permission was denied permanently. Please open settings."
              : "We need your precise location to register this complaint correctly with the city."}
        </Text>
        {permissionState === "checking" && (
          <ActivityIndicator size="large" color={colors.brand} style={{ marginBottom: 20 }} />
        )}

        {["denied", "undetermined"].includes(permissionState) && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.brand,
              paddingHorizontal: 30,
              paddingVertical: 15,
              borderRadius: 12,
              marginBottom: 15,
              width: "100%",
            }}
            onPress={requestPermission}
          >
            <Text style={{ color: "white", fontWeight: "bold", textAlign: "center", fontSize: 16 }}>
              Grant Permission
            </Text>
          </TouchableOpacity>
        )}

        {["blocked", "disabled"].includes(permissionState) && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.brand,
              paddingHorizontal: 30,
              paddingVertical: 15,
              borderRadius: 12,
              marginBottom: 15,
              width: "100%",
            }}
            onPress={() => Linking.openSettings()}
          >
            <Text style={{ color: "white", fontWeight: "bold", textAlign: "center", fontSize: 16 }}>
              Open Settings
            </Text>
          </TouchableOpacity>
        )}

        {["blocked", "disabled", "denied", "undetermined"].includes(permissionState) && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
              borderWidth: 1,
              paddingHorizontal: 30,
              paddingVertical: 15,
              borderRadius: 12,
              marginBottom: 15,
              width: "100%",
            }}
            onPress={checkLocationPermissions}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontWeight: "bold",
                textAlign: "center",
                fontSize: 16,
              }}
            >
              Re-check GPS Status
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{ padding: 15 }}
          onPress={() => router.replace("/(citizen)/Dashboard")}
        >
          <Text style={{ color: colors.textSecondary, fontWeight: "600", fontSize: 16 }}>
            Cancel
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const progress = currentStep / TOTAL_STEPS;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgBase }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: Spacing[5], paddingVertical: Spacing[4] }]}>
        <TouchableOpacity
          onPress={() => (currentStep === 1 ? router.replace("/(citizen)/Dashboard") : prevStep())}
          style={[styles.backButton, { backgroundColor: colors.bgSurface }]}
        >
          <LumenIcon name="chevronLeft" size="md" color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[TextStyles.title, { color: colors.textPrimary }]}>
          {currentStep === TOTAL_STEPS
            ? "Review & Submit"
            : `Step ${currentStep} of ${TOTAL_STEPS}`}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar */}
      <View
        style={[
          styles.progressContainer,
          {
            backgroundColor: colors.bgSurface,
            marginHorizontal: Spacing[5],
            marginBottom: Spacing[5],
          },
        ]}
      >
        <MotiView
          style={[styles.progressBar, { backgroundColor: colors.brand }]}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: "timing", duration: 300 }}
        />
      </View>

      {/* Form Content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <AnimatePresence exitBeforeEnter>
          <MotiView
            key={`step-${currentStep}`}
            from={{ opacity: 0, translateX: 20 }}
            animate={{ opacity: 1, translateX: 0 }}
            exit={{ opacity: 0, translateX: -20 }}
            transition={{ type: "timing", duration: 300 }}
            style={styles.stepContainer}
          >
            {renderStep()}
          </MotiView>
        </AnimatePresence>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingBottom: 100, // Make room for absolute BottomNavigation
  },
  stepContainer: {
    flex: 1,
  },
});

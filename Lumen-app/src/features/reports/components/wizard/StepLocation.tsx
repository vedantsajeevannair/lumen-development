import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, ActivityIndicator, Alert, TouchableOpacity, Linking } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { useTheme, Button, Spacing, Radius, TextStyles, LumenIcon } from "@/design-system";
import { WizardData } from "../../screens/CreateReportWizard";
import * as Location from "expo-location";

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

const DEFAULT_REGION = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export function StepLocation({ data, updateData, onNext }: StepProps) {
  const { colors } = useTheme();
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data.location) {
      setRegion({
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      setLoading(false);
    } else {
      checkAndAcquireGPS();
    }
  }, []);

  const handleRegionChangeComplete = async (newRegion: Region) => {
    setRegion(newRegion);
    let resolvedAddress = `${newRegion.latitude.toFixed(5)}, ${newRegion.longitude.toFixed(5)}`;
    try {
      const [rev] = await Location.reverseGeocodeAsync({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
      });
      if (rev) {
        const parts = [
          rev.streetNumber ? `${rev.streetNumber} ${rev.street || ""}`.trim() : (rev.street || rev.name || ""),
          rev.district || rev.subregion || "",
          rev.city || rev.region || "",
        ].filter(Boolean);
        if (parts.length > 0) {
          resolvedAddress = parts.join(", ");
        }
      }
    } catch {
      // Fallback to coordinates
    }

    updateData({
      location: {
        ...(data.location || { accuracy: 5, capturedAt: new Date().toISOString() }),
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
        address: resolvedAddress,
      },
    });
  };

  const checkAndAcquireGPS = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        setErrorMsg("GPS is disabled");
        Alert.alert("GPS Disabled", "Please enable GPS/Location services in your device settings.");
        setLoading(false);
        return;
      }

      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setErrorMsg("Permission denied");
        Alert.alert("Permission Denied", "LUMEN needs location permission to acquire your GPS.");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.LocationAccuracy.High,
      });

      let address = `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`;
      try {
        const [rev] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (rev) {
          const parts = [
            rev.streetNumber ? `${rev.streetNumber} ${rev.street || ""}`.trim() : (rev.street || rev.name || ""),
            rev.district || rev.subregion || "",
            rev.city || rev.region || "",
          ].filter(Boolean);
          if (parts.length > 0) {
            address = parts.join(", ");
          }
        }
      } catch {
        // Fallback to coordinates
      }

      updateData({
        location: {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy || 0,
          capturedAt: new Date(loc.timestamp).toISOString(),
          address,
        },
      });

      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      });
    } catch (e) {
      setErrorMsg("Failed to acquire GPS");
      Alert.alert("GPS Error", "Could not lock GPS location automatically. You can pin the location by moving the map.");
    } finally {
      setLoading(false);
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
        Where is the issue?
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
        Drag the map to pin the exact location.
      </Text>

      <View
        style={[
          styles.mapContainer,
          {
            marginHorizontal: Spacing[5],
            borderRadius: Radius.lg,
            borderColor: colors.borderDefault,
          },
        ]}
      >
        {loading ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.bgSurface }]}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={[TextStyles.body, { color: colors.textSecondary, marginTop: Spacing[4] }]}>
              Finding your location...
            </Text>
          </View>
        ) : (
          <>
            <MapView
              style={styles.map}
              region={region}
              onRegionChangeComplete={handleRegionChangeComplete}
              showsUserLocation
              showsMyLocationButton
            />
            {/* Locate Me Floating Button */}
            <TouchableOpacity
              onPress={checkAndAcquireGPS}
              style={[
                styles.locateButton,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
              ]}
            >
              <LumenIcon name="locate" size="md" color={colors.brand} />
            </TouchableOpacity>
            <View style={styles.centerPinContainer} pointerEvents="none">
              <View
                style={[
                  styles.centerPin,
                  { backgroundColor: "#F04438" },
                ]}
              >
                <View style={[styles.pinHole, { backgroundColor: colors.bgBase }]} />
              </View>
              <View style={styles.centerPinShadow} />
            </View>
          </>
        )}
      </View>

      <View
        style={{
          padding: Spacing[5],
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text
            style={[
              TextStyles.bodySmall,
              { color: colors.textSecondary, textTransform: "uppercase" },
            ]}
          >
            Selected Location
          </Text>
          <Text
            style={[
              TextStyles.bodyMedium,
              { color: colors.textPrimary, marginTop: Spacing[1], fontWeight: "500" },
            ]}
          >
            {data.location?.address || (errorMsg ? errorMsg : "Locating...")}
          </Text>
          {data.location && !errorMsg && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#12B76A",
                    marginRight: 6,
                  }}
                />
                <Text style={{ fontSize: 12, color: "#12B76A", fontWeight: "600" }}>
                  GPS Lock Active - Ready to submit
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  const lat = data.location?.latitude;
                  const lng = data.location?.longitude;
                  if (lat && lng) {
                    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                    Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
                  }
                }}
                style={{ marginTop: Spacing[2], flexDirection: "row", alignItems: "center" }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.brand,
                    fontWeight: "600",
                    textDecorationLine: "underline",
                  }}
                >
                  Verify / Open in Google Maps
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={[styles.footer, { padding: Spacing[5], borderTopColor: colors.borderDefault }]}>
        <Button
          label="Confirm Location"
          onPress={onNext}
          disabled={!data.location || !!errorMsg}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1, overflow: "hidden", borderWidth: 1, position: "relative" },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  locateButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  centerPinContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -14,
    marginTop: -28,
    alignItems: "center",
  },
  centerPin: {
    width: 28,
    height: 28,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 0,
    transform: [{ rotate: "45deg" }],
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pinHole: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  centerPinShadow: {
    width: 12,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 2,
    marginTop: 2,
  },
  footer: { borderTopWidth: 1 },
});

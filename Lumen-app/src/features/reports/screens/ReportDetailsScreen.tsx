import React from "react";
import { View, StyleSheet, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useTheme, LumenIcon, Spacing, Radius, TextStyles } from "@/design-system";
import { TimelineEvent, ReportStatus } from "../domain/Report";

const MOCK_EVENTS: TimelineEvent[] = [
  {
    id: "1",
    reportId: "RPT-123",
    status: "submitted",
    description: "Report created by citizen.",
    timestamp: "2026-07-08T08:00:00Z",
  },
  {
    id: "2",
    reportId: "RPT-123",
    status: "verified",
    description: "AI categorized issue as 'Road Damage' and verified location.",
    timestamp: "2026-07-08T08:05:00Z",
  },
  {
    id: "3",
    reportId: "RPT-123",
    status: "assigned",
    description: "Assigned to Roads & Transport Department.",
    timestamp: "2026-07-08T08:15:00Z",
  },
  {
    id: "4",
    reportId: "RPT-123",
    status: "engineer_accepted",
    description: "Engineer Mark Davis accepted the assignment.",
    timestamp: "2026-07-08T09:30:00Z",
  },
  {
    id: "5",
    reportId: "RPT-123",
    status: "on_site",
    description: "Engineer arrived at the location.",
    timestamp: "2026-07-08T10:15:00Z",
  },
];

export default function ReportDetailsScreen() {
  const { colors } = useTheme();
  const currentStatus: ReportStatus = "on_site";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgBase }]}
      edges={["top", "bottom"]}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: Spacing[10] }}>
        {/* Hero Map View */}
        <View style={styles.heroMapContainer}>
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: 37.78825,
              longitude: -122.4324,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker coordinate={{ latitude: 37.78825, longitude: -122.4324 }}>
              <View
                style={[
                  styles.markerBadge,
                  { backgroundColor: "#F04438", borderColor: colors.bgBase },
                ]}
              >
                <LumenIcon name="alert" size="sm" color="#FFFFFF" />
              </View>
            </Marker>
          </MapView>
          <View style={[styles.heroOverlay, { padding: Spacing[5] }]}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: colors.bgSurface, paddingHorizontal: Spacing[2] },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: "#F79009", marginRight: Spacing[1] }]}
              />
              <Text
                style={[TextStyles.bodySmall, { color: colors.textPrimary, fontWeight: "bold" }]}
              >
                ENGINEER ON SITE
              </Text>
            </View>
            <Text
              style={[
                TextStyles.bodyMedium,
                {
                  color: "#FFFFFF",
                  fontWeight: "bold",
                  textShadowColor: "rgba(0,0,0,0.5)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                },
              ]}
            >
              #RPT-8842
            </Text>
          </View>
        </View>

        {/* Issue Overview */}
        <View
          style={[
            styles.overviewCard,
            {
              backgroundColor: colors.bgSurface,
              margin: Spacing[5],
              padding: Spacing[5],
              borderRadius: Radius.lg,
            },
          ]}
        >
          <Text style={[TextStyles.title, { color: colors.textPrimary }]}>
            Massive Pothole on Main St.
          </Text>
          <Text style={[TextStyles.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
            Roads & Transport • High Priority
          </Text>
          <View
            style={[
              styles.engineerProfile,
              {
                marginTop: Spacing[4],
                paddingTop: Spacing[4],
                borderTopColor: colors.borderDefault,
              },
            ]}
          >
            <View style={[styles.avatarPlaceholder, { backgroundColor: `${colors.brand}15` }]}>
              <LumenIcon name="profile" size="md" color={colors.brand} />
            </View>
            <View style={[styles.engineerInfo, { marginLeft: Spacing[4] }]}>
              <Text
                style={[TextStyles.bodyMedium, { color: colors.textPrimary, fontWeight: "bold" }]}
              >
                Mark Davis
              </Text>
              <Text style={[TextStyles.bodySmall, { color: colors.textSecondary }]}>
                Assigned Field Engineer
              </Text>
            </View>
          </View>
        </View>

        {/* Image Analysis */}
        <View
          style={[
            styles.overviewCard,
            {
              backgroundColor: colors.bgSurface,
              marginHorizontal: Spacing[5],
              marginBottom: Spacing[5],
              padding: Spacing[5],
              borderRadius: Radius.lg,
            },
          ]}
        >
          <Text style={[TextStyles.title, { color: colors.textPrimary, marginBottom: Spacing[3] }]}>
            IMAGE ANALYSIS
          </Text>
          <View style={{ gap: Spacing[2] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[TextStyles.body, { color: colors.textSecondary }]}>Detected Issue</Text>
              <Text style={[TextStyles.body, { color: colors.textPrimary, fontWeight: '500' }]}>Road Damage</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[TextStyles.body, { color: colors.textSecondary }]}>Damage Severity</Text>
              <Text style={[TextStyles.body, { color: '#F04438', fontWeight: '500' }]}>HIGH</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[TextStyles.body, { color: colors.textSecondary }]}>Model Confidence</Text>
              <Text style={[TextStyles.body, { color: colors.textPrimary, fontWeight: '500' }]}>94.0%</Text>
            </View>
          </View>
        </View>

        {/* Vertical Timeline */}
        <View
          style={[
            styles.timelineContainer,
            { paddingHorizontal: Spacing[5], marginTop: Spacing[4] },
          ]}
        >
          <Text style={[TextStyles.title, { color: colors.textPrimary, marginBottom: Spacing[5] }]}>
            Activity Timeline
          </Text>

          {MOCK_EVENTS.map((event, index) => {
            const isLast = index === MOCK_EVENTS.length - 1;
            const date = new Date(event.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });

            return (
              <View key={event.id} style={styles.timelineRow}>
                {/* Time Column */}
                <View style={[styles.timeCol, { paddingRight: Spacing[2] }]}>
                  <Text
                    style={[TextStyles.bodySmall, { color: colors.textPrimary, fontWeight: "500" }]}
                  >
                    {timeStr}
                  </Text>
                  <Text
                    style={[TextStyles.bodySmall, { fontSize: 10, color: colors.textSecondary }]}
                  >
                    {dateStr}
                  </Text>
                </View>

                {/* Line Column */}
                <View style={styles.lineCol}>
                  <View
                    style={[
                      styles.dot,
                      isLast
                        ? [
                            styles.dotActive,
                            { backgroundColor: "#F79009", borderColor: `${"#F79009"}40` },
                          ]
                        : [styles.dotCompleted, { backgroundColor: colors.brand }],
                    ]}
                  />
                  {!isLast && (
                    <View style={[styles.line, { backgroundColor: colors.borderDefault }]} />
                  )}
                </View>

                {/* Content Column */}
                <View
                  style={[
                    styles.contentCol,
                    { paddingBottom: Spacing[5], paddingLeft: Spacing[2] },
                  ]}
                >
                  <Text
                    style={[
                      TextStyles.body,
                      { color: colors.textPrimary, fontWeight: "600", marginBottom: 2 },
                      isLast && { color: "#F79009" },
                    ]}
                  >
                    {event.status.replace(/_/g, " ").toUpperCase()}
                  </Text>
                  <Text
                    style={[TextStyles.bodySmall, { color: colors.textSecondary, lineHeight: 20 }]}
                  >
                    {event.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  heroMapContainer: { height: 250, width: "100%", position: "relative" },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  markerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  overviewCard: {
    marginTop: -20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  engineerProfile: { flexDirection: "row", alignItems: "center", borderTopWidth: 1 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  engineerInfo: {},
  timelineContainer: {},
  timelineRow: { flexDirection: "row", minHeight: 80 },
  timeCol: { width: 60, alignItems: "flex-end" },
  lineCol: { width: 30, alignItems: "center" },
  dot: { width: 12, height: 12, borderRadius: 6, zIndex: 2 },
  dotCompleted: {},
  dotActive: { borderWidth: 2 },
  line: { width: 2, flex: 1, marginVertical: -4, zIndex: 1 },
  contentCol: { flex: 1 },
});

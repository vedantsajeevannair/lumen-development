// ============================================================
// LUMEN — Premium Global Omni-Search Screen
// Phase 5: Production Ready (Shared Search Experience)
// ============================================================
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { SearchBar } from "@/design-system/components/Extras";
import { Badge } from "@/design-system/components/Badge";
import { Chip } from "@/design-system/components/Badge";
import { Card } from "@/design-system/components/Card";
import { SkeletonCard } from "@/design-system/components/Skeleton";
import { TextStyles, Spacing, Radius } from "@/design-system/tokens";

interface SearchResult {
  id: string;
  title: string;
  category: "road" | "streetlight" | "water" | "garbage" | "electricity";
  status: "pending" | "in_progress" | "resolved";
  address: string;
  date: string;
}

const SEARCH_RESULTS: SearchResult[] = [
  {
    id: "S1",
    title: "MG Road Pothole Damage",
    category: "road",
    status: "in_progress",
    address: "123 MG Road",
    date: "2h ago",
  },
  {
    id: "S2",
    title: "Water line broken valve",
    category: "water",
    status: "in_progress",
    address: "5th Cross, Gandhi Nagar",
    date: "Yesterday",
  },
  {
    id: "S3",
    title: "Street lamp out near park",
    category: "streetlight",
    status: "pending",
    address: "Park Avenue",
    date: "3d ago",
  },
  {
    id: "S4",
    title: "Garbage pile overflow",
    category: "garbage",
    status: "pending",
    address: "City Market St",
    date: "4d ago",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  road: "#F04438",
  water: "#06B6D4",
  streetlight: "#F59E0B",
  garbage: "#10B981",
  electricity: "#8B5CF6",
};

export default function SearchScreen() {
  const { colors, shadows, isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(["MG Road", "Water leak", "Street light"]);
  const [selectedCat, setSelectedCat] = useState("all");

  useEffect(() => {
    if (query) {
      setLoading(true);
      const timer = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [query]);

  const deleteHistory = (item: string) => {
    setHistory((h) => h.filter((x) => x !== item));
  };

  const clearQuery = () => {
    setQuery("");
  };

  const getFilteredResults = () => {
    return SEARCH_RESULTS.filter((item) => {
      const matchQuery =
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.address.toLowerCase().includes(query.toLowerCase());
      const matchCat = selectedCat === "all" || item.category === selectedCat;
      return matchQuery && matchCat;
    });
  };

  const results = query ? getFilteredResults() : [];

  return (
    <View style={[s.root, { backgroundColor: colors.bgBase }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bgBase}
      />

      {/* Top Search Panel */}
      <View style={[s.header, { borderBottomColor: colors.borderDefault }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <LumenIcon name="back" size="md" color={colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <View style={s.searchBarWrapper}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search reports, coordinates, engineers…"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Category filtering pills */}
        <View style={s.catPillContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.catPillsRow}
          >
            {["all", "road", "streetlight", "water", "garbage", "electricity"].map((cat) => (
              <Chip
                key={cat}
                label={
                  cat === "all" ? "All categories" : cat.charAt(0).toUpperCase() + cat.slice(1)
                }
                selected={selectedCat === cat}
                onPress={() => setSelectedCat(cat)}
              />
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={s.loaderSection}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : query ? (
          /* Results Section */
          <View style={s.section}>
            <Text
              style={[TextStyles.subtitle, { color: colors.textPrimary, marginBottom: Spacing[4] }]}
            >
              Search Results ({results.length})
            </Text>

            {results.length === 0 ? (
              <View style={s.emptyState}>
                <LumenIcon name="search" size="xl" color={colors.textTertiary} strokeWidth={1.5} />
                <Text
                  style={[
                    TextStyles.bodyMedium,
                    { color: colors.textSecondary, marginTop: Spacing[3], textAlign: "center" },
                  ]}
                >
                  No results found for "{query}"
                </Text>
                <Text
                  style={[
                    TextStyles.caption,
                    { color: colors.textTertiary, textAlign: "center", marginTop: 4 },
                  ]}
                >
                  Try checking spelling or use a different keyword.
                </Text>
              </View>
            ) : (
              results.map((item) => (
                <Card
                  key={item.id}
                  variant="elevated"
                  padding={Spacing[4]}
                  style={s.resultCard}
                  onPress={() => router.push("/(citizen)/Report-details" as any)}
                >
                  <View style={s.cardContent}>
                    <View
                      style={[
                        s.catIcon,
                        { backgroundColor: CATEGORY_COLORS[item.category] + "15" },
                      ]}
                    >
                      <LumenIcon
                        name={item.category}
                        size="md"
                        color={CATEGORY_COLORS[item.category]}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={s.infoCol}>
                      <Text
                        style={[
                          TextStyles.bodyMedium,
                          { color: colors.textPrimary, fontWeight: "600" },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[TextStyles.caption, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {item.address} · {item.date}
                      </Text>
                    </View>
                    <Badge
                      label={item.status === "in_progress" ? "In Progress" : "Pending"}
                      variant={item.status === "in_progress" ? "info" : "warning"}
                      size="sm"
                    />
                  </View>
                </Card>
              ))
            )}
          </View>
        ) : (
          /* History and suggestions default view */
          <View style={s.defaultView}>
            {history.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={[TextStyles.label, { color: colors.textSecondary }]}>
                    Recent Searches
                  </Text>
                  <Pressable onPress={() => setHistory([])}>
                    <Text style={[TextStyles.caption, { color: colors.brand, fontWeight: "600" }]}>
                      Clear All
                    </Text>
                  </Pressable>
                </View>

                <View style={s.historyRows}>
                  {history.map((item) => (
                    <View
                      key={item}
                      style={[s.historyRow, { borderBottomColor: colors.borderDefault }]}
                    >
                      <Pressable style={s.historyClickable} onPress={() => setQuery(item)}>
                        <LumenIcon
                          name="clock"
                          size="sm"
                          color={colors.textTertiary}
                          strokeWidth={2}
                        />
                        <Text
                          style={[
                            TextStyles.bodyMedium,
                            { color: colors.textPrimary, marginLeft: Spacing[3] },
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => deleteHistory(item)} hitSlop={8}>
                        <LumenIcon
                          name="close"
                          size="sm"
                          color={colors.textTertiary}
                          strokeWidth={2}
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={[s.section, { marginTop: Spacing[4] }]}>
              <Text
                style={[
                  TextStyles.label,
                  { color: colors.textSecondary, marginBottom: Spacing[3] },
                ]}
              >
                Popular Tags
              </Text>
              <View style={s.tagsGrid}>
                {[
                  "Potholes",
                  "Street lights",
                  "Water leakage",
                  "Garbage bin",
                  "Transformer",
                  "Bridge",
                ].map((tag) => (
                  <Pressable
                    key={tag}
                    style={({ pressed }) => [
                      s.tagChip,
                      {
                        backgroundColor: colors.bgSubtle,
                        borderColor: colors.borderDefault,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    onPress={() => setQuery(tag)}
                  >
                    <Text style={[TextStyles.bodySmall, { color: colors.textPrimary }]}>{tag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    paddingTop: 52,
    paddingBottom: Spacing[4],
    borderBottomWidth: 1,
    gap: Spacing[3],
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarWrapper: {
    flex: 1,
  },
  scroll: {
    paddingBottom: Spacing[10],
  },
  catPillContainer: {
    paddingVertical: Spacing[3],
  },
  catPillsRow: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[2],
  },
  loaderSection: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[3],
  },
  section: {
    paddingHorizontal: Spacing[5],
    marginTop: Spacing[4],
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[12],
  },
  resultCard: {
    marginBottom: Spacing[3],
  },
  cardContent: {
    flexDirection: "row",
    gap: Spacing[3],
    alignItems: "center",
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  defaultView: {
    marginTop: Spacing[2],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing[3],
  },
  historyRows: {
    gap: 0,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing[4],
    borderBottomWidth: 1,
  },
  historyClickable: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[2],
  },
  tagChip: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
});

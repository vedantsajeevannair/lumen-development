import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Dimensions } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Badge, Button } from "@/design-system/components";
import { TextStyles, Spacing } from "@/design-system/tokens";
import { CitizenService } from "@/services/citizen.service";

const { width: W } = Dimensions.get("window");

export default function MunicipalPaymentsScreen() {
  const { colors, isDark } = useTheme();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const data = await CitizenService.getPayments();
      setPayments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id: string) => {
    try {
      await CitizenService.payBill(id);
      fetchPayments(); // refresh list
    } catch (e) {
      console.error(e);
    }
  };

  const renderPayment = (payment: any) => {
    const isPaid = payment.status === "COMPLETED";

    return (
      <View
        key={payment.id}
        style={[
          styles.card,
          { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[TextStyles.bodyMedium, { color: colors.textPrimary }]}>
            {payment.type} Bill
          </Text>
          <Badge
            label={isPaid ? "Paid" : "Pending"}
            variant={isPaid ? "success" : "warning"}
            size="sm"
          />
        </View>

        <View style={styles.cardBody}>
          <Text style={[TextStyles.heading2, { color: colors.textPrimary }]}>
            ₹ {payment.amount || "450"}
          </Text>
          <Text style={[TextStyles.caption, { color: colors.textSecondary }]}>
            Due: {new Date(payment.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {!isPaid && (
          <Button
            label="Pay Now"
            onPress={() => handlePay(payment.id)}
            style={{ marginTop: Spacing[4] }}
          />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bgBase }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderDefault }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <LumenIcon name="back" size="md" color={colors.textPrimary} />
        </Pressable>
        <Text style={[TextStyles.title, { color: colors.textPrimary }]}>Municipal Payments</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 40 }}>
            Loading bills...
          </Text>
        ) : payments.length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 40 }}>
            No outstanding bills.
          </Text>
        ) : (
          payments.map(renderPayment)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[4],
    paddingTop: 60,
    paddingBottom: Spacing[4],
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  scroll: { padding: Spacing[4] },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[4],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing[3],
  },
  cardBody: {
    flexDirection: "column",
  },
});

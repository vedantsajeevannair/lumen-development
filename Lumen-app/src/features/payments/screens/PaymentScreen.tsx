import React, { useState } from "react";
import { View, StyleSheet, Text, Alert, ActivityIndicator } from "react-native";
import { useStripe, CardField } from "@stripe/stripe-react-native";
import { useTheme } from "@/design-system/ThemeContext";
import { Button } from "@/design-system/components";
import { apiClient } from "@/services/api.client";
import { router, useLocalSearchParams } from "expo-router";

export default function PaymentScreen() {
  const { colors } = useTheme();
  const { confirmPayment } = useStripe();
  const [loading, setLoading] = useState(false);

  // E.g., passed as route params
  const { amount = "500", type = "MUNICIPAL_BILL" } = useLocalSearchParams();

  const handlePay = async () => {
    try {
      setLoading(true);
      // 1. Fetch Payment Intent client secret from backend
      const response = await apiClient.post("/api/v1/payments/create-payment-intent", {
        amount: parseFloat(amount as string),
        type,
      });

      if (!response.data || !response.data.clientSecret) {
        throw new Error("Failed to fetch payment intent.");
      }

      const { clientSecret, paymentIntentId } = response.data;

      // 2. Initialize the Payment sheet (or confirm directly if using CardField)
      // Here we use confirmPayment with CardField
      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        Alert.alert(`Error code: ${error.code}`, error.message);
      } else if (paymentIntent) {
        // 3. Record success on backend
        await apiClient.post("/api/v1/payments/pay", {
          amount: parseFloat(amount as string),
          type,
          transactionId: paymentIntentId,
        });

        Alert.alert("Success", "Your payment is confirmed!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      Alert.alert("Payment Error", e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Pay Municipal Bill</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Amount due: ₹{amount}</Text>

      <CardField
        postalCodeEnabled={false}
        cardStyle={{
          backgroundColor: colors.bgSurface,
          textColor: colors.textPrimary,
          placeholderColor: colors.textTertiary,
          borderRadius: 8,
        }}
        style={styles.cardField}
      />

      <Button
        label={loading ? "Processing..." : `Pay ₹${amount}`}
        onPress={handlePay}
        disabled={loading}
        style={styles.payButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  cardField: {
    width: "100%",
    height: 50,
    marginVertical: 30,
  },
  payButton: {
    marginTop: 20,
  },
});

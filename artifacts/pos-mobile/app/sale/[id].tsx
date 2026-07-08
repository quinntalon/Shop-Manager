import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useGetSale } from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: sale, isLoading } = useGetSale(Number(id));

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad + 8,
      paddingHorizontal: 20,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    backBtn: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      flex: 1,
    },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    section: {
      backgroundColor: colors.card,
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    sectionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionRowLast: {
      borderBottomWidth: 0,
    },
    rowLabel: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    rowValue: {
      fontSize: 14,
      fontWeight: "500" as const,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginHorizontal: 20,
      marginBottom: 8,
      marginTop: 4,
    },
    lineItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    lineItemLast: {
      borderBottomWidth: 0,
    },
    lineItemName: {
      flex: 1,
      fontSize: 15,
      fontWeight: "500" as const,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    lineItemQty: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginRight: 16,
    },
    lineItemTotal: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    totalSection: {
      backgroundColor: colors.card,
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    totalValue: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={[styles.container, styles.loading]}>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_400Regular" }}>
          Sale not found
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Sale #{sale.id}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 8, paddingBottom: botPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.rowLabel}>Date</Text>
            <Text style={styles.rowValue}>{formatDate(sale.createdAt)}</Text>
          </View>
          <View style={[styles.sectionRow, !sale.note && styles.sectionRowLast]}>
            <Text style={styles.rowLabel}>Customer</Text>
            <Text style={styles.rowValue}>
              {sale.customerName ?? "Walk-in Customer"}
            </Text>
          </View>
          {sale.note && (
            <View style={[styles.sectionRow, styles.sectionRowLast]}>
              <Text style={styles.rowLabel}>Note</Text>
              <Text style={styles.rowValue}>{sale.note}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.section}>
          {sale.items.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.lineItem,
                idx === sale.items.length - 1 && styles.lineItemLast,
              ]}
            >
              <Text style={styles.lineItemName}>
                {item.productName ?? `Product #${item.productId}`}
              </Text>
              <Text style={styles.lineItemQty}>×{item.quantity}</Text>
              <Text style={styles.lineItemTotal}>
                ${(item.unitPrice * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${sale.total.toFixed(2)}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

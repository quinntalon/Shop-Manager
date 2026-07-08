import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useGetDashboardSummary,
  useGetLowStockProducts,
} from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  const colors = useColors();
  const styles = StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      minWidth: 140,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    value: {
      fontSize: 24,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    label: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: color + "20" }]}>
          <Feather name={icon as any} size={18} color={color} />
        </View>
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const {
    data: summary,
    isLoading: loadingSummary,
    refetch: refetchSummary,
    isRefetching: refetchingSummary,
  } = useGetDashboardSummary();

  const {
    data: lowStock,
    isLoading: loadingLow,
    refetch: refetchLow,
    isRefetching: refetchingLow,
  } = useGetLowStockProducts();

  const isLoading = loadingSummary || loadingLow;
  const isRefreshing = refetchingSummary || refetchingLow;

  const handleRefresh = () => {
    refetchSummary();
    refetchLow();
  };

  const fmt = (n: number) =>
    n >= 1000
      ? `$${(n / 1000).toFixed(1)}k`
      : `$${n.toFixed(2)}`;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad + 16,
      paddingHorizontal: 20,
      paddingBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerLeft: { gap: 2 },
    appName: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    date: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    logoutBtn: {
      padding: 8,
    },
    section: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: "row",
      gap: 12,
      flexWrap: "wrap",
    },
    alertBanner: {
      backgroundColor: colors.warning + "20",
      borderWidth: 1,
      borderColor: colors.warning + "40",
      borderRadius: colors.radius,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    alertText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.warning,
      fontFamily: "Inter_600SemiBold",
    },
    lowStockCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    lowStockLeft: { flex: 1, gap: 2 },
    lowStockName: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    lowStockSku: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    lowStockBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      backgroundColor: colors.destructive + "20",
    },
    lowStockBadgeText: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.destructive,
      fontFamily: "Inter_700Bold",
    },
    emptyText: {
      textAlign: "center",
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      paddingVertical: 20,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    sellBtn: {
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    sellBtnText: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.primaryForeground,
      fontFamily: "Inter_600SemiBold",
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>Nexus POS</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <Pressable
          style={styles.logoutBtn}
          onPress={logout}
          testID="logout-btn"
        >
          <Feather name="log-out" size={22} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <View style={styles.statsRow}>
            <StatCard
              label="Today's Revenue"
              value={fmt(summary?.todayRevenue ?? 0)}
              icon="dollar-sign"
              color={colors.primary}
            />
            <StatCard
              label="Sales Today"
              value={String(summary?.totalSalesToday ?? 0)}
              icon="shopping-bag"
              color={colors.success}
            />
          </View>
          <View style={[styles.statsRow, { marginTop: 12 }]}>
            <StatCard
              label="Week Revenue"
              value={fmt(summary?.weekRevenue ?? 0)}
              icon="trending-up"
              color="#8b5cf6"
            />
            <StatCard
              label="Products"
              value={String(summary?.totalProducts ?? 0)}
              icon="package"
              color={colors.warning}
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.sellBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.push("/(tabs)/sell" as any)}
          testID="quick-sell-btn"
        >
          <Feather name="shopping-cart" size={20} color={colors.primaryForeground} />
          <Text style={styles.sellBtnText}>New Sale</Text>
        </Pressable>

        {(lowStock?.length ?? 0) > 0 && (
          <View style={styles.alertBanner}>
            <Feather name="alert-triangle" size={20} color={colors.warning} />
            <Text style={styles.alertText}>
              {lowStock!.length} item{lowStock!.length > 1 ? "s" : ""} running low on stock
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
          {(lowStock?.length ?? 0) === 0 ? (
            <Text style={styles.emptyText}>All items are well stocked</Text>
          ) : (
            lowStock!.map((p) => (
              <View key={p.id} style={styles.lowStockCard}>
                <View style={styles.lowStockLeft}>
                  <Text style={styles.lowStockName}>{p.name}</Text>
                  <Text style={styles.lowStockSku}>SKU: {p.sku}</Text>
                </View>
                <View style={styles.lowStockBadge}>
                  <Text style={styles.lowStockBadgeText}>{p.stock} left</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

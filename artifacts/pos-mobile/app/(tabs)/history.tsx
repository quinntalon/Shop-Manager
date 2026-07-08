import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useListSales } from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: sales, isLoading, refetch, isRefetching } = useListSales({ limit: 50 });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad + 16,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    title: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    card: {
      backgroundColor: colors.card,
      marginHorizontal: 20,
      marginBottom: 8,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
    },
    cardLeft: { flex: 1, gap: 4 },
    saleId: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    customerName: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    meta: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    cardRight: { alignItems: "flex-end", gap: 6 },
    total: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    itemCount: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    chevron: {
      marginLeft: 8,
    },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: {
      alignItems: "center",
      paddingVertical: 80,
      gap: 12,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    emptySubText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    listHeader: {
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    listHeaderText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
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
        <Text style={styles.title}>Sales History</Text>
      </View>

      <FlatList
        data={sales ?? []}
        keyExtractor={(s) => String(s.id)}
        scrollEnabled={!!(sales?.length)}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          sales && sales.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                {sales.length} transaction{sales.length !== 1 ? "s" : ""}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="clock" size={40} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No sales yet</Text>
            <Text style={styles.emptySubText}>
              Completed sales will appear here
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
        renderItem={({ item: s }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(`/sale/${s.id}`)}
            testID={`sale-${s.id}`}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.saleId}>#{s.id}</Text>
              <Text style={styles.customerName}>
                {s.customerName ?? "Walk-in Customer"}
              </Text>
              <Text style={styles.meta}>
                {formatDate(s.createdAt)} · {formatTime(s.createdAt)}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.total}>${s.total.toFixed(2)}</Text>
              <Text style={styles.itemCount}>
                {s.items.length} item{s.items.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={styles.chevron}>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

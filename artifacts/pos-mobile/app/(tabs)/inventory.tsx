import { Feather } from "@expo/vector-icons";
import { useListProducts } from "@workspace/api-client-react";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function InventoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: products, isLoading, refetch, isRefetching } = useListProducts();

  const filtered = useMemo(() => {
    if (!products) return [];
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }
    if (lowStockOnly) {
      list = list.filter((p) => p.stock <= p.reorderLevel);
    }
    return list;
  }, [products, search, lowStockOnly]);

  const isLow = (stock: number, reorder: number) => stock <= reorder;

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
      marginBottom: 12,
    },
    searchRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      height: 44,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
    },
    filterBtn: {
      height: 44,
      width: 44,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    filterBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    productCard: {
      backgroundColor: colors.card,
      marginHorizontal: 20,
      marginBottom: 8,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    productInfo: { flex: 1, gap: 2 },
    productName: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    productSku: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    productCategory: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    productRight: { alignItems: "flex-end", gap: 4 },
    price: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    stockBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    stockBadgeOk: { backgroundColor: colors.success + "20" },
    stockBadgeLow: { backgroundColor: colors.destructive + "20" },
    stockText: {
      fontSize: 12,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
    stockTextOk: { color: colors.success },
    stockTextLow: { color: colors.destructive },
    listHeader: {
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    listHeaderText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    empty: {
      alignItems: "center",
      paddingVertical: 60,
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
        <Text style={styles.title}>Inventory</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              testID="inventory-search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
          <Pressable
            style={[styles.filterBtn, lowStockOnly && styles.filterBtnActive]}
            onPress={() => setLowStockOnly((v) => !v)}
            testID="low-stock-filter"
          >
            <Feather
              name="alert-triangle"
              size={18}
              color={lowStockOnly ? "#fff" : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => String(p.id)}
        scrollEnabled={!!filtered.length}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>
              {filtered.length} product{filtered.length !== 1 ? "s" : ""}
              {lowStockOnly ? " (low stock)" : ""}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="package" size={40} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubText}>
              {search ? "Try a different search" : "No products in inventory"}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
        renderItem={({ item: p }) => {
          const low = isLow(p.stock, p.reorderLevel);
          return (
            <View style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.productSku}>SKU: {p.sku}</Text>
                {p.categoryName && (
                  <Text style={styles.productCategory}>{p.categoryName}</Text>
                )}
              </View>
              <View style={styles.productRight}>
                <Text style={styles.price}>${p.price.toFixed(2)}</Text>
                <View
                  style={[
                    styles.stockBadge,
                    low ? styles.stockBadgeLow : styles.stockBadgeOk,
                  ]}
                >
                  <Text
                    style={[
                      styles.stockText,
                      low ? styles.stockTextLow : styles.stockTextOk,
                    ]}
                  >
                    {p.stock} in stock
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

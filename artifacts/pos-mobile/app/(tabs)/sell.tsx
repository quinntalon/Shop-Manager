import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCreateSale, useListProducts } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCart } from "@/context/CartContext";
import { useColors } from "@/hooks/useColors";

export default function SellScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, addItem, removeItem, updateQty, clearCart, total, itemCount } =
    useCart();
  const [search, setSearch] = useState("");
  const [cartVisible, setCartVisible] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mobile">("cash");
  const queryClient = useQueryClient();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: products, isLoading, refetch, isRefetching } = useListProducts();
  const { mutate: createSale, isPending } = useCreateSale();

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleCheckout = () => {
    if (items.length === 0) return;
    createSale(
      {
        data: {
          customerName: customerName.trim() || undefined,
          paymentMethod,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          clearCart();
          setCustomerName("");
          setPaymentMethod("cash");
          setCartVisible(false);
          queryClient.invalidateQueries();
          Alert.alert("Sale Complete", `Total: ${total.toFixed(2)}`);
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Error", "Failed to process sale. Please try again.");
        },
      }
    );
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
      marginBottom: 12,
    },
    searchBox: {
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
    },
    productInfo: { flex: 1, gap: 2 },
    productName: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    productPrice: {
      fontSize: 14,
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    productStock: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    addBtnDisabled: {
      backgroundColor: colors.muted,
    },
    inCart: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    qtyText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      minWidth: 20,
      textAlign: "center",
    },
    qtyBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    cartFab: {
      position: "absolute",
      bottom: botPad + 100,
      left: 20,
      right: 20,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cartFabLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    cartBadge: {
      backgroundColor: colors.primaryForeground + "30",
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    cartBadgeText: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
    cartFabLabel: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.primaryForeground,
      fontFamily: "Inter_600SemiBold",
    },
    cartFabTotal: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    listHeader: { paddingHorizontal: 20, paddingVertical: 10 },
    listHeaderText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
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
    modal: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: botPad + 20,
      maxHeight: "80%",
    },
    sheetHandle: {
      alignItems: "center",
      paddingTop: 12,
      paddingBottom: 8,
    },
    sheetHandlebar: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    clearBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    clearBtnText: {
      fontSize: 14,
      color: colors.destructive,
      fontFamily: "Inter_600SemiBold",
    },
    cartItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cartItemInfo: { flex: 1, gap: 2 },
    cartItemName: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    cartItemSubtotal: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    cartQtyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    paymentLabel: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginLeft: 20,
      marginTop: 16,
      marginBottom: 8,
    },
    paymentRow: {
      flexDirection: "row",
      gap: 8,
      marginHorizontal: 20,
    },
    paymentOption: {
      flex: 1,
      borderWidth: 1,
      borderRadius: colors.radius,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    paymentOptionText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    inputLabel: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginLeft: 20,
      marginTop: 16,
      marginBottom: 4,
    },
    customerInput: {
      marginHorizontal: 20,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      height: 44,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      backgroundColor: colors.card,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    totalAmount: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
    checkoutBtn: {
      marginHorizontal: 20,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    checkoutBtnText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
    checkoutBtnDisabled: { opacity: 0.5 },
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
        <Text style={styles.title}>New Sale</Text>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            testID="sell-search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
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
              Tap + to add to cart
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={40} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubText}>Try a different search term</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: botPad + 160 }}
        renderItem={({ item: p }) => {
          const cartItem = items.find((i) => i.productId === p.id);
          const outOfStock = p.stock === 0;

          return (
            <View style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.productPrice}>${p.price.toFixed(2)}</Text>
                <Text style={styles.productStock}>
                  {outOfStock ? "Out of stock" : `${p.stock} available`}
                </Text>
              </View>
              {cartItem ? (
                <View style={styles.inCart}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateQty(p.id, cartItem.quantity - 1);
                    }}
                  >
                    <Feather name="minus" size={16} color={colors.foreground} />
                  </Pressable>
                  <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                  <Pressable
                    style={[
                      styles.addBtn,
                      cartItem.quantity >= p.stock && styles.addBtnDisabled,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItem({
                        productId: p.id,
                        productName: p.name,
                        price: p.price,
                        stock: p.stock,
                      });
                    }}
                    disabled={cartItem.quantity >= p.stock}
                  >
                    <Feather name="plus" size={18} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.addBtn, outOfStock && styles.addBtnDisabled]}
                  onPress={() => {
                    if (outOfStock) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    addItem({
                      productId: p.id,
                      productName: p.name,
                      price: p.price,
                      stock: p.stock,
                    });
                  }}
                  disabled={outOfStock}
                  testID={`add-product-${p.id}`}
                >
                  <Feather name="plus" size={18} color="#fff" />
                </Pressable>
              )}
            </View>
          );
        }}
      />

      {itemCount > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.cartFab,
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setCartVisible(true);
          }}
          testID="open-cart"
        >
          <View style={styles.cartFabLeft}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{itemCount}</Text>
            </View>
            <Text style={styles.cartFabLabel}>View Cart</Text>
          </View>
          <Text style={styles.cartFabTotal}>${total.toFixed(2)}</Text>
        </Pressable>
      )}

      <Modal
        visible={cartVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCartVisible(false)}
      >
        <View style={styles.modal}>
          <Pressable style={{ flex: 1 }} onPress={() => setCartVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle}>
              <View style={styles.sheetHandlebar} />
            </View>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Cart ({itemCount})</Text>
              <Pressable
                style={styles.clearBtn}
                onPress={() => {
                  clearCart();
                  setCartVisible(false);
                }}
              >
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
            </View>
            <ScrollView>
              {items.map((item) => (
                <View key={item.productId} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.productName}</Text>
                    <Text style={styles.cartItemSubtotal}>
                      ${item.price.toFixed(2)} × {item.quantity} = $
                      {(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.cartQtyRow}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => updateQty(item.productId, item.quantity - 1)}
                    >
                      <Feather name="minus" size={14} color={colors.foreground} />
                    </Pressable>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <Pressable
                      style={[
                        styles.qtyBtn,
                        item.quantity >= item.stock && styles.addBtnDisabled,
                      ]}
                      onPress={() => updateQty(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                    >
                      <Feather name="plus" size={14} color={colors.foreground} />
                    </Pressable>
                    <Pressable onPress={() => removeItem(item.productId)}>
                      <Feather
                        name="trash-2"
                        size={16}
                        color={colors.destructive}
                      />
                    </Pressable>
                  </View>
                </View>
              ))}
              <Text style={styles.paymentLabel}>Payment Method</Text>
              <View style={styles.paymentRow}>
                {([
                  { value: "cash", label: "Cash", icon: "dollar-sign" },
                  { value: "card", label: "Card", icon: "credit-card" },
                  { value: "mobile", label: "Mobile Pay", icon: "smartphone" },
                ] as const).map(({ value, label, icon }) => {
                  const selected = paymentMethod === value;
                  return (
                    <Pressable
                      key={value}
                      style={[
                        styles.paymentOption,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary + "18" : colors.card,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPaymentMethod(value);
                      }}
                    >
                      <Feather
                        name={icon}
                        size={16}
                        color={selected ? colors.primary : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.paymentOptionText,
                          { color: selected ? colors.primary : colors.mutedForeground },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.inputLabel}>Customer Name (optional)</Text>
              <TextInput
                style={styles.customerInput}
                placeholder="Walk-in customer"
                placeholderTextColor={colors.mutedForeground}
                value={customerName}
                onChangeText={setCustomerName}
                testID="customer-name"
              />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
              </View>
            </ScrollView>
            <Pressable
              style={[
                styles.checkoutBtn,
                isPending && styles.checkoutBtnDisabled,
              ]}
              onPress={handleCheckout}
              disabled={isPending}
              testID="checkout-btn"
            >
              {isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.checkoutBtnText}>
                  Confirm Sale · ${total.toFixed(2)}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

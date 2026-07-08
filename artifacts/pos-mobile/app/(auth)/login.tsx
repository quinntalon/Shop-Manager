import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const DIGITS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleDigit = async (d: string) => {
    if (d === "⌫") {
      setPin((p) => p.slice(0, -1));
      setError(false);
      return;
    }
    if (d === "") return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      const ok = await login(next);
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(true);
        setShaking(true);
        setTimeout(() => {
          setPin("");
          setError(false);
          setShaking(false);
        }, 600);
      }
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: topPad + 20,
      paddingBottom: botPad + 20,
      alignItems: "center",
      justifyContent: "center",
    },
    brand: {
      marginBottom: 48,
      alignItems: "center",
      gap: 8,
    },
    logo: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    logoText: {
      fontSize: 34,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
    appName: {
      fontSize: 26,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    dotsRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 40,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
    },
    dotFilled: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dotError: {
      backgroundColor: colors.destructive,
      borderColor: colors.destructive,
    },
    errorText: {
      color: colors.destructive,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      marginBottom: 16,
    },
    grid: {
      width: 280,
      gap: 12,
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    key: {
      flex: 1,
      height: 72,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    keyEmpty: {
      backgroundColor: "transparent",
      borderColor: "transparent",
    },
    keyText: {
      fontSize: 22,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    hint: {
      marginTop: 40,
      color: colors.mutedForeground,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>N</Text>
        </View>
        <Text style={styles.appName}>Nexus POS</Text>
        <Text style={styles.subtitle}>Enter your PIN to continue</Text>
      </View>

      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length && (error ? styles.dotError : styles.dotFilled),
            ]}
          />
        ))}
      </View>

      {error && <Text style={styles.errorText}>Incorrect PIN. Try again.</Text>}

      <View style={styles.grid}>
        {DIGITS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((d, di) => (
              <Pressable
                key={di}
                style={({ pressed }) => [
                  styles.key,
                  d === "" && styles.keyEmpty,
                  pressed && d !== "" && { opacity: 0.6 },
                ]}
                onPress={() => handleDigit(d)}
                testID={`pin-key-${d}`}
              >
                <Text style={styles.keyText}>{d}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <Text style={styles.hint}>Default PIN: 1234</Text>
    </View>
  );
}

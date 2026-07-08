import { Stack } from "expo-router";
import React from "react";

export default function SaleLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}

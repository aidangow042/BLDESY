import React from "react";
import { Text, View } from "react-native";

export default function SavedScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Saved</Text>
      <Text style={{ marginTop: 8, opacity: 0.7 }}>
        Saved builders + recent searches will show here.
      </Text>
    </View>
  );
}

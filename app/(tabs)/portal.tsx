import React from "react";
import { Pressable, Text, View } from "react-native";

export default function PortalScreen() {
  const isBuilder = false;

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Builder Portal</Text>

      {!isBuilder ? (
        <>
          <Text style={{ opacity: 0.7 }}>
            Join as a verified builder/trade to get matched with high-intent customers.
          </Text>

          <Pressable
            style={{
              backgroundColor: "#000",
              padding: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              Join as a Builder
            </Text>
          </Pressable>
        </>
      ) : (
        <Text>Dashboard goes here.</Text>
      )}
    </View>
  );
}

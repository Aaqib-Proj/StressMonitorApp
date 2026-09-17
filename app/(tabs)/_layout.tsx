import { Tabs } from "expo-router";
import React from "react";
import { Platform, ViewStyle } from "react-native";

import { FontAwesome6 } from "@expo/vector-icons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#4caf50",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: {
          backgroundColor: "#f5f5f5",
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0",
          ...Platform.select({
            ios: {
              position: "absolute",
            },
            default: {},
          }),
        },
        headerStyle: {
          backgroundColor: "#f5f5f5",
        },
        headerTintColor: "#333",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="RelaxationHub"
        options={{
          title: "Relaxation",
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="spa" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

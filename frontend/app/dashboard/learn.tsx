import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function Learn() {
  const { title, congress, type, number } = useLocalSearchParams();
  const [mode, setMode] = useState<"details" | "ai">("details");

  // Example placeholder bill object (you’ll replace this with API data later)
  const bill = {
    title: title || "N/A",
    introducedDate: "N/A",
    latestAction: "N/A",
    sponsor: "N/A",
    subjects: [],
    summary: "N/A",
  };

  return (
    <View style={styles.safeRoot}>
      <View style={styles.root}>
        {/* === MODE TOGGLE === */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, mode === "details" && styles.toggleActive]}
            onPress={() => setMode("details")}
          >
            <Text
              style={[styles.toggleText, mode === "details" && styles.toggleTextActive]}
            >
              General Details
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, mode === "ai" && styles.toggleActive]}
            onPress={() => setMode("ai")}
          >
            <Text
              style={[styles.toggleText, mode === "ai" && styles.toggleTextActive]}
            >
              AI Mode
            </Text>
          </TouchableOpacity>
        </View>

        {/* === DETAILS MODE === */}
        {mode === "details" ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{bill.title}</Text>
            <Text style={styles.meta}>
              Congress {congress} | {type?.toString().toUpperCase()} {number}
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Introduced</Text>
              <Text style={styles.sectionBody}>{bill.introducedDate || "N/A"}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Latest Action</Text>
              <Text style={styles.sectionBody}>{bill.latestAction || "N/A"}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Sponsor</Text>
              <Text style={styles.sectionBody}>{bill.sponsor || "N/A"}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Subjects</Text>
              <Text style={styles.sectionBody}>
                {bill.subjects?.length ? bill.subjects.join(", ") : "N/A"}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Summary</Text>
              <Text style={styles.sectionBody}>{bill.summary || "N/A"}</Text>
            </View>
          </ScrollView>
        ) : (
          <View
            style={[styles.content, { justifyContent: "center", alignItems: "center" }]}
          >
            <Text style={{ fontSize: 18, color: "#555" }}>🤖 AI Mode Coming Soon...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ===== STYLES =====
const TOP_PAD = (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0) + 12;

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingTop: 20,
  },
  root: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingTop: TOP_PAD,
  },
  toggleContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginTop: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleActive: {
    borderBottomWidth: 3,
    borderBottomColor: "#007AFF",
    backgroundColor: "#eef6ff",
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  toggleTextActive: {
    color: "#007AFF",
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111",
  },
  meta: {
    fontSize: 15,
    color: "#555",
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
});

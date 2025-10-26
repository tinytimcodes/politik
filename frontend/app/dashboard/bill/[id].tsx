import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const BASE_IP = "http://10.136.133.120:8000";

export default function BillDetail() {
  const { id } = useLocalSearchParams();
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const res = await axios.get(`${BASE_IP}/bills/${id}`);
        setBill(res.data);
      } catch (err) {
        console.error("Error loading bill:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [id]);

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={26} color="#333" />
      </TouchableOpacity>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#555" />
        </View>
      ) : !bill ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Bill not found.</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <Text style={styles.title}>{bill.title || "Untitled Bill"}</Text>
          <Text style={styles.meta}>
            {bill.type} {bill.number} · Congress {bill.congress}
          </Text>

          <View style={styles.section}>
            <Text style={styles.header}>Summary</Text>
            <Text style={styles.body}>
              {bill.summary || "No summary available."}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.header}>Sponsors</Text>
            <Text style={styles.body}>
              {bill.sponsors ? bill.sponsors.join(", ") : "No sponsor data"}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9f9f9", paddingTop: 40 },
  backButton: { position: "absolute", top: 40, left: 16, zIndex: 10 },
  content: { paddingHorizontal: 16, marginTop: 60 },
  title: { fontSize: 22, fontWeight: "700", color: "#111", marginBottom: 8 },
  meta: { fontSize: 15, color: "#666", marginBottom: 16 },
  section: { marginBottom: 20 },
  header: { fontSize: 18, fontWeight: "600", color: "#222", marginBottom: 6 },
  body: { fontSize: 16, lineHeight: 22, color: "#333" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#a00", fontSize: 16 },
});

// app/dashboard.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Dimensions,
  RefreshControl,
} from "react-native";
import axios from "axios";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

// NOTE: No baseURL function; just a constant that adapts per platform.
const CANDIDATE_ENDPOINTS = [
  "http://localhost:8000/bills/latest?limit=3",   // iOS Simulator often OK
  "http://127.0.0.1:8000/bills/latest?limit=3",  // sometimes works when localhost doesn't
  "http://10.136.123.130:8000/bills/latest?limit=3",
];

type Bill = { title?: string; [k: string]: any };

export default function Dashboard() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = useCallback(
    async (signal?: AbortSignal) => {
      setError(null);
      setLoading(true);
  
      // try each candidate host until one succeeds
      for (let i = 0; i < CANDIDATE_ENDPOINTS.length; i++) {
        const url = CANDIDATE_ENDPOINTS[i];
        try {
          console.log(`[axios] GET ${url}`);
          const res = await axios.get(url, { signal, timeout: 10000 });
          const data = res.data;
          const incoming = Array.isArray(data?.bills) ? data.bills : [];
          console.log(`[axios] success from ${url}, count=${incoming.length}`);
          setBills(incoming);
          setLoading(false);
          return; // success, stop trying
        } catch (e: any) {
          // Deep log so you can see code, message, and any response payload
          const dbg = {
            url,
            code: e?.code,
            message: e?.message,
            status: e?.response?.status,
            data: e?.response?.data,
            toJSON: e?.toJSON ? e.toJSON() : undefined,
          };
          console.log("[axios] network failure", dbg);
          // fall through and try next URL
        }
      }
  
      // none succeeded
      setBills([]);
      setLoading(false);
      setError("Network Error: unable to reach backend on any candidate host");
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchBills(controller.signal);
    return () => controller.abort();
  }, [fetchBills]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const controller = new AbortController();
    await fetchBills(controller.signal);
    controller.abort();
    setRefreshing(false);
  }, [fetchBills]);

  const displayBills = useMemo(
    () =>
      bills.map((b, i) => {
        const title =
          typeof b.title === "string" && b.title.trim().length > 0
            ? b.title
            : "Untitled Bill";
        return { ...b, _displayTitle: title, _key: `${b.congress ?? "c"}-${b.type ?? "t"}-${b.number ?? i}-${i}` };
      }),
    [bills]
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.sectionTitle}>Most Recent</Text>

          <View style={styles.fullWidthStack}>
            {loading && !error ? (
              <>
                <View style={[styles.billCard, styles.skeleton]} />
                <View style={[styles.billCard, styles.skeleton]} />
                <View style={[styles.billCard, styles.skeleton]} />
              </>
            ) : error ? (
              <View style={[styles.billCard, { alignItems: "center" }]}>
                <Text style={styles.errorText}>
                  Couldn’t load bills ({error}). Pull to refresh.
                </Text>
              </View>
            ) : displayBills.length === 0 ? (
              <View style={[styles.billCard, { alignItems: "center" }]}>
                <Text style={styles.billText}>No bills available.</Text>
              </View>
            ) : (
              displayBills.map((bill) => (
                <View key={bill._key} style={styles.billCard}>
                  <Text style={styles.billText} numberOfLines={3}>
                    {bill._displayTitle}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={{ height: Math.floor(height * 0.12) }} />

          <Text style={styles.sectionTitle}>For You</Text>
          <View style={styles.forYouCard}>
            <Text style={styles.forYouText}>Personalized picks will appear here.</Text>
          </View>
        </ScrollView>

        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabLeft} onPress={() => {}}>
            <Ionicons name="school-outline" size={26} />
            <Text style={styles.tabLabel}>Learn</Text>
          </TouchableOpacity>

        <TouchableOpacity style={styles.tabCenter} onPress={() => {}}>
            <MaterialCommunityIcons name="receipt-text-outline" size={28} />
            <Text style={styles.tabLabel}>Bills</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabRight} onPress={() => {}}>
            <Ionicons name="person-outline" size={26} />
            <Text style={styles.tabLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const BG = "#f2f2f2";
const CARD = "#ffffff";
const TEXT_DARK = "#111";
const TOP_PAD = (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0) + 28;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG, paddingTop: TOP_PAD },
  content: { paddingHorizontal: 16, paddingBottom: 120 },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: TEXT_DARK,
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  fullWidthStack: {
    marginHorizontal: -16,
    gap: 14,
    marginBottom: 8,
  },
  billCard: {
    backgroundColor: CARD,
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e7e7e7",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 88,
    justifyContent: "center",
  },
  billText: { fontSize: 18, fontWeight: "600", color: TEXT_DARK, lineHeight: 24 },

  skeleton: { backgroundColor: "#f7f7f7", borderColor: "#ededed" },

  forYouCard: {
    backgroundColor: CARD,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e7e7e7",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  forYouText: { color: "#444", fontSize: 14, lineHeight: 20 },

  errorText: { color: "#b00020", fontSize: 14 },

  tabBar: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: "#e6e6e6",
    paddingHorizontal: 24,
    paddingBottom: 10,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabLeft: { alignItems: "center", width: 64 },
  tabCenter: { alignItems: "center", width: 64 },
  tabRight: { alignItems: "center", width: 64 },
  tabLabel: { fontSize: 11, marginTop: 4, color: "#333" },
});

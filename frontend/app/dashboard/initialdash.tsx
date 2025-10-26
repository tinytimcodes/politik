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
import { useRouter } from "expo-router";

const { height } = Dimensions.get("window");

// --- Backend endpoints ---
const BASE_IP = "http://10.136.133.120:8000"; // update for your dev IP
const LATEST_URL = `${BASE_IP}/bills/latest?limit=3`;

type Bill = { title?: string; [k: string]: any };

const INTERESTS = [
  "Healthcare",
  "Education",
  "Environment",
  "Economy",
  "Congress",
  "Business",
];

export default function Dashboard() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [forYouBills, setForYouBills] = useState<Bill[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    "healthcare",
    "education",
    "environment",
  ]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 🧠 Fetch most recent bills
  const fetchBills = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    setLoading(true);
    try {
      const res = await axios.get(LATEST_URL, { signal, timeout: 10000 });
      const incoming = Array.isArray(res.data?.bills) ? res.data.bills : [];
      setBills(incoming);
    } catch (e: any) {
      console.log("[axios] failed to fetch latest bills", e);
      setError("Could not load recent bills");
    } finally {
      setLoading(false);
    }
  }, []);

  // 🧠 Fetch personalized “For You” bills
  const fetchForYouBills = useCallback(
    async (topics: string[], signal?: AbortSignal) => {
      try {
        const topicsParam =
          topics && topics.length > 0 ? topics.join(",") : "";
        const url = `${BASE_IP}/bills/interests?topics=${encodeURIComponent(
          topicsParam
        )}&limit=5`;
        const res = await axios.get(url, { signal, timeout: 10000 });
        const incoming = Array.isArray(res.data?.bills)
          ? res.data.bills.slice(0, 5)
          : [];
        setForYouBills(incoming);
        console.log(
          `[axios] fetched For You (${topicsParam}): ${incoming.length} bills`
        );
      } catch (e) {
        console.log("[axios] failed to fetch For You bills", e);
        setForYouBills([]);
      }
    },
    []
  );

  // 🌐 Fetch both sections when mounted
  useEffect(() => {
    const controller = new AbortController();
    fetchBills(controller.signal);
    fetchForYouBills(selectedTopics, controller.signal);
    return () => controller.abort();
  }, [fetchBills, fetchForYouBills, selectedTopics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const controller = new AbortController();
    await Promise.all([
      fetchBills(controller.signal),
      fetchForYouBills(selectedTopics, controller.signal),
    ]);
    controller.abort();
    setRefreshing(false);
  }, [fetchBills, fetchForYouBills]);

  const onProfilePress = () => {
    router.replace("/dashboard/profile");
  };
  const onLearnPress = () => {
    router.replace("/dashboard/learn");
  };

  const displayBills = useMemo(
    () =>
      bills.map((b, i) => {
        const title =
          typeof b.title === "string" && b.title.trim().length > 0
            ? b.title
            : "Untitled Bill";
        return {
          ...b,
          _displayTitle: title,
          _key: `${b.congress ?? "c"}-${b.type ?? "t"}-${
            b.number ?? i
          }-${i}`,
        };
      }),
    [bills]
  );

  const displayForYou = useMemo(
    () =>
      forYouBills.map((b, i) => {
        const title =
          typeof b.title === "string" && b.title.trim().length > 0
            ? b.title
            : "Untitled Bill";
        return {
          ...b,
          _displayTitle: title,
          _key: `forYou-${b.number ?? i}-${i}`,
        };
      }),
    [forYouBills]
  );

  // 🧭 Navigate to bill details
  const onBillPress = (billId: string) => {
    router.push({
      pathname: "/dashboard/bill/[id]",
      params: { id: billId },
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* ===== MOST RECENT ===== */}
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
                <TouchableOpacity
                  key={bill._key}
                  onPress={() => onBillPress(bill._key)}
                >
                  <View style={styles.billCard}>
                    <View style={styles.billLeft}>
                      <Text style={styles.billText} numberOfLines={3}>
                        {bill._displayTitle}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color="#666"
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* ===== FOR YOU ===== */}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>For You</Text>
          <View style={styles.fullWidthStack}>
            {displayForYou.length === 0 ? (
              <View style={[styles.billCard, { alignItems: "center" }]}>
                <Text style={styles.forYouText}>
                  No personalized bills found.
                </Text>
              </View>
            ) : (
              displayForYou.map((bill) => (
                <TouchableOpacity
                  key={bill._key}
                  onPress={() => onBillPress(bill._key)}
                >
                  <View style={styles.billCard}>
                    <View style={styles.billLeft}>
                      <Text style={styles.billText} numberOfLines={3}>
                        {bill._displayTitle}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color="#666"
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={{ height: Math.floor(height * 0.12) }} />
        </ScrollView>

        {/* ===== TAB BAR ===== */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabLeft} onPress={onLearnPress}>
            <Ionicons name="school-outline" size={26} />
            <Text style={styles.tabLabel}>Learn</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabCenter} onPress={() => {}}>
            <MaterialCommunityIcons name="receipt-text-outline" size={28} />
            <Text style={styles.tabLabel}>Bills</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabRight} onPress={onProfilePress}>
            <Ionicons name="person-outline" size={26} />
            <Text style={styles.tabLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ===== STYLES =====
const BG = "#f2f2f2";
const CARD = "#ffffff";
const TEXT_DARK = "#111";
const TOP_PAD =
  (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0) + 28;

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
  fullWidthStack: { marginHorizontal: -16, gap: 14, marginBottom: 8 },
  billCard: {
    backgroundColor: CARD,
    paddingVertical: 20,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  billLeft: { flex: 2, paddingRight: 8 },
  billRight: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  billText: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_DARK,
    lineHeight: 24,
  },
  chamberText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  skeleton: { backgroundColor: "#f7f7f7", borderColor: "#ededed" },
  forYouText: { color: "#444", fontSize: 14, lineHeight: 20 },
  errorText: { color: "#b00020", fontSize: 14 },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
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

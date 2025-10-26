import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { doc, getDoc } from "firebase/firestore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "expo-router";

type UserDoc = {
  fullName?: string;
  state?: string;
  zip?: string;
  interests?: string[];
  newsPreferences?: string[];
};


const RECENCY_LABEL: Record<string, string> = {
  "24h": "Past 24 hours",
  "3d": "Past 3 days",
  "1w": "Past week",
  "2w": "Past two weeks",
  "1m": "Past month",
};

export default function Profile() {
  const [data, setData] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchProfile = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError("Not signed in.");
        setData(null);
        setLoading(false);
        return;
      }
      const snap = await getDoc(doc(db, "users", uid));
      setData({
        ...(snap.exists() ? (snap.data() as UserDoc) : {}),
        fullName: auth.currentUser?.displayName || 'No name set'
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load profile");
      setData(null);
    } finally {
      setLoading(false);
    }  
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  const onProfilePress = () => {
    router.push("/dashboard/profile");
  };

  const recencyText = useMemo(() => {
    const key = data?.newsPreferences?.[0];
    return key ? (RECENCY_LABEL[key] ?? key) : "Not set";
  }, [data]);

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
          <Text style={styles.sectionTitle}>Your Profile</Text>

          <View style={styles.card}>
            {loading && !error ? (
              <>
                <View style={[styles.skeletonLine, { width: "70%" }]} />
                <View style={[styles.skeletonLine, { width: "55%" }]} />
                <View style={[styles.skeletonLine, { width: "85%" }]} />
                <View style={[styles.skeletonLine, { width: "40%" }]} />
              </>
            ) : error ? (
              <Text style={styles.errorText}>
                {error} — pull to refresh.
              </Text>
            ) : !data ? (
              <Text style={styles.muted}>No profile found.</Text>
            ) : (
              <>
                {/* Name under state & zip */}
                <Text style={styles.heading}>
                  {data.fullName || "Name not set"}
                </Text>

                {/* State & ZIP */}
                <Text style={styles.subHeading}>
                {`State / Zip: ${data?.state ?? "—"}${data?.zip ? `, ${data.zip}` : ""}`}
                </Text>

                

                {/* Preferences */}
                <Text style={styles.label}>Subject Preferences</Text>
                {Array.isArray(data.interests) && data.interests.length > 0 ? (
                  <View style={styles.chipsRow}>
                    {data.interests.map((t) => (
                      <View key={t} style={styles.chip}>
                        <Text style={styles.chipText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.muted}>No preferences selected.</Text>
                )}

                {/* News recency */}
                <Text style={[styles.label, { marginTop: 16 }]}>
                  News Recency preference
                </Text>
                <Text style={styles.bodyText}>{recencyText}</Text>
              </>
            )}
          </View>
        </ScrollView>
        <View style={styles.tabBar}>
          

          <TouchableOpacity style={styles.tab} onPress={() => {}}>
            <MaterialCommunityIcons name="receipt-text-outline" size={28} />
            <Text style={styles.tabLabel}>Bills</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tab} onPress={onProfilePress}>
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
const TOP_PAD = 50;
  (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0) + 28;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG, paddingTop: TOP_PAD },
  content: { paddingHorizontal: 16, paddingBottom: 24 },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: TEXT_DARK,
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  card: {
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

  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 4,
  },
  subHeading: {
    fontSize: 16,
    color: "#333",
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },

  bodyText: { fontSize: 16, color: TEXT_DARK },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#f7f7f7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e7e7e7",
  },
  chipText: { fontSize: 14, color: "#333" },

  muted: { color: "#666", fontSize: 14 },

  errorText: { color: "#b00020", fontSize: 14 },

  skeletonLine: {
    height: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 10,
  },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: "#e6e6e6",
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  tab: { alignItems: "center", flex: 1 },
  tabLabel: { fontSize: 11, marginTop: 4, color: "#333" },
});

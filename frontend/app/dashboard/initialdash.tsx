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
  Modal,
  Alert,
} from "react-native";
import axios from "axios";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const { height } = Dimensions.get("window");

// --- Backend endpoints ---
const BASE_IP = "http://10.136.133.120:8000"; // update for your dev IP
const LATEST_URL = `${BASE_IP}/bills/latest?limit=3`;

type Bill = {
  title?: string;
  congress?: string | number;
  type?: string;
  number?: string | number;
  [k: string]: any;
};

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
  const [savedBills, setSavedBills] = useState<string[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [billToSave, setBillToSave] = useState<Bill | null>(null);
  const [billToRemove, setBillToRemove] = useState<Bill | null>(null);
  
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();

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

  // 🧠 Fetch personalized "For You" bills
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

  // 🔥 Fetch saved bills from Firebase
  const fetchSavedBills = useCallback(async () => {
    if (!auth.currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSavedBills(userData.savedBills || []);
      }
    } catch (error) {
      console.log("Error fetching saved bills:", error);
    }
  }, [auth.currentUser, db]);

  // 🌐 Fetch both sections when mounted
  useEffect(() => {
    const controller = new AbortController();
    fetchBills(controller.signal);
    fetchForYouBills(selectedTopics, controller.signal);
    fetchSavedBills();
    return () => controller.abort();
  }, [fetchBills, fetchForYouBills, selectedTopics, fetchSavedBills]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const controller = new AbortController();
    await Promise.all([
      fetchBills(controller.signal),
      fetchForYouBills(selectedTopics, controller.signal),
      fetchSavedBills(),
    ]);
    controller.abort();
    setRefreshing(false);
  }, [fetchBills, fetchForYouBills, fetchSavedBills]);

  const onProfilePress = () => {
    router.push("/dashboard/profile");
  };

  // 🧭 Navigate to Learn page with bill as param
  const onBillPress = (bill: Bill) => {
    router.push({
      pathname: "/dashboard/learn",
      params: {
        title: bill.title || "Untitled Bill",
        congress: String(bill.congress ?? ""),
        type: String(bill.type ?? ""),
        number: String(bill.number ?? ""),
      },
    });
  };

  // ⭐ Handle star press - check if saving or removing
  const onStarPress = (bill: Bill) => {
    const billTitle = bill.title || "Untitled Bill";
    const isAlreadySaved = savedBills.includes(billTitle);
    
    if (isAlreadySaved) {
      setBillToRemove(bill);
      setShowRemoveModal(true);
    } else {
      setBillToSave(bill);
      setShowSaveModal(true);
    }
  };

  // 💾 Save bill to Firebase
  const saveBillToFirebase = async () => {
    if (!auth.currentUser || !billToSave) return;

    try {
      const billTitle = billToSave.title || "Untitled Bill";
      const userRef = doc(db, "users", auth.currentUser.uid);
      
      await updateDoc(userRef, {
        savedBills: arrayUnion(billTitle)
      });

      setSavedBills(prev => [...prev, billTitle]);
      setShowSaveModal(false);
      setBillToSave(null);
      
      Alert.alert("Success", "Bill saved successfully!");
    } catch (error) {
      console.log("Error saving bill:", error);
      Alert.alert("Error", "Failed to save bill. Please try again.");
    }
  };

  // 🗑️ Remove bill from Firebase
  const removeBillFromFirebase = async () => {
    if (!auth.currentUser || !billToRemove) return;

    try {
      const billTitle = billToRemove.title || "Untitled Bill";
      const userRef = doc(db, "users", auth.currentUser.uid);
      
      await updateDoc(userRef, {
        savedBills: arrayRemove(billTitle)
      });

      setSavedBills(prev => prev.filter(title => title !== billTitle));
      setShowRemoveModal(false);
      setBillToRemove(null);
      
      Alert.alert("Success", "Bill removed from favorites!");
    } catch (error) {
      console.log("Error removing bill:", error);
      Alert.alert("Error", "Failed to remove bill. Please try again.");
    }
  };

  // Check if bill is saved
  const isBillSaved = (bill: Bill) => {
    const billTitle = bill.title || "Untitled Bill";
    return savedBills.includes(billTitle);
  };

  // Format the bills properly for display
  const displayBills = useMemo(
    () =>
      bills.map((b, i) => {
        const title =
          typeof b.title === "string" && b.title.trim().length > 0
            ? b.title
            : "Untitled Bill";
        const congress = b.congress ?? "unknown";
        const billType = b.type ?? "unknown";
        const number = b.number ?? i;
        return {
          ...b,
          _displayTitle: title,
          _key: `${congress}-${billType}-${number}-${i}`,
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
        const congress = b.congress ?? "unknown";
        const billType = b.type ?? "unknown";
        const number = b.number ?? i;
        return {
          ...b,
          _displayTitle: title,
          _key: `forYou-${billType}-${number}-${i}`,
        };
      }),
    [forYouBills]
  );

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
                  Couldn't load bills ({error}). Pull to refresh.
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
                  onPress={() => onBillPress(bill)}
                >
                  <View style={styles.billCard}>
                    <View style={styles.billLeft}>
                      <Text style={styles.billText} numberOfLines={3}>
                        {bill._displayTitle}
                      </Text>
                    </View>
                    <View style={styles.billRight}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          onStarPress(bill);
                        }}
                        style={styles.starButton}
                      >
                        <Ionicons
                          name={isBillSaved(bill) ? "star" : "star-outline"}
                          size={22}
                          color={isBillSaved(bill) ? "#FFD700" : "#999"}
                        />
                      </TouchableOpacity>
                      <Ionicons name="chevron-forward" size={22} color="#666" />
                    </View>
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
                  onPress={() => onBillPress(bill)}
                >
                  <View style={styles.billCard}>
                    <View style={styles.billLeft}>
                      <Text style={styles.billText} numberOfLines={3}>
                        {bill._displayTitle}
                      </Text>
                    </View>
                    <View style={styles.billRight}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          onStarPress(bill);
                        }}
                        style={styles.starButton}
                      >
                        <Ionicons
                          name={isBillSaved(bill) ? "star" : "star-outline"}
                          size={22}
                          color={isBillSaved(bill) ? "#FFD700" : "#999"}
                        />
                      </TouchableOpacity>
                      <Ionicons name="chevron-forward" size={22} color="#666" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
          <View style={{ height: Math.floor(height * 0.12) }} />
        </ScrollView>

        {/* ===== TAB BAR ===== */}
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

        {/* ===== SAVE BILL MODAL ===== */}
        <Modal
          visible={showSaveModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSaveModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Save Bill</Text>
              <Text style={styles.modalText}>
                Do you want to save this bill?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowSaveModal(false);
                    setBillToSave(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={saveBillToFirebase}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ===== REMOVE BILL MODAL ===== */}
        <Modal
          visible={showRemoveModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRemoveModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Remove from Favorites</Text>
              <Text style={styles.modalText}>
                Do you want to remove this bill from favorites?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowRemoveModal(false);
                    setBillToRemove(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.removeButton]}
                  onPress={removeBillFromFirebase}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

// ===== STYLES =====
const BG = "#f2f2f2";
const CARD = "#ffffff";
const TEXT_DARK = "#111";
const TOP_PAD = Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 0) + 28;

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
  billLeft: { flex: 1, paddingRight: 8 },
  billRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  starButton: {
    padding: 4,
  },
  billText: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_DARK,
    lineHeight: 24,
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
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  tab: { alignItems: "center", flex: 1 },
  tabLabel: { fontSize: 11, marginTop: 4, color: "#333" },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    minWidth: 280,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: TEXT_DARK,
    marginBottom: 8,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  confirmButton: {
    backgroundColor: "#007AFF",
  },
  removeButton: {
    backgroundColor: "#FF3B30",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
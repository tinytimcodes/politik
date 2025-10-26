// app/learn.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  TextInput,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import axios from "axios";
import { useAuth } from "../../lib/AuthContext";
import { db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Image } from "react-native";
import defaultAvatar from "../../assets/images/prof.png";

function getPartyColor(sponsor: string | undefined): string {
  if (!sponsor) return "#ccc";
  const match = sponsor.match(/\[(.)\]/);
  if (!match) return "#ccc";
  const letter = match[1].toUpperCase();
  if (letter === "D") return "#007AFF"; // Blue for Democrats
  if (letter === "R") return "#FF3B30"; // Red for Republicans
  return "#ccc"; // Neutral fallback
}



const BASE_IP = "http://10.136.133.120:8000";

export default function Learn() {

  const { user } = useAuth();   // ✅ access logged-in user
  const [userProfile, setUserProfile] = useState<any>(null);

  const { title, congress, type, number } = useLocalSearchParams();
  const [mode, setMode] = useState<"details" | "ai">("details");
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- AI Summary state ---
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  // --- AI Chat state ---
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // --- Fetch user profile ---
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      try {
        const userDoc = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDoc);
        setUserProfile(docSnap.data());
      } catch (err) {
        console.error("❌ Failed to fetch user profile:", err);
      }
    };

    fetchUserProfile();
  }, [user]);

  // --- Fetch bill details ---
  useEffect(() => {
    const fetchBill = async () => {
      setError(null);
      setLoading(true);
      try {
        const url = `${BASE_IP}/bills/billdetails?congress=${congress}&billType=${type}&billNumber=${number}`;
        const res = await axios.get(url);
        const data = res.data.bill || res.data;
        const billData = data.bill || data;

        const newBill = {
          title: billData.title || title || "N/A",
          introducedDate: billData.introducedDate || "N/A",
          latestAction:
            billData.latestAction?.text || billData.latestAction || "N/A",
          sponsor:
            billData.sponsors?.[0]?.fullName || billData.sponsor || "N/A",
          subjects: billData.policyArea
            ? [billData.policyArea.name]
            : billData.subjects || [],
          summary: billData.summary || "N/A",
          congress,
          type,
          number,
          rawData: billData,
        };

        setBill(newBill);
      } catch (err) {
        console.warn("❌ Failed to fetch bill details:", err);
        setError("Unable to load bill info. Showing default data.");
        setBill({
          title: title,
          introducedDate: "N/A",
          latestAction: "N/A",
          sponsor: "N/A",
          subjects: [],
          summary: "N/A",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [mode]);

  // --- Fetch AI Summary once bill loads ---
  useEffect(() => {
    const fetchAiSummary = async () => {
      if (!bill || mode !== "details") return;
      setAiSummaryLoading(true);
      try {
        const res = await axios.post(`${BASE_IP}/ai/summarize`, { bill });
        setAiSummary(res.data.summary || "⚠️ No AI summary available.");
      } catch (err) {
        console.error("❌ AI Summary Error:", err);
        setAiSummary("⚠️ Failed to generate AI summary.");
      } finally {
        setAiSummaryLoading(false);
      }
    };

    fetchAiSummary();
  }, [bill, mode]);

  // --- Auto greeting in AI mode ---
  // --- Auto greeting in AI mode ---
    useEffect(() => {
    if (mode === "ai" && bill && messages.length === 0) {
        const userState = userProfile?.state || "the United States";
        const greeting = {
        role: "assistant",
        content: `What can I tell you about the "${bill.title}"?\n\nI’m here as a representative from ${userState} to better explain how this bill may relate to your region and community.`,
        };
        setMessages([greeting]);
    }
    }, [mode, bill, userProfile]);


  // --- Send AI chat message ---
  const sendMessage = async () => {
  if (!input.trim() || !bill) return;
  const userMessage = { role: "user", content: input.trim() };
  const updated = [...messages, userMessage];
  setMessages(updated);
  setInput("");
  setSending(true);
  try {
    const res = await axios.post(`${BASE_IP}/ai/chat`, {
      bill,
      messages: updated,
      userState: userProfile?.state || "the United States", // ✅ send state to backend
    });
    const reply = res.data.reply || "⚠️ No response.";
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
  } catch (err) {
    console.error("Chat error:", err);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "⚠️ Failed to get AI response." },
    ]);
  } finally {
    setSending(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
  }
};


  // === UI ===
  return (
    <View style={styles.safeRoot}>
      <View style={styles.root}>
        {/* === MODE TOGGLE === */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, mode === "details" && styles.toggleActive]}
            onPress={() => setMode("details")}
          >
            <Text style={[styles.toggleText, mode === "details" && styles.toggleTextActive]}>
              General Details
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, mode === "ai" && styles.toggleActive]}
            onPress={() => setMode("ai")}
          >
            <Text style={[styles.toggleText, mode === "ai" && styles.toggleTextActive]}>
              AI Mode
            </Text>
          </TouchableOpacity>
        </View>

        {/* === DETAILS MODE === */}
        {mode === "details" ? (
          <ScrollView contentContainerStyle={styles.content}>
            {loading ? (
              <ActivityIndicator size="large" color="#444" style={{ marginTop: 40 }} />
            ) : (
              <>
                {error && <Text style={styles.errorText}>{error}</Text>}
                <Text style={styles.title}>{bill?.title || "N/A"}</Text>
                <Text style={styles.meta}>
                  Congress {congress} | {type?.toString().toUpperCase()} {number}
                </Text>

                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Introduced</Text>
                  <Text style={styles.sectionBody}>{bill?.introducedDate}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Latest Action</Text>
                  <Text style={styles.sectionBody}>{bill?.latestAction}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Sponsor</Text>
                  <Text style={styles.sectionBody}>{bill?.sponsor}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Subjects</Text>
                  <Text style={styles.sectionBody}>
                    {bill?.subjects?.length ? bill.subjects.join(", ") : "N/A"}
                  </Text>
                </View>

                {/* === AI Summary Section === */}
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>AI Summary</Text>
                  {aiSummaryLoading ? (
                    <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 10 }} />
                  ) : (
                    <Text style={styles.sectionBody}>
                      {aiSummary || "⚠️ No AI summary available."}
                    </Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        ) : (
          // === AI CHAT MODE ===
          <View style={styles.chatContainer}>
            <ScrollView
              style={styles.chatScroll}
              ref={scrollViewRef}
              onContentSizeChange={() =>
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }
            >
              {messages.map((m, i) =>
                m.role === "assistant" ? (
                    <View key={i} style={styles.botRow}>
                    <Image
                        source={defaultAvatar}
                        style={[
                            styles.botAvatar,
                            { borderColor: getPartyColor(bill?.sponsor), borderWidth: 2 },
                        ]}
                        />

                    <View style={[styles.chatBubble, styles.botBubble]}>
                        <Text style={styles.chatText}>{m.content}</Text>
                    </View>
                    </View>
                ) : (
                    <View key={i} style={[styles.chatBubble, styles.userBubble]}>
                    <Text style={[styles.chatText, { color: "#fff" }]}>{m.content}</Text>
                    </View>
                )
                )}

            </ScrollView>

            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                value={input}
                onChangeText={setInput}
                placeholder="Ask about the bill..."
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.chatSendButton}
                onPress={sendMessage}
                disabled={sending}
              >
                <Text style={{ color: "#fff" }}>{sending ? "..." : "Send"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ===== STYLES =====
const TOP_PAD =
  (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0) + 12;

const styles = StyleSheet.create({
  safeRoot: { flex: 1, backgroundColor: "#f9f9f9", paddingTop: 20 },
  root: { flex: 1, backgroundColor: "#f9f9f9", paddingTop: TOP_PAD },
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
  toggleText: { fontSize: 16, fontWeight: "600", color: "#666" },
  toggleTextActive: { color: "#007AFF" },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 6, color: "#111" },
  meta: { fontSize: 15, color: "#555", marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionHeader: { fontSize: 16, fontWeight: "700", color: "#222", marginBottom: 4 },
  sectionBody: { fontSize: 15, color: "#333", lineHeight: 22 },
  errorText: {
    color: "#b00020",
    marginTop: 10,
    marginBottom: 10,
    fontSize: 14,
    textAlign: "center",
  },
  // --- Chat Styles ---
  chatContainer: { flex: 1, backgroundColor: "#f9f9f9", padding: 10 },
  chatScroll: { flex: 1, marginBottom: 60 },
  chatBubble: {
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
    maxWidth: "80%",
  },
  userBubble: { backgroundColor: "#007AFF", alignSelf: "flex-end" },
  botBubble: { backgroundColor: "#eaeaea", alignSelf: "flex-start" },
  chatText: { fontSize: 15, color: "#000" },
  chatInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 6,
  },
  chatInput: { flex: 1, padding: 10, color: "#000" },
  chatSendButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 6,
  },
  botRow: {
  flexDirection: "row",
  alignItems: "flex-start",
  marginVertical: 6,
  maxWidth: "90%",
  alignSelf: "flex-start",
},
botAvatar: {
  width: 40,
  height: 40,
  borderRadius: 20,
  marginRight: 8,
  backgroundColor: "#ccc",
},
});
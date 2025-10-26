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

const BASE_IP = "http://10.136.133.120:8000";

export default function Learn() {
  const { title, congress, type, number } = useLocalSearchParams();
  const [mode, setMode] = useState<"details" | "ai">("details");
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // summaries dropdown
  const [showSummaries, setShowSummaries] = useState(false);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [summariesError, setSummariesError] = useState<string | null>(null);

  // AI Chat state
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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

        setBill({
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
        });
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

    if (mode === "details" || mode === "ai") fetchBill();
  }, [mode]);

  // --- Auto-generate summary immediately when AI mode opens ---
  // --- Auto-start chat when AI mode opens ---
// --- Auto-greeting from AI when AI mode opens ---
useEffect(() => {
  if (mode === "ai" && bill && messages.length === 0) {
    const greeting = {
      role: "assistant",
      content: `👋 What can I tell you about the "${bill.title}"?`,
    };
    setMessages([greeting]);
  }
}, [mode, bill]);



  // --- Fetch summaries dropdown ---
  const fetchSummaries = async () => {
    if (showSummaries) return setShowSummaries(false);
    setSummariesLoading(true);
    setSummariesError(null);
    try {
      const url = `${BASE_IP}/bills/billsummaries?congress=${congress}&billType=${type}&billNumber=${number}`;
      const res = await axios.get(url);
      const list = res.data.summaries || res.data?.summaries || [];
      setSummaries(
        list.map((s: any) => ({
          date: s.updateDate || s.actionDate || "N/A",
          text: s.text || "No summary available.",
        }))
      );
      setShowSummaries(true);
    } catch (err) {
      console.warn("❌ Failed to fetch summaries:", err);
      setSummariesError("Unable to load summaries.");
    } finally {
      setSummariesLoading(false);
    }
  };

  // --- Send AI message ---
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

                {/* === SUMMARY SECTION === */}
                <View style={styles.section}>
                  <TouchableOpacity onPress={fetchSummaries} style={styles.dropdownHeader}>
                    <Text style={styles.sectionHeader}>
                      {showSummaries ? "▼ Bill Summaries" : "▶ Bill Summaries"}
                    </Text>
                  </TouchableOpacity>

                  {showSummaries && (
                    <View style={{ marginTop: 8 }}>
                      {summariesLoading ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                      ) : summariesError ? (
                        <Text style={styles.errorText}>{summariesError}</Text>
                      ) : summaries.length > 0 ? (
                        summaries.map((s, idx) => (
                          <View key={idx} style={styles.summaryItem}>
                            <Text style={styles.summaryDate}>🗓 {s.date}</Text>
                            <Text style={styles.summaryText}>{s.text}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.sectionBody}>No summaries available.</Text>
                      )}
                    </View>
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
              {messages.map((m, i) => (
                <View
                  key={i}
                  style={[
                    styles.chatBubble,
                    m.role === "user" ? styles.userBubble : styles.botBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatText,
                      m.role === "user" && { color: "#fff" },
                    ]}
                  >
                    {m.content}
                  </Text>
                </View>
              ))}
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
  dropdownHeader: { flexDirection: "row", alignItems: "center" },
  summaryItem: {
    backgroundColor: "#f0f6ff",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  summaryDate: { fontSize: 13, color: "#007AFF", fontWeight: "600", marginBottom: 4 },
  summaryText: { fontSize: 14, color: "#333", lineHeight: 20 },
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
});

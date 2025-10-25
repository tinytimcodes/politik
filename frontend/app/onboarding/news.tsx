import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";

const HEADLINE_FONT = Platform.select({
  ios: "Georgia",
  android: "serif",
  web: "Georgia, 'Times New Roman', serif",
  default: undefined,
});

const BODY_FONT = Platform.select({
  ios: "System",
  android: "sans-serif",
  web: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  default: undefined,
});

const NEWS_RECENCY_OPTIONS = [
  { label: "Past 24 hours", value: "24h" },
  { label: "Past 3 days", value: "3d" },
  { label: "Past week", value: "1w" },
  { label: "Past two weeks", value: "2w" },
  { label: "Past month", value: "1m" }
];

export default function NewsScreen() {
  const router = useRouter();
  const [selectedRecency, setSelectedRecency] = useState<string>("");

  const handleContinue = () => {
    router.replace("/");
  };

  const handleSkip = () => {
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.linkText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.copyBlock}>
          <Text style={styles.title}>How recent should your news be?</Text>
          <Text style={styles.subtitle}>
            Choose how far back you'd like to see political news and updates.
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {NEWS_RECENCY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                selectedRecency === option.value && styles.optionButtonSelected
              ]}
              onPress={() => setSelectedRecency(option.value)}
            >
              <Text style={[
                styles.optionText,
                selectedRecency === option.value && styles.optionTextSelected
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>Finished!</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.progressDotCompleted]} />
        <View style={[styles.progressDot, styles.progressDotCompleted]} />
        <View style={[styles.progressDot, styles.progressDotCompleted]} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b132b",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  linkText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingBottom: 48,
  },
  copyBlock: {
    gap: 12,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    fontFamily: HEADLINE_FONT,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    fontFamily: BODY_FONT,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 40,
  },
  optionButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  optionButtonSelected: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.4)",
  },
  optionText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontWeight: "500",
    fontFamily: BODY_FONT,
  },
  optionTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#ef233c",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: BODY_FONT,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  progressDotCompleted: {
    backgroundColor: "#ffffff",
  },
  progressDotActive: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
});

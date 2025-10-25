import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
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

export default function LocationScreen() {
  const router = useRouter();
  const [stateValue, setStateValue] = useState("");
  const [zipValue, setZipValue] = useState("");

  const handleContinue = () => {
    router.push("/onboarding/interests");
  };

  const handleSkip = () => {
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.copyBlock}>
            <Text style={styles.title}>Tell us about your location</Text>
            <Text style={styles.subtitle}>
              Share your state and ZIP code so we can surface civic updates that
              matter to you.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>State</Text>
            <TextInput
              value={stateValue}
              onChangeText={setStateValue}
              placeholder="e.g. New York"
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={styles.label}>ZIP code</Text>
            <TextInput
              value={zipValue}
              onChangeText={setZipValue}
              placeholder="e.g. 10001"
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={styles.input}
              keyboardType="number-pad"
              returnKeyType="done"
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b132b",
  },
  inner: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  linkText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 48,
  },
  copyBlock: {
    gap: 12,
    marginBottom: 24,
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
  form: {
    gap: 16,
    marginBottom: 32,
  },
  label: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    width: "100%",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    fontSize: 16,
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
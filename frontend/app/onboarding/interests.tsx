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

const EVENT_TYPES = [
  "Environment",
  "Economy", 
  "Congress",
  "Healthcare",
  "Education",
  "Business"
];

const PROFICIENCY_LEVELS = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Expert", value: "expert" }
];

export default function InterestsScreen() {
  const router = useRouter();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedProficiency, setSelectedProficiency] = useState<string>("");

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(item => item !== interest)
        : [...prev, interest]
    );
  };

  const handleContinue = () => {
    router.push("/onboarding/news");
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
          <Text style={styles.title}>What interests you?</Text>
          <Text style={styles.subtitle}>
            Select the topics you'd like to stay informed about. You can choose multiple.
          </Text>
        </View>

        <View style={styles.interestsGrid}>
          {EVENT_TYPES.map((interest) => (
            <TouchableOpacity
              key={interest}
              style={[
                styles.interestBubble,
                selectedInterests.includes(interest) && styles.interestBubbleSelected
              ]}
              onPress={() => toggleInterest(interest)}
            >
              <Text style={[
                styles.interestText,
                selectedInterests.includes(interest) && styles.interestTextSelected
              ]}>
                {interest}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.proficiencySection}>
          <Text style={styles.sectionTitle}>How would you rate your political knowledge?</Text>
          <View style={styles.proficiencyOptions}>
            {PROFICIENCY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.proficiencyButton,
                  selectedProficiency === level.value && styles.proficiencyButtonSelected
                ]}
                onPress={() => setSelectedProficiency(level.value)}
              >
                <Text style={[
                  styles.proficiencyText,
                  selectedProficiency === level.value && styles.proficiencyTextSelected
                ]}>
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.progressDotCompleted]} />
        <View style={[styles.progressDot, styles.progressDotCompleted]} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
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
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 40,
  },
  interestBubble: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  interestBubbleSelected: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderColor: "rgba(255,255,255,0.4)",
  },
  interestText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: BODY_FONT,
  },
  interestTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  proficiencySection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 16,
    fontFamily: BODY_FONT,
  },
  proficiencyOptions: {
    gap: 12,
  },
  proficiencyButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  proficiencyButtonSelected: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.4)",
  },
  proficiencyText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontWeight: "500",
    fontFamily: BODY_FONT,
  },
  proficiencyTextSelected: {
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

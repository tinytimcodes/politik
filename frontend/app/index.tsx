import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform
} from "react-native";

const HEADLINE_FONT = Platform.select({
  ios: "Georgia",                                // iOS serif (Cheltenham-ish vibe)
  android: "serif",                              // Android generic serif
  web: "Georgia, 'Times New Roman', serif",      // RN web maps to CSS
  default: undefined,
});

const BODY_FONT = Platform.select({
  ios: "System",                                 // San Francisco
  android: "sans-serif",                         // Roboto
  web: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  default: undefined,
});

const { width, height } = Dimensions.get("window");

export default function Index() {
  const [isLogin, setIsLogin] = useState(true);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();
  const redTranslate = useRef(new Animated.Value(0)).current;
  const blueTranslate = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(redTranslate, {
          toValue: -width / 2,   // slide straight left
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(blueTranslate, {
          toValue: width / 2,    // slide straight right
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => setAnimationFinished(true));
    }, 400);
  
    return () => clearTimeout(timeout);
  }, [blueTranslate, logoOpacity, redTranslate]);
  
  const toggleAuthMode = () => setIsLogin((prev) => !prev);
  
  const handlePrimaryPress = () => {
    if (isLogin) {
      return;
    }

    // Validate required fields for sign up
    if (!email.trim() || !password.trim()) {
      return; // Don't proceed if email or password is empty
    }

    router.push("/onboarding/location");
  };
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
  
      <View style={styles.authContainer}>
        <Text style={styles.title}>Politik</Text>
        <Text style={styles.subtitle}>
          {isLogin ? "Sign in to continue" : "Create a new account"}
        </Text>
  
        <View style={styles.form}>
          {!isLogin && (
            <TextInput
              placeholder="Full name (optional)"
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
            />
          )}
          <TextInput
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.6)"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.6)"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
  
          <TouchableOpacity 
            style={[
              styles.primaryButton,
              !isLogin && (!email.trim() || !password.trim()) && styles.primaryButtonDisabled
            ]} 
            onPress={handlePrimaryPress}
            disabled={!isLogin && (!email.trim() || !password.trim())}
          >
            <Text style={[
              styles.primaryButtonText,
              !isLogin && (!email.trim() || !password.trim()) && styles.primaryButtonTextDisabled
            ]}>
              {isLogin ? "Log In" : "Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
  
        <TouchableOpacity onPress={toggleAuthMode} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>
            {isLogin
              ? "New here? Create an account"
              : "Already have an account? Log in"}
          </Text>
        </TouchableOpacity>
      </View>

      {!isLogin && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
      )}
  
      {!animationFinished && (
  <View style={styles.splashContainer} pointerEvents="none">
    {/* left/red panel */}
    <Animated.View
      style={[
        styles.panel,
        styles.redPanel,
        { transform: [{ translateX: redTranslate }] },
      ]}
    />
    {/* right/blue panel */}
    <Animated.View
      style={[
        styles.panel,
        styles.bluePanel,
        { transform: [{ translateX: blueTranslate }] },
      ]}
    />
    <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
      <Text style={styles.logoText}>P</Text>
    </Animated.View>
  </View>
)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b132b",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  authContainer: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(10, 12, 24, 0.8)",
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
  },
  form: {
    gap: 12,
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
    marginTop: 8,
    backgroundColor: "#ef233c",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButtonDisabled: {
    backgroundColor: "rgba(239, 35, 60, 0.3)",
  },
  primaryButtonTextDisabled: {
    color: "rgba(255,255,255,0.5)",
  },
  secondaryButton: {
    alignSelf: "center",
  },
  secondaryButtonText: {
    color: "#4cc9f0",
    fontSize: 14,
    fontWeight: "500",
  },
  splashContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  panel: {
    position: "absolute",
    top: 0,
    height: height,
    width: width / 2,     // each panel covers half the screen
  },
  redPanel: {
    left: 0,              // start flush on the left half
    backgroundColor: "#d90429",
  },
  bluePanel: {
    right: 0,             // start flush on the right half
    backgroundColor: "#1d3557",
  },
  logoContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: Math.min(width, height) * 0.4,
    color: "#000000",
    fontWeight: "900",
    letterSpacing: -8,
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
  progressDotActive: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
});
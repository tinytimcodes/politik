import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import { auth } from "@/lib/firebase";
import { useAuth } from "../lib/AuthContext";

import AsyncStorage from '@react-native-async-storage/async-storage';




const getFriendlyAuthError = (error: any, isLogin: boolean): string => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return isLogin 
          ? 'Failed to sign in. Please try again.' 
          : 'Failed to create account. Please try again.';
    }
  }
  return isLogin 
    ? 'Failed to sign in. Please try again.' 
    : 'Failed to create account. Please try again.';
};

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
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const { user, loading } = useAuth();
  const [restoringFromStorage, setRestoringFromStorage] = useState(true);
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

  useEffect(() => {
  const checkStoredSession = async () => {
    if (user || loading) {
      setRestoringFromStorage(false);
      return;
    }

    try {
      const storedCredentials = await AsyncStorage.getItem('authUser'); // use your actual key
      if (storedCredentials) {
        router.replace('/dashboard/initialdash');
        return;
      }
    } catch (error) {
      console.warn('Failed to restore session from storage', error);
    } finally {
      setRestoringFromStorage(false);
    }
  };

  checkStoredSession();
}, [user, loading, router]);


  // Redirect authenticated users
  // useEffect(() => {
  //   if (!loading && user) {
  //     router.replace("/onboarding/news");
  //   }
  // }, [user, loading, router]);
  
  const toggleAuthMode = () => {
    setIsLogin((prev) => !prev);
    setAuthError(null);
  };
  
  const handlePrimaryPress = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedFullName = fullName.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setAuthError("Email and password are required.");
      return;
    }

    setAuthError(null);
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        router.replace("/dashboard/initialdash");
      } else {
        const credential = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          trimmedPassword
        );

        if (trimmedFullName) {
          await updateProfile(credential.user, { displayName: trimmedFullName });
        }

        router.replace("/onboarding/location");
      }
    } catch (error) {
      setAuthError(getFriendlyAuthError(error, isLogin));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormIncomplete = !email.trim() || !password.trim();
  const isPrimaryDisabled = isFormIncomplete || isSubmitting;

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef233c" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

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
  
          {authError && (
            <Text style={styles.errorText}>{authError}</Text>
          )}

          <TouchableOpacity 
            style={[
              styles.primaryButton,
              isPrimaryDisabled && styles.primaryButtonDisabled
            ]} 
            onPress={handlePrimaryPress}
            disabled={isPrimaryDisabled}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={[
                styles.primaryButtonText,
                isPrimaryDisabled && styles.primaryButtonTextDisabled
              ]}>
                {isLogin ? "Log In" : "Sign Up"}
              </Text>
            )}
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
  errorText: {
    color: "#ef233c",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b132b",
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 16,
    marginTop: 16,
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

import { Stack } from "expo-router";

export default function OnboardingLayout() {
  // hide the header for onboarding screens so the top title doesn't appear
  return <Stack screenOptions={{ headerShown: false }} />;
}

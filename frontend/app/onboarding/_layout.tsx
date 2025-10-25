import { Stack } from "expo-router";
import { ProtectedRoute } from "../../components/ProtectedRoute";

export default function OnboardingLayout() {
  return (
    <ProtectedRoute>
      <Stack screenOptions={{ headerShown: false }} />
    </ProtectedRoute>
  );
}

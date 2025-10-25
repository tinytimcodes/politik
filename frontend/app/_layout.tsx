import { Stack } from "expo-router";

export default function RootLayout() {
  // hide the default header/title for the root navigation stack
  return <Stack screenOptions={{ headerShown: false }} />;
}

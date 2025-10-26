import { useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";

export default function Learn() {
  const { title, congress, type, number } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>{title}</Text>
      <Text>
        Congress {congress} | {type} {number}
      </Text>
      {/* Your learn page content here */}
    </View>
  );
}

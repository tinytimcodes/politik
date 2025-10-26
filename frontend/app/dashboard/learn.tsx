import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";

export default function LearnScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Learn</Text>
    </View>
  );
}



const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
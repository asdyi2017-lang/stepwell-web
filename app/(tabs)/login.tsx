import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { apiLogin } from "../../lib/api";
import { saveToken } from "../../lib/auth";
import { LinearGradient } from "expo-linear-gradient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    try {
      setLoading(true);
      const res = await apiLogin({ email, password });
      await saveToken(res.token);
      router.replace("/(tabs)/home" as any);
    } catch (e: any) {
      Alert.alert("Login failed", e?.message || "Wrong email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient 
      colors={["#FFFFFF", "#DCEAEC"]} 
      style={s.container}
    >
      <View style={s.screen}>
        <View style={s.card}>
          <Text style={s.title}>Sign in</Text>
          <Text style={s.subtitle}>Welcome back to StepWell</Text>

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="name@example.com"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={({ pressed }) => [
              s.primaryBtn,
              pressed && Platform.OS !== "web" ? { opacity: 0.9 } : null,
              loading ? { opacity: 0.7 } : null,
            ]}
            onPress={onLogin}
            disabled={loading}
          >
            <Text style={s.primaryBtnText}>{loading ? "Signing in..." : "Sign in"}</Text>
          </Pressable>

          <View style={s.row}>
            <Text style={s.muted}>No account?</Text>

            <Pressable onPress={() => router.push("/(tabs)/register" as any)}>
              <Text style={s.link}>Create one</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, 
  },
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#FFFFFF",
    borderRadius: 24, 
    padding: 28, 
    borderWidth: 1,
    borderColor: "#E8EEF2",
    ...Platform.select({
      web: { boxShadow: "0px 12px 40px rgba(30, 111, 120, 0.08)" as any }, 
      default: { elevation: 6 },
    }),
  },
  title: {
    fontSize: 28, 
    fontWeight: "900",
    color: "#1E6F78", 
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 22,
    color: "#6A8085",
    fontSize: 14,
    fontWeight: "600",
  },
  label: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 13,
    color: "#20363A",
    fontWeight: "800",
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: "#DCEAEC",
    backgroundColor: "#F8FAFC", 
    borderRadius: 14,
    paddingHorizontal: 16,
    color: "#20363A",
    fontSize: 15,
    fontWeight: "600",
  },
  primaryBtn: {
    marginTop: 24,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#1E6F78",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  row: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  muted: {
    color: "#6A8085",
    fontSize: 14,
    fontWeight: "600",
  },
  link: {
    color: "#1E6F78",
    fontSize: 14,
    fontWeight: "900",
  },
});
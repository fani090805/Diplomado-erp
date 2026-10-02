import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { apiClient } from "@erp/api-client";
import { useAuthStore } from "../store/authStore";

export const LoginScreen = () => {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const session = await apiClient.login(email, password);
      login({
        userName: session.user.name,
        companyName: session.user.companyName,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible iniciar sesión.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar sesión</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Correo"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        secureTextEntry
        autoComplete="current-password"
      />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? "Ingresando…" : "Entrar"}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f5f7fb",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});

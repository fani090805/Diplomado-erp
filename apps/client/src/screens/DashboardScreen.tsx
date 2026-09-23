import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

export const DashboardScreen = () => {
  const { userName, companyName } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Bienvenido(a), {userName}</Text>
      <Text style={styles.company}>{companyName}</Text>
      <Text style={styles.emptyState}>Dashboard vacío</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    justifyContent: 'center',
    padding: 24
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827'
  },
  company: {
    fontSize: 18,
    color: '#4b5563',
    marginTop: 8,
    marginBottom: 18
  },
  emptyState: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: '600'
  }
});

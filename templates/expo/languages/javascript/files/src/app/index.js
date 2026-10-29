import { StyleSheet, Text, View } from 'react-native';
import { Counter } from '../components/counter';

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>React Native + Expo + JavaScript</Text>
      <Text style={styles.title}>{'mob-ts'}</Text>
      <Text style={styles.body}>Edit src/app/index.js to get started.</Text>
      <Counter />
      <Text style={styles.caption}>API: {apiUrl ?? 'not configured'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  eyebrow: { fontSize: 12, fontWeight: '600', letterSpacing: 1, color: '#2563eb' },
  title: { fontSize: 28, fontWeight: '700' },
  body: { fontSize: 16, textAlign: 'center' },
  caption: { fontSize: 12, opacity: 0.6 },
});

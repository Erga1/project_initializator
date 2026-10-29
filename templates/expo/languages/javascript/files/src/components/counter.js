import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => setCount((value) => value + 1)}
      style={styles.button}
    >
      <Text style={styles.label}>Count is {count}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  label: { color: 'white', fontSize: 16, fontWeight: '600' },
});

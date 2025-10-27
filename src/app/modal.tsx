import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modal</Text>
      <Text style={styles.subtitle}>Modals are great for quick actions or confirmations.</Text>
      <Link href="/" dismissTo style={styles.link}>
        <Text style={styles.linkText}>Go back home</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  link: {
    marginTop: 12,
  },
  linkText: {
    fontSize: 16,
    color: '#2f95dc',
    fontWeight: '500',
  },
});

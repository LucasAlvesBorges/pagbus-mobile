import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrencyWithSymbol } from '../../utils/currency';
import { getCurrentBrasiliaDateTime } from '../../utils/date';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { tariffName, tariffValue, transactionId, busLineId, busLineName, busLineCode, vehiclePrefix } = params;

  const handleBackToHome = () => {
    // Voltar para tabs que mostra payment/index (vai carregar a seleção salva do SecureStore)
    router.replace('/(tabs)' as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" hidden />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Ícone de sucesso animado */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={120} color="#27C992" />
          </View>
        </View>

        {/* Título */}
        <Text style={styles.title}>Pagamento Confirmado!</Text>
        <Text style={styles.subtitle}>A passagem foi paga com sucesso</Text>

        {/* Card com informações */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={24} color="#27C992" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Valor Pago</Text>
              <Text style={styles.infoValue}>{formatCurrencyWithSymbol(Array.isArray(tariffValue) ? tariffValue[0] : tariffValue)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={24} color="#27C992" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Data/Hora</Text>
              <Text style={styles.infoValue}>
                {getCurrentBrasiliaDateTime()}
              </Text>
            </View>
          </View>

          {transactionId && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Ionicons name="key-outline" size={24} color="#27C992" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>ID da Transação</Text>
                  <Text style={styles.infoValueSmall}>{transactionId}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Botões de ação */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleBackToHome}
          >
            <Ionicons name="home" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Voltar ao Início</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#122017',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#111C20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: '#111C20',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoValueSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#122017',
  },
  messageBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  messageText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#27C992',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#27C992',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#111C20',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#27C992',
  },
  secondaryButtonText: {
    color: '#27C992',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
});

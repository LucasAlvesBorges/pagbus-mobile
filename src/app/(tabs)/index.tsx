import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { paymentService, PaymentRequest } from '../../services/paymentService';
import { API_URL } from '../../config/env';

const TARIFFS = [
  { id: 1, name: 'Tarifa R$ 4,20', value: 4.20 },
  { id: 2, name: 'Tarifa R$ 5,00', value: 5.00 },
];

export default function PaymentScreen() {
  const router = useRouter();

  const handleSelectTariff = async (tariff: typeof TARIFFS[0]) => {
    try {
      console.log('🌐 URL da API:', API_URL);
      console.log('🗝️ Iniciando geração de pagamento para:', tariff.name);
      
      // Preparar dados para a requisição
      const paymentData: PaymentRequest = {
        company_id: 1, // TODO: Buscar do contexto/estado global
        items: [
          {
            title: `Passagem - ${tariff.name}`,
            quantity: 1,
            unit_price: tariff.value,
            currency_id: 'BRL',
          },
        ],
        external_reference: `ref_${Date.now()}`,
        front_url: 'pagbusmobile://',
      };

      console.log('📤 Enviando requisição para API:', paymentData);

      // Chamada REAL à API usando o serviço configurado
      const response = await paymentService.createPayment(paymentData);
      
      console.log('📥 Resposta da API:', response);

      // Extrair dados da resposta
      const qrCodeData = response.transaction.pagamento_url;
      const pixLink = response.redirect_url || response.transaction.pagamento_url;
      const transactionId = response.transaction.id.toString();

      console.log('✅ QR Code gerado:', qrCodeData);
      console.log('✅ Link PIX:', pixLink);
      console.log('✅ Transaction ID:', transactionId);

      // Navegar para a tela de detalhes do pagamento
      router.push({
        pathname: '/payment-detail',
        params: {
          tariffName: tariff.name,
          tariffValue: tariff.value.toString(),
          qrCodeData: qrCodeData,
          pixLink: pixLink,
          transactionId: transactionId,
        },
      });

    } catch (error: any) {
      console.error('❌ Erro ao gerar pagamento:', error);
      
      Alert.alert(
        'Erro ao conectar com o servidor',
        error?.message || 'Verifique se o backend está rodando e acessível.'
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Escolha a tarifa</Text>
        <Text style={styles.sectionDescription}>
          Selecione o valor da passagem que deseja pagar
        </Text>

        <View style={styles.tariffContainer}>
          {TARIFFS.map((tariff) => (
            <TouchableOpacity
              key={tariff.id}
              style={styles.tariffButton}
              onPress={() => handleSelectTariff(tariff)}
            >
              <Text style={styles.tariffText}>{tariff.name}</Text>
              <Text style={styles.tariffValue}>R$ {tariff.value.toFixed(2).replace('.', ',')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  tariffContainer: {
    gap: 16,
    marginBottom: 32,
  },
  tariffButton: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  tariffText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tariffValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_URL } from '../../config/env';
import { PaymentRequest, paymentService } from '../../services/paymentService';

const TARIFFS = [
  { id: 1, name: 'Tarifa R$ 4,20', value: 4.2 },
  { id: 2, name: 'Tarifa R$ 5,00', value: 5.0 },
];

export default function PaymentScreen() {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);

  const handleIncreaseQuantity = () => {
    setQuantity(prev => Math.min(prev + 1, 99));
  };

  const handleDecreaseQuantity = () => {
    setQuantity(prev => Math.max(prev - 1, 1));
  };

  const handleSelectTariff = async (tariff: typeof TARIFFS[0]) => {
    try {
      console.log('🌐 URL da API:', API_URL);
      console.log('🗝️ Iniciando geração de pagamento para:', tariff.name);

      const totalAmount = tariff.value * quantity;
      const paymentData: PaymentRequest = {
        company_id: 1, // TODO: Buscar do contexto/estado global
        items: [
          {
            title: `${quantity}x ${tariff.name}`,
            quantity: quantity,
            unit_price: tariff.value,
            currency_id: 'BRL',
          },
        ],
        external_reference: `ref_${Date.now()}`,
        front_url: 'pagbusmobile://',
      };

      console.log('📤 Enviando requisição para API:', paymentData);

      const response = await paymentService.createPayment(paymentData);

      console.log('📥 Resposta da API:', response);

      const qrCodeData = response.transaction.pagamento_url;
      const pixLink = response.redirect_url || response.transaction.pagamento_url;
      const transactionId = response.transaction.id.toString();

      console.log('✅ QR Code gerado:', qrCodeData);
      console.log('✅ Link PIX:', pixLink);
      console.log('✅ Transaction ID:', transactionId);

      router.push({
        pathname: '/payment-detail',
        params: {
          tariffName: `${quantity}x ${tariff.name}`,
          tariffValue: totalAmount.toString(),
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

        <View style={styles.quantitySelector}>
          <Text style={styles.quantityLabel}>Quantidade de passagens</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={handleDecreaseQuantity}
            >
              <Ionicons name="remove-circle-outline" size={32} color="#007AFF" />
            </TouchableOpacity>
            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityText}>{quantity}</Text>
            </View>
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={handleIncreaseQuantity}
            >
              <Ionicons name="add-circle-outline" size={32} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

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
  quantitySelector: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  quantityButton: {
    padding: 8,
  },
  quantityDisplay: {
    backgroundColor: '#F0F8FF',
    minWidth: 80,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  quantityText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
  },
});

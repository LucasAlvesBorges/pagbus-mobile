import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_URL } from '../../config/env';
import { PaymentRequest, paymentService } from '../../services/paymentService';
import { buslineService, Tariff } from '../../services/buslineService';
import { authService } from '../../services/authService';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { busLineId, busLineName, busLineCode, vehiclePrefix } = params;
  
  console.log('🔍 PaymentScreen renderizado com params:', params);
  
  const [quantity, setQuantity] = useState(1);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirecionar se não houver linha selecionada
  useEffect(() => {
    console.log('📋 Parâmetros recebidos:', { busLineId, busLineName, busLineCode, vehiclePrefix });
    
    const hasBusLine = busLineId || busLineName;
    
    if (!hasBusLine) {
      console.log('⚠️ Sem linha selecionada, redirecionando...');
      router.replace('/payment/select-busline');
      return;
    }
    
    console.log('✅ Carregando tarifas...');
    loadTariffs();
  }, [busLineId, busLineName, busLineCode, vehiclePrefix]);

  const loadTariffs = async () => {
    if (!busLineId) return;
    
    try {
      setLoading(true);
      // Buscar os detalhes da linha que incluem as tarifas
      const lineData = await buslineService.getBusLineById(parseInt(busLineId as string));
      console.log('📊 Linha carregada:', lineData);
      
      // Usar as tarifas da linha
      if (lineData.tariffs && lineData.tariffs.length > 0) {
        setTariffs(lineData.tariffs);
      } else {
        Alert.alert('Aviso', 'Esta linha não possui tarifas cadastradas');
      }
    } catch (error: any) {
      console.error('Erro ao carregar tarifas da linha:', error);
      Alert.alert('Erro', 'Não foi possível carregar as tarifas desta linha');
    } finally {
      setLoading(false);
    }
  };

  const handleIncreaseQuantity = () => {
    setQuantity(prev => Math.min(prev + 1, 99));
  };

  const handleDecreaseQuantity = () => {
    setQuantity(prev => Math.max(prev - 1, 1));
  };

  const handleSelectTariff = async (tariff: Tariff) => {
    try {
      console.log('🌐 URL da API:', API_URL);
      console.log('🗝️ Iniciando geração de pagamento para:', `Tarifa R$ ${tariff.value}`);

      const tariffValue = parseFloat(tariff.value);
      const totalAmount = tariffValue * quantity;
      
      // Extrair company_id do busLineCompany ou usar padrão
      const companyId = params.busLineCompany ? parseInt(params.busLineCompany as string) : 1;
      
      // Obter user_id do auth service
      const userId = await authService.getStoredUserId();
      
      const paymentData: PaymentRequest = {
        company_id: companyId,
        items: [
          {
            title: `${quantity}x Tarifa R$ ${tariff.value} - ${busLineName} (${busLineCode}) - ${vehiclePrefix}`,
            quantity: quantity,
            unit_price: tariffValue,
            currency_id: 'BRL',
          },
        ],
        external_reference: `ref_${Date.now()}`,
        front_url: 'pagbusmobile://',
        // Dados adicionais para o histórico
        bus_line_name: busLineName as string | undefined,
        bus_line_id: busLineId as string | undefined,
        vehicle_prefix: vehiclePrefix as string | undefined,
        user_id: userId || undefined,
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
        pathname: '/payment/payment-detail',
        params: {
          tariffName: `${quantity}x Tarifa R$ ${tariff.value}`,
          tariffValue: totalAmount.toString(),
          busLineId: busLineId as string,
          busLineName: busLineName as string,
          busLineCode: busLineCode as string,
          vehiclePrefix: vehiclePrefix as string,
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

  const handleGoBack = () => {
    router.back();
  };

  const handleStartOver = () => {
    router.push('/payment/select-busline');
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escolha a Tarifa</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Informações da Linha */}
        {(busLineName || vehiclePrefix) && (
          <View style={styles.selectedInfoBox}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <View style={styles.selectedInfo}>
              {busLineName && (
                <Text style={styles.selectedText}>{busLineName}</Text>
              )}
              {vehiclePrefix && (
                <Text style={styles.selectedSubText}>Veículo: {vehiclePrefix}</Text>
              )}
            </View>
            <TouchableOpacity onPress={handleStartOver} style={styles.changeButton}>
              <Text style={styles.changeButtonText}>Alterar</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Carregando tarifas...</Text>
          </View>
        ) : tariffs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma tarifa disponível</Text>
          </View>
        ) : (
          <View style={styles.tariffContainer}>
            {tariffs.map((tariff) => (
              <TouchableOpacity
                key={tariff.id}
                style={styles.tariffButton}
                onPress={() => handleSelectTariff(tariff)}
              >
                <Text style={styles.tariffText}>Tarifa R$ {tariff.value}</Text>
                <Text style={styles.tariffValue}>R$ {tariff.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 16,
  },
  selectedInfoBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  selectedInfo: {
    flex: 1,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  selectedSubText: {
    fontSize: 14,
    color: '#666',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { API_URL } from '../../config/env';
import { PaymentRequest, paymentService } from '../../services/paymentService';
import { buslineService, Tariff } from '../../services/buslineService';
import { authService } from '../../services/authService';
import { formatCurrency, formatCurrencyWithSymbol } from '../../utils/currency';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { busLineId, busLineName, busLineCode, vehiclePrefix } = params;
  
  console.log('🔍 PaymentScreen renderizado com params:', params);
  
  const [quantity, setQuantity] = useState(1);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);

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
      console.log('🔍 Buscando linha ID:', busLineId);
      const lineData = await buslineService.getBusLineById(parseInt(busLineId as string));
      console.log('📊 Dados da linha recebidos:', JSON.stringify(lineData, null, 2));
      
      // Usar as tarifas da linha
      if (lineData.tariffs && lineData.tariffs.length > 0) {
        console.log('✅ Tarifas encontradas:', lineData.tariffs);
        setTariffs(lineData.tariffs);
        setSelectedTariff(lineData.tariffs[0]);
      } else {
        console.log('⚠️ Nenhuma tarifa encontrada na linha');
        Alert.alert('Aviso', 'Esta linha não possui tarifas cadastradas');
        setTariffs([]);
        setSelectedTariff(null);
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar tarifas da linha:', error);
      Alert.alert('Erro', 'Não foi possível carregar as tarifas desta linha');
      setTariffs([]);
      setSelectedTariff(null);
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

  const handleSelectTariff = (tariff: Tariff) => {
    setSelectedTariff(tariff);
  };

  const handleGenerateQRCode = async () => {
    if (!selectedTariff) {
      Alert.alert('Aviso', 'Por favor, selecione uma tarifa.');
      return;
    }
    try {
      console.log('🌐 URL da API:', API_URL);
      console.log('🗝️ Iniciando geração de pagamento para:', `Tarifa ${formatCurrencyWithSymbol(selectedTariff.value)}`);

      const tariffValue = parseFloat(selectedTariff.value);
      const totalAmount = tariffValue * quantity;
      
      // Extrair company_id do busLineCompany ou usar padrão
      const companyId = params.busLineCompany ? parseInt(params.busLineCompany as string) : 1;
      
      // Obter user_id do auth service
      const userId = await authService.getStoredUserId();
      
      const paymentData: PaymentRequest = {
        company_id: companyId,
        items: [
          {
            title: `${quantity}x Tarifa ${formatCurrencyWithSymbol(selectedTariff.value)} - ${busLineName} (${busLineCode}) - ${vehiclePrefix}`,
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

            const qrCodeData = response.qr_code || response.transaction.pagamento_url;
            const qrCodeBase64 = response.qr_code_base64;
            const copyPaste = response.copy_paste || response.qr_code;
            const pixLink = response.redirect_url || response.transaction.pagamento_url;
            const transactionId = response.transaction.id.toString();

      console.log('✅ QR Code gerado:', qrCodeData);
      console.log('✅ QR Code Base64:', qrCodeBase64 ? 'Disponível' : 'Não disponível');
      console.log('✅ Copy/Paste:', copyPaste);
      console.log('✅ Link PIX:', pixLink);
      console.log('✅ Transaction ID:', transactionId);

      router.push({
        pathname: '/payment/payment-detail',
        params: {
          tariffName: `${quantity}x Tarifa ${formatCurrencyWithSymbol(selectedTariff.value)}`,
          tariffValue: totalAmount.toString(),
          busLineId: busLineId as string,
          busLineName: busLineName as string,
          busLineCode: busLineCode as string,
          vehiclePrefix: vehiclePrefix as string,
          qrCodeData: qrCodeData,
          qrCodeBase64: qrCodeBase64 || '',
          copyPaste: copyPaste,
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

        {/* Valor da Tarifa */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Valor da Tarifa</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Carregando...</Text>
            </View>
          ) : tariffs.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma tarifa disponível</Text>
          ) : (
            <View style={styles.tariffGrid}>
              {tariffs.map((tariff) => (
                <TouchableOpacity
                  key={tariff.id}
                  style={[
                    styles.tariffGridButton,
                    selectedTariff?.id === tariff.id && styles.tariffGridButtonSelected,
                  ]}
                  onPress={() => handleSelectTariff(tariff)}
                >
                  <Text
                    style={[
                      styles.tariffGridButtonText,
                      selectedTariff?.id === tariff.id && styles.tariffGridButtonTextSelected,
                    ]}
                  >
                    {formatCurrencyWithSymbol(tariff.value)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Quantidade de Passagens */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Quantidade de Passagens</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityStepperButton}
              onPress={handleDecreaseQuantity}
            >
              <Text style={styles.quantityStepperText}>-</Text>
            </TouchableOpacity>
            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityText}>{quantity}</Text>
            </View>
            <TouchableOpacity
              style={styles.quantityStepperButton}
              onPress={handleIncreaseQuantity}
            >
              <Text style={styles.quantityStepperText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Total a Pagar */}
        <View style={styles.totalCardWrapper}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total a Pagar:</Text>
            <Text style={styles.totalValue}>{formatCurrencyWithSymbol(selectedTariff ? parseFloat(selectedTariff.value) * quantity : 0)}</Text>
          </View>
        </View>
      </View>

      {/* Botão Gerar QR Code */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={[
            styles.generateQrCodeButton,
            (!selectedTariff || loading) && styles.generateQrCodeButtonDisabled
          ]}
          onPress={handleGenerateQRCode}
          disabled={!selectedTariff || loading}
        >
          {loading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#fff" style={styles.buttonSpinner} />
              <Text style={styles.generateQrCodeButtonText}>Gerando...</Text>
            </View>
          ) : (
            <Text style={styles.generateQrCodeButtonText}>Gerar QR Code</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#f6f7f8',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
    paddingRight: 48,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 120, // Espaço para o botão fixo na parte inferior
    gap: 24,
  },
  selectedInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  selectedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  selectedSubText: {
    fontSize: 14,
    color: '#666',
  },
  changeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
  },
  changeButtonText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 12,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#1a1a1a',
  },
  tariffGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  tariffGridButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    height: 48,
    backgroundColor: '#f1f5f9',
  },
  tariffGridButtonSelected: {
    backgroundColor: '#1173d4',
  },
  tariffGridButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  tariffGridButtonTextSelected: {
    color: '#fff',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityStepperButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    width: 32,
    height: 32,
    backgroundColor: '#e2e8f0',
  },
  quantityStepperText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  quantityDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: 'transparent',
  },
  quantityText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  totalCardWrapper: {
    paddingHorizontal: 0,
  },
        totalCard: {
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
          backgroundColor: '#fff',
          padding: 16,
          gap: 4,
        },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1173d4',
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
    color: '#999',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 34, // Espaço para a barra de navegação do sistema
    backgroundColor: '#f6f7f8',
  },
  generateQrCodeButton: {
    flex: 1,
    minWidth: 84,
    maxWidth: 480,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 8,
    height: 56,
    paddingHorizontal: 20,
    backgroundColor: '#1173d4',
    shadowColor: '#1173d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  generateQrCodeButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSpinner: {
    marginRight: 8,
  },
  generateQrCodeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

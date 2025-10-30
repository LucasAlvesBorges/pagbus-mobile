import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { API_URL } from '../../config/env';
import { PaymentRequest, paymentService } from '../../services/paymentService';
import { buslineService, Tariff } from '../../services/buslineService';
import { authService } from '../../services/authService';
import { selectionService, BusSelection } from '../../services/selectionService';
import { formatCurrency, formatCurrencyWithSymbol } from '../../utils/currency';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [quantity, setQuantity] = useState(1);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [selection, setSelection] = useState<BusSelection | null>(null);

  // Carregar seleção salva quando a tela ganhar foco
  useFocusEffect(
    useCallback(() => {
      loadSavedSelection();
    }, [])
  );

  const loadSavedSelection = async () => {
    try {
      // Primeiro tentar carregar dos parâmetros (quando vem da navegação)
      if (params.busLineId && params.busLineName && params.busLineCode && params.vehiclePrefix) {
        const newSelection: BusSelection = {
          busLineId: params.busLineId as string,
          busLineName: params.busLineName as string,
          busLineCode: params.busLineCode as string,
          busLineCompany: params.busLineCompany as string || '1',
          vehiclePrefix: params.vehiclePrefix as string,
        };
        setSelection(newSelection);
        await selectionService.saveSelection(newSelection);
        await loadTariffs(newSelection.busLineId);
        return;
      }

      // Caso contrário, carregar do SecureStore
      const savedSelection = await selectionService.loadSelection();
      if (savedSelection) {
        setSelection(savedSelection);
        await loadTariffs(savedSelection.busLineId);
      } else {
        setSelection(null);
      }
    } catch (error) {
      // Erro silencioso
    }
  };

  const loadTariffs = async (lineId: string) => {
    if (!lineId) return;
    
    try {
      setLoading(true);
      const lineData = await buslineService.getBusLineById(parseInt(lineId));
      
      // Usar as tarifas da linha
      if (lineData.tariffs && lineData.tariffs.length > 0) {
        setTariffs(lineData.tariffs);
        setSelectedTariff(lineData.tariffs[0]);
      } else {
        Alert.alert('Aviso', 'Esta linha não possui tarifas cadastradas');
        setTariffs([]);
        setSelectedTariff(null);
      }
    } catch (error: any) {
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
      if (!selection) {
        Alert.alert('Aviso', 'Por favor, selecione uma linha e veículo.');
        return;
      }

      const tariffValue = parseFloat(selectedTariff.value);
      const totalAmount = tariffValue * quantity;
      
      // Obter user_id e company_id do auth service
      const userId = await authService.getStoredUserId();
      const companyId = await authService.getStoredCompanyId();
      
      if (!companyId) {
        Alert.alert('Erro', 'Não foi possível identificar a empresa do usuário. Faça login novamente.');
        return;
      }
      
      const paymentData: PaymentRequest = {
        company_id: companyId,
        items: [
          {
            title: `${quantity}x Tarifa ${formatCurrencyWithSymbol(selectedTariff.value)} - ${selection.busLineName} (${selection.busLineCode}) - ${selection.vehiclePrefix}`,
            quantity: quantity,
            unit_price: tariffValue,
            currency_id: 'BRL',
          },
        ],
        external_reference: `ref_${Date.now()}`,
        front_url: 'pagbusmobile://',
        // Dados adicionais para o histórico
        bus_line_name: selection.busLineName,
        bus_line_id: selection.busLineId,
        vehicle_prefix: selection.vehiclePrefix,
        user_id: userId || undefined,
      };

      const response = await paymentService.createPayment(paymentData);

      const qrCodeData = response.qr_code || response.transaction.pagamento_url;
      const qrCodeBase64 = response.qr_code_base64;
      const copyPaste = response.copy_paste || response.qr_code;
      const pixLink = response.redirect_url || response.transaction.pagamento_url;
      const transactionId = response.transaction.id.toString();

      router.push({
        pathname: '/(payment)/payment-detail',
        params: {
          tariffName: `${quantity}x Tarifa ${formatCurrencyWithSymbol(selectedTariff.value)}`,
          tariffValue: totalAmount.toString(),
          busLineId: selection.busLineId,
          busLineName: selection.busLineName,
          busLineCode: selection.busLineCode,
          vehiclePrefix: selection.vehiclePrefix,
          qrCodeData: qrCodeData,
          qrCodeBase64: qrCodeBase64 || '',
          copyPaste: copyPaste,
          pixLink: pixLink,
          transactionId: transactionId,
        },
      });
    } catch (error: any) {
      Alert.alert(
        'Erro ao conectar com o servidor',
        error?.message || 'Verifique se o backend está rodando e acessível.'
      );
    }
  };

  const handleSelectBusLine = () => {
    router.push('/(payment)/select-busline');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da aplicação?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              router.replace('/(auth)');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível fazer logout');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escolha a Tarifa</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Informações da Linha */}
        {selection ? (
          <View style={styles.selectedInfoBox}>
            <Ionicons name="checkmark-circle" size={24} color="#27C992" />
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedText}>{selection.busLineName}</Text>
              <Text style={styles.selectedSubText}>Veículo: {selection.vehiclePrefix}</Text>
            </View>
            <TouchableOpacity onPress={handleSelectBusLine} style={styles.changeButton}>
              <Text style={styles.changeButtonText}>Alterar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptySelectionBox}>
            <Ionicons name="bus-outline" size={32} color="#27C992" />
            <View style={styles.emptySelectionInfo}>
              <Text style={styles.emptySelectionText}>Nenhuma linha selecionada</Text>
              <Text style={styles.emptySelectionSubText}>Selecione uma linha e veículo para continuar</Text>
            </View>
            <TouchableOpacity onPress={handleSelectBusLine} style={styles.selectButton}>
              <Text style={styles.selectButtonText}>Selecionar</Text>
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
            <View style={styles.emptyTariffBox}>
              <Ionicons name="cash-outline" size={32} color="#27C992" />
              <View style={styles.emptyTariffInfo}>
                <Text style={styles.emptyTariffText}>Nenhuma tarifa disponível</Text>
                <Text style={styles.emptyTariffSubText}>Esta linha não possui tarifas cadastradas</Text>
              </View>
            </View>
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
            (!selectedTariff || loading || !selection) && styles.generateQrCodeButtonDisabled
          ]}
          onPress={handleGenerateQRCode}
          disabled={!selectedTariff || loading || !selection}
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
    backgroundColor: '#122017',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    padding: 16,
    paddingBottom: 16,
    backgroundColor: '#122017',
  },
  logoutButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    paddingRight: 8,
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
    backgroundColor: '#111C20',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  selectedSubText: {
    fontSize: 14,
    color: '#fff',
  },
  changeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#27C992',
  },
  changeButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  emptySelectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111C20',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#27C992',
    borderStyle: 'dashed',
  },
  emptySelectionInfo: {
    flex: 1,
    marginLeft: 16,
  },
  emptySelectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  emptySelectionSubText: {
    fontSize: 13,
    color: '#999',
  },
  selectButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#27C992',
  },
  selectButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  emptyTariffBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#27C992',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyTariffInfo: {
    flex: 1,
    marginLeft: 16,
  },
  emptyTariffText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  emptyTariffSubText: {
    fontSize: 13,
    color: '#999',
  },
  card: {
    backgroundColor: '#111C20',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#fff',
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
    backgroundColor: '#122017',
    borderWidth: 1,
    borderColor: '#27C992',
  },
  tariffGridButtonSelected: {
    backgroundColor: '#27C992',
  },
  tariffGridButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
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
    backgroundColor: '#122017',
    borderWidth: 1,
    borderColor: '#27C992',
  },
  quantityStepperText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27C992',
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
    color: '#fff',
  },
  totalCardWrapper: {
    paddingHorizontal: 0,
  },
        totalCard: {
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          backgroundColor: '#111C20',
          padding: 16,
          gap: 4,
        },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#fff',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 34, // Espaço para a barra de navegação do sistema
    backgroundColor: '#122017',
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
    backgroundColor: '#27C992',
    shadowColor: '#27C992',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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


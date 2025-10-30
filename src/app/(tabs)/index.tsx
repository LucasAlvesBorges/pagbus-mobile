import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { PaymentRequest, paymentService } from '../../services/paymentService';
import { buslineService, Tariff } from '../../services/buslineService';
import { authService } from '../../services/authService';
import { selectionService, BusSelection } from '../../services/selectionService';
import { journeyService } from '../../services/journeyService';
import { formatCurrency, formatCurrencyWithSymbol } from '../../utils/currency';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [quantity, setQuantity] = useState(1);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [selection, setSelection] = useState<BusSelection | null>(null);
  const [activeJourney, setActiveJourney] = useState<any>(null);
  const [startingJourney, setStartingJourney] = useState(false);
  const [generatingQRCode, setGeneratingQRCode] = useState(false);

  // Carregar seleção salva quando a tela ganhar foco
  useFocusEffect(
    useCallback(() => {
      loadSavedSelection();
      loadActiveJourney();
    }, [])
  );

  const loadActiveJourney = async () => {
    try {
      const journey = await journeyService.syncActiveJourney();
      setActiveJourney(journey);
    } catch (error) {
      // Erro silencioso
      setActiveJourney(null);
    }
  };

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
    
    if (generatingQRCode) {
      return; // Evitar cliques duplos
    }
    
    try {
      setGeneratingQRCode(true);
      
      if (!selection) {
        Alert.alert('Aviso', 'Por favor, selecione uma linha e veículo.');
        return;
      }

      const tariffValue = parseFloat(selectedTariff.value);
      const totalAmount = tariffValue * quantity;
      
      // Extrair company_id do busLineCompany ou usar padrão
      const companyId = parseInt(selection.busLineCompany) || 1;
      
      // Obter user_id do auth service
      const userId = await authService.getStoredUserId();
      
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
        journey_id: activeJourney?.id || undefined,
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
    } finally {
      setGeneratingQRCode(false);
    }
  };

  const handleSelectBusLine = () => {
    router.push('/(payment)/select-busline');
  };

  const handleStartJourney = async () => {
    if (!selection) {
      Alert.alert('Aviso', 'Por favor, selecione uma linha e veículo primeiro.');
      return;
    }

    try {
      setStartingJourney(true);
      
      // Criar jornada na API
      const journey = await journeyService.createJourney({
        bus_line: parseInt(selection.busLineId),
        vehicle_prefix: selection.vehiclePrefix,
      });

      // Atualizar jornada ativa
      setActiveJourney(journey);
      
      // Recarregar jornada do servidor para garantir sincronização
      await loadActiveJourney();

      Alert.alert(
        'Sucesso',
        `Jornada iniciada com sucesso!\nLinha: ${selection.busLineName}\nVeículo: ${selection.vehiclePrefix}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível iniciar a jornada. Verifique sua conexão.'
      );
    } finally {
      setStartingJourney(false);
    }
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
              {activeJourney && (
                <>
                  <Text style={styles.journeyIdText}>Jornada #{activeJourney.id}</Text>
                  <Text style={styles.journeyStatusText}>
                    ✓  {activeJourney.payments_count || 0} pagamento(s) • R$ {parseFloat(activeJourney.total_amount || '0').toFixed(2)}
                  </Text>
                </>
              )}
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

        {/* Botão Iniciar Jornada - aparece quando há seleção mas não há jornada ativa */}
        {selection && !activeJourney && (
          <TouchableOpacity
            style={[
              styles.startJourneyButtonContainer,
              startingJourney && styles.startJourneyButtonContainerDisabled
            ]}
            onPress={handleStartJourney}
            disabled={startingJourney}
          >
            {startingJourney ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#fff" style={styles.buttonSpinner} />
                <Text style={styles.startJourneyButtonText}>Iniciando...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="play-circle" size={24} color="#fff" />
                <Text style={styles.startJourneyButtonText}>Iniciar Jornada</Text>
              </>
            )}
          </TouchableOpacity>
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
                    !activeJourney && styles.tariffGridButtonDisabled,
                  ]}
                  onPress={() => handleSelectTariff(tariff)}
                  disabled={!activeJourney}
                >
                  <Text
                    style={[
                      styles.tariffGridButtonText,
                      selectedTariff?.id === tariff.id && styles.tariffGridButtonTextSelected,
                      !activeJourney && styles.tariffGridButtonTextDisabled,
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
              style={[
                styles.quantityStepperButton,
                !activeJourney && styles.quantityStepperButtonDisabled,
              ]}
              onPress={handleDecreaseQuantity}
              disabled={!activeJourney}
            >
              <Text style={[
                styles.quantityStepperText,
                !activeJourney && styles.quantityStepperTextDisabled,
              ]}>-</Text>
            </TouchableOpacity>
            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityText}>{quantity}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.quantityStepperButton,
                !activeJourney && styles.quantityStepperButtonDisabled,
              ]}
              onPress={handleIncreaseQuantity}
              disabled={!activeJourney}
            >
              <Text style={[
                styles.quantityStepperText,
                !activeJourney && styles.quantityStepperTextDisabled,
              ]}>+</Text>
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
            (!selectedTariff || loading || !selection || !activeJourney || generatingQRCode) && styles.generateQrCodeButtonDisabled
          ]}
          onPress={handleGenerateQRCode}
          disabled={!selectedTariff || loading || !selection || !activeJourney || generatingQRCode}
        >
          {generatingQRCode ? (
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
    paddingBottom: 180, // Espaço para o botão fixo + tabbar na parte inferior
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
  journeyIdText: {
    fontSize: 14,
    color: '#27C992',
    fontWeight: '600',
    marginTop: 4,
  },
  journeyStatusText: {
    fontSize: 12,
    color: '#27C992',
    marginTop: 4,
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
  startJourneyButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27C992',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    shadowColor: '#27C992',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startJourneyButtonContainerDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  startJourneyButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
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
  tariffGridButtonDisabled: {
    opacity: 0.5,
    borderColor: '#666',
  },
  tariffGridButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  tariffGridButtonTextSelected: {
    color: '#fff',
  },
  tariffGridButtonTextDisabled: {
    color: '#999',
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
  quantityStepperButtonDisabled: {
    opacity: 0.5,
    borderColor: '#666',
  },
  quantityStepperText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27C992',
  },
  quantityStepperTextDisabled: {
    color: '#999',
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
    paddingBottom: 94, // Espaço para a tabbar + barra de navegação do sistema
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

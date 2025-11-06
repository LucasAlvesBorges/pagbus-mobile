import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Modal, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
  const [isGratuidade, setIsGratuidade] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

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
    if (!isGratuidade) {
      setQuantity(prev => Math.min(prev + 1, 99));
    }
  };

  const handleDecreaseQuantity = () => {
    if (!isGratuidade) {
      setQuantity(prev => Math.max(prev - 1, 1));
    }
  };

  const handleSelectTariff = (tariff: Tariff) => {
    setSelectedTariff(tariff);
    setIsGratuidade(false); // Desativar gratuidade ao selecionar uma tarifa
  };

  const handleSelectGratuidade = () => {
    setIsGratuidade(true);
    setSelectedTariff(null); // Limpar tarifa selecionada ao ativar gratuidade
    setQuantity(1);
  };

  const handleTakePhoto = async () => {
    try {
      // Solicitar permissão da câmera
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar a câmera.');
        return;
      }

      // Abrir a câmera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Mostrar foto no modal de confirmação
        setCapturedPhoto(result.assets[0].uri);
        setPhotoModalVisible(true);
      }
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível abrir a câmera. ' + (error?.message || ''));
    }
  };

  const handleConfirmPhoto = async () => {
    if (!capturedPhoto) {
      Alert.alert('Erro', 'Nenhuma foto para enviar.');
      return;
    }

    if (!selection) {
      Alert.alert('Aviso', 'Por favor, selecione uma linha e veículo.');
      return;
    }

    try {
      setGeneratingQRCode(true);
      
      // Obter company_id
      let companyId: number;
      try {
        const storedCompanyId = await authService.getStoredCompanyId();
        if (storedCompanyId) {
          companyId = storedCompanyId;
        } else {
          // Fallback: usar busLineCompany
          companyId = parseInt(selection.busLineCompany) || 1;
        }
      } catch {
        // Fallback: usar busLineCompany
        companyId = parseInt(selection.busLineCompany) || 1;
      }

      // Obter user_id
      const userId = await authService.getStoredUserId();
      
      // Obter journey_id se houver jornada ativa
      const journeyId = activeJourney?.id;

      // Preparar dados para envio
      const gratuidadeData = {
        company_id: companyId,
        user_id: userId || undefined,
        journey_id: journeyId || undefined,
        bus_line_id: selection.busLineId || undefined,
        vehicle_prefix: selection.vehiclePrefix || undefined,
        image: capturedPhoto,
      };

      // Enviar para o backend
      await paymentService.createGratuidade(gratuidadeData);

      // Fechar modal e limpar
      setPhotoModalVisible(false);
      setCapturedPhoto(null);
      Alert.alert('Sucesso', 'Gratuidade registrada com sucesso!');
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível registrar a gratuidade. Verifique sua conexão.'
      );
    } finally {
      setGeneratingQRCode(false);
    }
  };

  const handleRetakePhoto = () => {
    setPhotoModalVisible(false);
    setCapturedPhoto(null);
    // Tirar outra foto
    handleTakePhoto();
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
    // Se houver jornada ativa, mostrar modal de confirmação para finalizar
    if (activeJourney) {
      Alert.alert(
        'Finalizar Jornada',
        `Você tem uma jornada ativa com ${activeJourney.payments_count || 0} pagamento(s) e total de R$ ${parseFloat(activeJourney.total_amount || '0').toFixed(2)}.\n\nDeseja finalizar a jornada?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Finalizar',
            onPress: handleFinalizeJourney,
            style: 'destructive',
          },
        ]
      );
    } else {
      // Se não houver jornada ativa, apenas navegar para seleção
      router.push('/(payment)/select-busline');
    }
  };

  const handleFinalizeJourney = async () => {
    if (!activeJourney) {
      Alert.alert('Aviso', 'Nenhuma jornada ativa encontrada.');
      return;
    }

    try {
      setStartingJourney(true); // Reutilizar o estado de loading
      
      // Salvar o ID da jornada ativa antes de qualquer operação
      const journeyIdToFinalize = activeJourney.id;
      
      // Finalizar jornada na API (pode retornar null se foi deletada)
      const finalizedJourney = await journeyService.finalizeJourney(journeyIdToFinalize);
      
      // Limpar jornada ativa
      setActiveJourney(null);
      
      // Limpar seleção também para permitir nova seleção
      await selectionService.clearSelection();
      setSelection(null);
      setSelectedTariff(null);
      
      // Mostrar mensagem apropriada e redirecionar se necessário
      if (finalizedJourney === null) {
        Alert.alert(
          'Sucesso',
          'Jornada removida (sem pagamentos).'
        );
      } else {
        // Garantir que estamos usando o ID correto da jornada finalizada
        const finalizedId = finalizedJourney.id;
        
        // Redirecionar para a tela de detalhes da jornada finalizada
        router.push(`/(tabs)/journey-detail?journeyId=${finalizedId}` as any);
      }
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível finalizar a jornada. Verifique sua conexão.'
      );
    } finally {
      setStartingJourney(false);
    }
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
                    ✓  {activeJourney.total_passengers || 0} passagem(ns) • R$ {parseFloat(activeJourney.total_amount || '0').toFixed(2)}
                  </Text>
                </>
              )}
            </View>
            <TouchableOpacity 
              onPress={handleSelectBusLine} 
              style={[
                styles.changeButton,
                activeJourney && styles.finalizeButton
              ]}
              disabled={startingJourney}
            >
              {startingJourney ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.changeButtonText}>
                  {activeJourney ? 'Finalizar' : 'Alterar'}
                </Text>
              )}
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
            <>
              <View>
                <View style={styles.tariffGrid}>
                  {tariffs.map((tariff) => (
                    <TouchableOpacity
                      key={tariff.id}
                      style={[
                        styles.tariffGridButton,
                        selectedTariff?.id === tariff.id && !isGratuidade && styles.tariffGridButtonSelected,
                        !activeJourney && styles.tariffGridButtonDisabled,
                      ]}
                      onPress={() => handleSelectTariff(tariff)}
                      disabled={!activeJourney}
                    >
                      <Text
                        style={[
                          styles.tariffGridButtonText,
                          selectedTariff?.id === tariff.id && !isGratuidade && styles.tariffGridButtonTextSelected,
                          !activeJourney && styles.tariffGridButtonTextDisabled,
                        ]}
                      >
                        {formatCurrencyWithSymbol(tariff.value)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {activeJourney && (
                  <TouchableOpacity
                    style={[
                      styles.gratuidadeButtonFullWidth,
                      isGratuidade && styles.gratuidadeButtonSelected,
                      !activeJourney && styles.tariffGridButtonDisabled,
                    ]}
                    onPress={handleSelectGratuidade}
                    disabled={!activeJourney}
                  >
                    <View style={styles.gratuidadeButtonContent}>
                      <Text
                        style={[
                          styles.tariffGridButtonText,
                          isGratuidade && styles.gratuidadeButtonTextSelected,
                          !activeJourney && styles.tariffGridButtonTextDisabled,
                        ]}
                      >
                        Gratuidade
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        {/* Quantidade de Passagens */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Quantidade de Passagens</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={[
                styles.quantityStepperButton,
                (!activeJourney || isGratuidade) && styles.quantityStepperButtonDisabled,
              ]}
              onPress={handleDecreaseQuantity}
              disabled={!activeJourney || isGratuidade}
            >
              <Text style={[
                styles.quantityStepperText,
                (!activeJourney || isGratuidade) && styles.quantityStepperTextDisabled,
              ]}>-</Text>
            </TouchableOpacity>
            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityText}>{quantity}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.quantityStepperButton,
                (!activeJourney || isGratuidade) && styles.quantityStepperButtonDisabled,
              ]}
              onPress={handleIncreaseQuantity}
              disabled={!activeJourney || isGratuidade}
            >
              <Text style={[
                styles.quantityStepperText,
                (!activeJourney || isGratuidade) && styles.quantityStepperTextDisabled,
              ]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Total a Pagar */}
        <View style={styles.totalCardWrapper}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total a Pagar:</Text>
            <Text style={styles.totalValue}>
              {isGratuidade 
                ? formatCurrencyWithSymbol(0) 
                : formatCurrencyWithSymbol(selectedTariff ? parseFloat(selectedTariff.value) * quantity : 0)
              }
            </Text>
          </View>
        </View>
      </View>

      {/* Botão Gerar QR Code / Tirar Foto */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={[
            styles.generateQrCodeButton,
            isGratuidade && styles.generateQrCodeButtonGratuidade,
            (!selectedTariff || loading || !selection || !activeJourney || generatingQRCode) && !isGratuidade && styles.generateQrCodeButtonDisabled,
            isGratuidade && (!selection || !activeJourney) && styles.generateQrCodeButtonDisabled,
          ]}
          onPress={isGratuidade ? handleTakePhoto : handleGenerateQRCode}
          disabled={
            isGratuidade 
              ? (!selection || !activeJourney)
              : (!selectedTariff || loading || !selection || !activeJourney || generatingQRCode)
          }
        >
          {generatingQRCode ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color={isGratuidade ? "#000" : "#fff"} style={styles.buttonSpinner} />
              <Text style={[
                styles.generateQrCodeButtonText,
                isGratuidade && styles.generateQrCodeButtonTextGratuidade
              ]}>
                {isGratuidade ? 'Enviando...' : 'Gerando...'}
              </Text>
            </View>
          ) : (
            <Text style={[
              styles.generateQrCodeButtonText,
              isGratuidade && styles.generateQrCodeButtonTextGratuidade
            ]}>
              {isGratuidade ? 'Tirar Foto' : 'Gerar QR Code'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de Confirmação da Foto */}
      <Modal
        visible={photoModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!generatingQRCode) {
            setPhotoModalVisible(false);
            setCapturedPhoto(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderSpacer} />
              <Text style={styles.modalTitle}>Confirmar Foto</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  if (!generatingQRCode) {
                    setPhotoModalVisible(false);
                    setCapturedPhoto(null);
                  }
                }}
                disabled={generatingQRCode}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {capturedPhoto && (
              <Image 
                source={{ uri: capturedPhoto }} 
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonRetake,
                  generatingQRCode && styles.modalButtonDisabled
                ]}
                onPress={handleRetakePhoto}
                disabled={generatingQRCode}
              >
                <Text style={styles.modalButtonTextRetake}>Tirar Outra</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonConfirm,
                  generatingQRCode && styles.modalButtonDisabled
                ]}
                onPress={handleConfirmPhoto}
                disabled={generatingQRCode}
              >
                {generatingQRCode ? (
                  <View style={styles.modalButtonContent}>
                    <ActivityIndicator size="small" color="#fff" style={styles.modalButtonSpinner} />
                    <Text style={styles.modalButtonTextConfirm}>Enviando...</Text>
                  </View>
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  finalizeButton: {
    backgroundColor: '#FF6B6B',
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
    marginBottom: 8,
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
  generateQrCodeButtonGratuidade: {
    backgroundColor: '#FFC107',
    shadowColor: '#FFC107',
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
  generateQrCodeButtonTextGratuidade: {
    color: '#000',
  },
  gratuidadeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gratuidadeButtonFullWidth: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    height: 48,
    backgroundColor: '#122017',
    borderWidth: 1,
    borderColor: '#27C992',
  },
  gratuidadeButtonSelected: {
    backgroundColor: '#FFC107',
    borderColor: '#FFC107',
  },
  gratuidadeButtonTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#111C20',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    position: 'relative',
  },
  modalHeaderSpacer: {
    width: 32,
    height: 32,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  modalCloseButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: '#122017',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonRetake: {
    backgroundColor: '#122017',
    borderWidth: 1,
    borderColor: '#27C992',
  },
  modalButtonConfirm: {
    backgroundColor: '#27C992',
  },
  modalButtonTextRetake: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27C992',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalButtonSpinner: {
    marginRight: 4,
  },
});

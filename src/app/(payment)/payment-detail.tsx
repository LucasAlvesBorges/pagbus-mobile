import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Clipboard from '@react-native-clipboard/clipboard';
import { Ionicons } from '@expo/vector-icons';
import { paymentService } from '../../services/paymentService';
import { authService } from '../../services/authService';
import { formatCurrencyWithSymbol } from '../../utils/currency';

export default function PaymentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { tariffName, tariffValue, qrCodeData, qrCodeBase64, copyPaste, pixLink, transactionId, busLineId, busLineName, busLineCode, vehiclePrefix } = params;
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasNavigatedRef = useRef(false);
  const currentUserIdRef = useRef<number | null>(null);

  // Carregar user_id ao montar o componente
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const userId = await authService.getStoredUserId();
        currentUserIdRef.current = userId;
        console.log('[PaymentDetail] User ID carregado:', userId);
      } catch (error) {
        console.error('[PaymentDetail] Erro ao carregar user ID:', error);
      }
    };
    loadUserId();
  }, []);

  // Log dos parâmetros recebidos para debug
  useEffect(() => {
    console.log('[PaymentDetail] Parâmetros recebidos:', {
      has_qr_code_base64: !!qrCodeBase64,
      has_qr_code_data: !!qrCodeData,
      has_copy_paste: !!copyPaste,
      transaction_id: transactionId,
    });
  }, []);

  const copyToClipboard = (text: string) => {
    try {
      Clipboard.setString(text);
      setCopied(true);
      Alert.alert('Sucesso', 'Código PIX copiado para a área de transferência!');
      
      // Reset copied state after 3 seconds
      setTimeout(() => {
        setCopied(false);
      }, 3000);
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível copiar o código');
      }
  };

  const handleGoBack = () => {
    router.back();
  };

  // Função para verificar o status do pagamento
  const checkPaymentStatus = async () => {
    if (!transactionId || hasNavigatedRef.current) return;

    try {
      const status = await paymentService.checkTransactionStatus(transactionId as string);
      
      // Verificar se o pagamento pertence ao usuário atual
      const transactionUserId = status?.metadata?.user_id;
      const currentUserId = currentUserIdRef.current;
      
      // Se ambos têm user_id, verificar se correspondem
      if (transactionUserId !== undefined && currentUserId !== null) {
        if (transactionUserId !== currentUserId) {
          console.log('[PaymentDetail] Pagamento pertence a outro usuário - ignorando atualização:', {
            transaction_user_id: transactionUserId,
            current_user_id: currentUserId,
          });
          return; // Não atualizar se não for do usuário atual
        }
      }
      
      // Se a transação tem user_id mas o usuário não está logado, não atualizar
      if (transactionUserId !== undefined && currentUserId === null) {
        console.log('[PaymentDetail] Transação tem user_id mas usuário não está logado - ignorando');
        return;
      }
      
      // Verificar se o pagamento foi aprovado
      if (status?.payment_status === 'aprovado' && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        
        // Limpar interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        console.log('[PaymentDetail] Pagamento aprovado - navegando para tela de sucesso');

        // Navegar para tela de sucesso
        router.replace({
          pathname: '/(payment)/payment-success',
          params: {
            tariffName,
            tariffValue,
            transactionId: transactionId as string,
            busLineId,
            busLineName,
            busLineCode,
            vehiclePrefix,
          },
        });
      }
    } catch (error: any) {
      // Se for erro 403 ou 401, pode ser que a transação não pertença ao usuário
      if (error?.status === 403 || error?.status === 401) {
        console.log('[PaymentDetail] Acesso negado - transação não pertence ao usuário atual');
        // Parar de verificar esta transação
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
      // Erro silencioso para outros casos
    }
  };

  // Iniciar polling quando o componente montar
  useEffect(() => {
    if (!transactionId) return;

    // Verificar imediatamente
    checkPaymentStatus();

    // Configurar polling a cada 5 segundos
    intervalRef.current = setInterval(() => {
      checkPaymentStatus();
    }, 5000) as ReturnType<typeof setInterval>;

    // Limpar interval ao desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [transactionId]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Informações da Tarifa */}
        <View style={styles.infoBox}>
          <Ionicons name="receipt-outline" size={32} color="#27C992" />
          <Text style={styles.infoTitle}>{tariffName}</Text>
          <Text style={styles.infoAmount}>{formatCurrencyWithSymbol(Array.isArray(tariffValue) ? tariffValue[0] : tariffValue)}</Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>QR Code PIX</Text>
          <Text style={styles.qrSubtitle}>Escaneie com o app do seu banco</Text>
          
          <View style={styles.qrCodeWrapper}>
            {qrCodeBase64 ? (
              <Image
                source={{ uri: `data:image/png;base64,${qrCodeBase64}` }}
                style={styles.qrCodeImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.errorText}>
                QR Code não disponível. Use a opção de copiar PIX abaixo.
              </Text>
            )}
          </View>
          
          <Text style={styles.qrInstructions}>
            Abra o app do seu banco e escaneie este QR Code para pagar via PIX
          </Text>
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
  header: {
    backgroundColor: '#122017',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
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
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  infoBox: {
    backgroundColor: '#111C20',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
  },
  infoAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#27C992',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 24,
  },
  qrCodeWrapper: {
    backgroundColor: '#111C20',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  qrCodeImage: {
    width: 280,
    height: 280,
  },
  qrInstructions: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    padding: 20,
  },
  pixCodeContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  pixCode: {
    fontSize: 12,
    color: '#495057',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  copiedButton: {
    backgroundColor: '#28a745',
  },
  linkButtonDisabled: {
    backgroundColor: '#ccc',
  },
  linkSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  linkTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  linkButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 200,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  noteBox: {
    backgroundColor: '#FFF4E6',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  noteText: {
    fontSize: 14,
    color: '#8B6914',
    flex: 1,
    lineHeight: 20,
  },
  statusBox: {
    backgroundColor: '#111C20',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#27C992',
    width: '100%',
  },
  statusText: {
    fontSize: 14,
    color: '#27C992',
    fontWeight: '600',
  },
} as const);


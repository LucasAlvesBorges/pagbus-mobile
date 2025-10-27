import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { StatusBar } from 'expo-status-bar';
import Clipboard from '@react-native-clipboard/clipboard';
import { Ionicons } from '@expo/vector-icons';
import { paymentService } from '../services/paymentService';

export default function PaymentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { tariffName, tariffValue, qrCodeData, pixLink, transactionId } = params;
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasNavigatedRef = useRef(false);

  const copyToClipboard = (text: string) => {
    try {
      Clipboard.setString(text);
      Alert.alert('Sucesso', 'Link PIX copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      Alert.alert('Erro', 'Não foi possível copiar o link');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  // Função para verificar o status do pagamento
  const checkPaymentStatus = async () => {
    if (!transactionId || hasNavigatedRef.current) return;

    try {
      setIsCheckingPayment(true);
      const status = await paymentService.checkTransactionStatus(transactionId as string);
      
      console.log('📊 Status do pagamento:', status);

      // Verificar se o pagamento foi aprovado
      if (status?.payment_status === 'aprovado' && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        
        // Limpar interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        // Navegar para tela de sucesso
        router.replace({
          pathname: '/payment-success',
          params: {
            tariffName,
            tariffValue,
            transactionId: transactionId as string,
          },
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setIsCheckingPayment(false);
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
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Informações da Tarifa */}
        <View style={styles.infoBox}>
          <Ionicons name="receipt-outline" size={32} color="#007AFF" />
          <Text style={styles.infoTitle}>{tariffName}</Text>
          <Text style={styles.infoAmount}>R$ {tariffValue}</Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>Escaneie o QR Code</Text>
          <Text style={styles.qrSubtitle}>Use o app do seu banco para escanear</Text>
          
          <View style={styles.qrCodeWrapper}>
            <QRCode
              value={qrCodeData as string}
              size={280}
              color="#000"
              backgroundColor="#fff"
            />
          </View>
        </View>

        {/* Link PIX */}
        <View style={styles.linkSection}>
          <Text style={styles.linkTitle}>Ou use o link PIX</Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => copyToClipboard(pixLink as string)}
          >
            <Ionicons name="copy-outline" size={20} color="#fff" />
            <Text style={styles.linkButtonText}>Copiar link PIX</Text>
          </TouchableOpacity>
        </View>

        {/* Informações Adicionais */}
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>Como pagar</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Ionicons name="qr-code-outline" size={20} color="#007AFF" />
              <Text style={styles.instructionText}>Escaneie o código acima com seu app bancário</Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="copy-outline" size={20} color="#007AFF" />
              <Text style={styles.instructionText}>Ou copie o link PIX e cole no app</Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.instructionText}>Confirme o pagamento no app do seu banco</Text>
            </View>
          </View>
        </View>

        {/* Nota Importante */}
        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={20} color="#FF9500" />
          <Text style={styles.noteText}>
            Após o pagamento, aguarde a confirmação. O recibo será gerado automaticamente.
          </Text>
        </View>

        {/* Status de verificação */}
        {isCheckingPayment && (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              🔄 Verificando status do pagamento...
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
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
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  infoBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  infoAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  qrCodeWrapper: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
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
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    width: '100%',
  },
  statusText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
} as const);


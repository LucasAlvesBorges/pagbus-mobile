import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import {
  cacheDirectory,
  writeAsStringAsync,
  getInfoAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { journeyService, type Journey } from '../../services/journeyService';
import { formatCurrencyWithSymbol } from '../../utils/currency';
import { formatDateToBrasilia } from '../../utils/date';
import { formatBusLineName } from '../../utils/busLine';

interface Payment {
  id: number;
  bus_line: string;
  vehicle: string;
  quantidade: number;
  valor_total: string;
  payment_status: string;
  created_at: string;
}

export default function JourneyDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const journeyId = parseInt(params.journeyId as string, 10);
  
  const [journey, setJourney] = useState<Journey | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    loadJourneyDetails();
  }, [journeyId]);

  const loadJourneyDetails = async () => {
    try {
      setLoading(true);
      
      // Buscar detalhes da jornada e seus pagamentos
      const [journeyData, paymentsData] = await Promise.all([
        journeyService.getJourneyById(journeyId),
        journeyService.getJourneyPayments(journeyId),
      ]);
      
      setJourney(journeyData);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    } catch (error: any) {
      console.error('Erro ao carregar detalhes da jornada:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadJourneyDetails();
  };

  const formatDate = (dateString: string) => {
    return formatDateToBrasilia(dateString);
  };

  const handleGoBack = () => {
    router.push('/(tabs)/history');
  };

  const handleDownloadPDF = async () => {
    if (!journey || !journey.finalizada) {
      Alert.alert('Aviso', 'A jornada precisa estar finalizada para baixar o PDF.');
      return;
    }

    try {
      setDownloadingPDF(true);
      
      const arrayBuffer = await journeyService.downloadJourneyPDF(journeyId);
      
      const dateStr = journey.finalized_at 
        ? new Date(journey.finalized_at).toISOString().split('T')[0].replace(/-/g, '')
        : new Date().toISOString().split('T')[0].replace(/-/g, '');
      const filename = `jornada_${journey.id}_${dateStr}.pdf`;
      
      const base64 = arrayBufferToBase64(arrayBuffer);
      let fileUri = '';

      if (Platform.OS === 'ios') {
        const cacheDir = cacheDirectory;

        if (!cacheDir) {
          throw new Error('Diretório de cache não disponível');
        }

        fileUri = `${cacheDir}${filename}`;

        await writeAsStringAsync(fileUri, base64, {
          encoding: EncodingType.Base64,
        });

        const fileInfo = await getInfoAsync(fileUri);

        if (!fileInfo.exists) {
          throw new Error('Arquivo não foi criado');
        }
      } else {
        try {
          const cacheDir = (FileSystem as any).Directory?.cache;

          if (!cacheDir) {
            throw new Error('Cache directory não disponível');
          }

          fileUri = `${cacheDir}/${filename}`;

          await writeAsStringAsync(fileUri, base64, {
            encoding: EncodingType.Base64,
          });

          const fileInfo = await FileSystem.getInfoAsync(fileUri);

          if (!fileInfo.exists) {
            throw new Error('Arquivo não foi criado');
          }
        } catch {
          const hardcodedPath = `file:///data/data/com.pagbus.mobile/cache/${filename}`;
          fileUri = hardcodedPath;

          await writeAsStringAsync(fileUri, base64, {
            encoding: EncodingType.Base64,
          });
        }
      }
      
      // Compartilhar o arquivo
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartilhar PDF da Jornada',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'Compartilhamento não disponível',
          'Não foi possível compartilhar o PDF neste dispositivo.'
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Erro',
        'Não foi possível gerar o PDF. Tente novamente.'
      );
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" hidden />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalhes da Jornada</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#27C992" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  if (!journey) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" hidden />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalhes da Jornada</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#A5DCC6" />
          <Text style={styles.emptyTitle}>Jornada não encontrada</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleGoBack}>
            <Text style={styles.emptyButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <StatusBar style="dark" hidden />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes da Jornada</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Informações da Jornada */}
        <View style={styles.journeyInfoBox}>
          <Text style={styles.journeyId}>
            Jornada #{journey.id}
          </Text>
          
          <View style={styles.journeyInfoHeader}>
            <Ionicons name="receipt-outline" size={32} color="#27C992" />
            <View style={styles.journeyInfoText}>
              <View style={styles.journeyTitleRow}>
                <Text style={styles.journeyInfoTitle}>
                  {formatBusLineName(journey.bus_line_name, 'Jornada')}
                  {journey.bus_line_code && (
                    <Text style={styles.busLineCode}> ({journey.bus_line_code})</Text>
                  )}
                </Text>
                {journey.finalizada && (
                  <TouchableOpacity
                    onPress={handleDownloadPDF}
                    disabled={downloadingPDF}
                    style={styles.downloadButton}
                    activeOpacity={0.7}
                  >
                    {downloadingPDF ? (
                      <ActivityIndicator size="small" color="#27C992" />
                    ) : (
                      <Ionicons name="download-outline" size={20} color="#27C992" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {journey.vehicle_prefix && (
                <Text style={styles.journeyInfoSubtitle}>
                  Veículo: {journey.vehicle_prefix}
                </Text>
              )}
            </View>
          </View>
          
          <View style={styles.journeyStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Recebido</Text>
              <Text style={styles.statValue}>
                {formatCurrencyWithSymbol(journey.total_amount)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Passagens</Text>
              <Text style={styles.statValue}>
                {journey.total_passengers || 0}
              </Text>
            </View>
          </View>

          <View style={styles.journeyDates}>
            <View style={styles.dateItem}>
              <Ionicons name="calendar-outline" size={16} color="#A5DCC6" />
              <Text style={styles.dateText}>
                Iniciada: {formatDate(journey.created_at)}
              </Text>
            </View>
            {journey.finalized_at && (
              <View style={styles.dateItem}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#27C992" />
                <Text style={styles.dateText}>
                  Finalizada: {formatDate(journey.finalized_at)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Lista de Pagamentos */}
        <View style={styles.paymentsSection}>
          <Text style={styles.sectionTitle}>Pagamentos</Text>
          
          {payments.length === 0 ? (
            <View style={styles.emptyPaymentsContainer}>
              <Ionicons name="receipt-outline" size={48} color="#A5DCC6" />
              <Text style={styles.emptyPaymentsText}>
                Nenhum pagamento encontrado
              </Text>
            </View>
          ) : (
            payments.map((payment) => (
              <TouchableOpacity
                key={payment.id}
                style={styles.paymentCard}
                activeOpacity={0.7}
              >
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentTitle}>
                      {formatBusLineName(payment.bus_line, 'Pagamento')}
                    </Text>
                    {payment.vehicle && (
                      <Text style={styles.paymentSubtitle}>
                        Veículo: {payment.vehicle}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.paymentAmount}>
                    {formatCurrencyWithSymbol(payment.valor_total)}
                  </Text>
                </View>

                <View style={styles.paymentDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="receipt-outline" size={16} color="#A5DCC6" />
                    <Text style={styles.detailText}>
                      {payment.quantidade}x Passagem
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#A5DCC6" />
                    <Text style={styles.detailText}>
                      {formatDate(payment.created_at)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons 
                      name={
                        payment.payment_status === 'aprovado' 
                          ? 'checkmark-circle' 
                          : 'time-outline'
                      } 
                      size={16} 
                      color={
                        payment.payment_status === 'aprovado' 
                          ? '#27C992' 
                          : '#A5DCC6'
                      } 
                    />
                    <Text style={[
                      styles.detailText,
                      payment.payment_status === 'aprovado' && styles.statusApproved
                    ]}>
                      {payment.payment_status === 'aprovado' ? 'Aprovado' : 'Pendente'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const base64Chars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let base64 = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const byte1 = bytes[i];
    const byte2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const byte3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    const triplet = (byte1 << 16) | (byte2 << 8) | byte3;

    base64 += base64Chars[(triplet >> 18) & 0x3f];
    base64 += base64Chars[(triplet >> 12) & 0x3f];
    base64 += i + 1 < bytes.length ? base64Chars[(triplet >> 6) & 0x3f] : '=';
    base64 += i + 2 < bytes.length ? base64Chars[triplet & 0x3f] : '=';
  }

  return base64;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#122017',
  },
  header: {
    backgroundColor: '#122017',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 24,
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
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#A5DCC6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyButton: {
    backgroundColor: '#27C992',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  journeyInfoBox: {
    backgroundColor: '#111C20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#27C99220',
  },
  journeyInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  journeyInfoText: {
    flex: 1,
    marginLeft: 12,
  },
  journeyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  journeyInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  busLineCode: {
    fontSize: 18,
    fontWeight: '400',
    color: '#A5DCC6',
  },
  downloadButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#27C99220',
    borderWidth: 1,
    borderColor: '#27C99240',
  },
  journeyInfoSubtitle: {
    fontSize: 14,
    color: '#A5DCC6',
  },
  journeyId: {
    fontSize: 22,
    fontWeight: '700',
    color: '#27C992',
    textAlign: 'center',
    marginBottom: 12,
  },
  journeyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#27C99230',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#A5DCC6',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#27C992',
  },
  journeyDates: {
    gap: 8,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#A5DCC6',
  },
  paymentsSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptyPaymentsContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPaymentsText: {
    fontSize: 14,
    color: '#A5DCC6',
    marginTop: 16,
  },
  paymentCard: {
    backgroundColor: '#111C20',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#27C99220',
    gap: 8,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentInfo: {
    flex: 1,
    marginRight: 8,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  paymentSubtitle: {
    fontSize: 12,
    color: '#A5DCC6',
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#27C992',
  },
  paymentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#27C99230',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 11,
    color: '#A5DCC6',
  },
  statusApproved: {
    color: '#27C992',
  },
});

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
} from 'react-native';
import { journeyService, type Journey } from '../../services/journeyService';
import { formatCurrencyWithSymbol } from '../../utils/currency';
import { formatDateToBrasilia } from '../../utils/date';

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

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
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
        <StatusBar style="dark" />
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
      <StatusBar style="dark" />
      
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
          <View style={styles.journeyInfoHeader}>
            <Ionicons name="receipt-outline" size={32} color="#27C992" />
            <View style={styles.journeyInfoText}>
              <Text style={styles.journeyInfoTitle}>
                {journey.bus_line_name || 'Jornada'}
              </Text>
              {journey.bus_line_code && (
                <Text style={styles.journeyInfoSubtitle}>
                  Código: {journey.bus_line_code}
                </Text>
              )}
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
                      {payment.bus_line || 'Pagamento'}
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
  journeyInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  journeyInfoSubtitle: {
    fontSize: 14,
    color: '#A5DCC6',
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


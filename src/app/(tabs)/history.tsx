import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

export default function HistoryScreen() {
  const router = useRouter();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadJourneys();
  }, []);

  const loadJourneys = async () => {
    try {
      setLoading(true);
      
      // Buscar jornadas finalizadas do usuário logado
      const data = await journeyService.listJourneys(true);
      
      // O endpoint retorna um array de Journey
      const journeysList = Array.isArray(data) ? data : [];
      
      setJourneys(journeysList);
    } catch (error: any) {
      // Não mostrar erro, apenas deixar vazio
      setJourneys([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadJourneys();
  };

  const formatDate = (dateString: string) => {
    return formatDateToBrasilia(dateString);
  };

  const handleJourneyPress = (journey: Journey) => {
    // Navegar para detalhes da jornada
    router.push({
      pathname: '/(tabs)/journey-detail',
      params: {
        journeyId: journey.id.toString(),
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#27C992" />
              <Text style={styles.loadingText}>Carregando histórico...</Text>
            </View>
          ) : journeys.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#A5DCC6" />
              <Text style={styles.emptyTitle}>Nenhuma jornada encontrada</Text>
              <Text style={styles.emptySubtitle}>
                Suas jornadas finalizadas aparecerão aqui
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/index' as any)}
              >
                <Text style={styles.emptyButtonText}>Fazer primeiro pagamento</Text>
              </TouchableOpacity>
            </View>
          ) : (
            journeys.map((journey) => (
              <TouchableOpacity
                key={journey.id}
                style={styles.journeyCard}
                onPress={() => handleJourneyPress(journey)}
                activeOpacity={0.7}
              >
                <View style={styles.journeyHeader}>
                  <View style={styles.journeyInfo}>
                    <Text style={styles.journeyTitle}>
                      {journey.bus_line_name || 'Jornada'}
                    </Text>
                    {journey.vehicle_prefix && (
                      <Text style={styles.journeySubtitle}>
                        Veículo: {journey.vehicle_prefix}
                      </Text>
                    )}
                    <Text style={styles.journeySubtitle}>
                      Jornada #{journey.id}
                    </Text>
                  </View>
                  <Text style={styles.amountValue}>
                    {formatCurrencyWithSymbol(journey.total_amount)}
                  </Text>
                </View>

                <View style={styles.journeyDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="people-outline" size={16} color="#A5DCC6" />
                    <Text style={styles.detailText}>
                      {journey.total_passengers || 0} passagem(ns)
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#A5DCC6" />
                    <Text style={styles.detailText}>
                      {formatDate(journey.finalized_at || journey.created_at)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
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
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
    gap: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#A5DCC6',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#A5DCC6',
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#27C992',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#27C992',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  journeyCard: {
    backgroundColor: '#111C20',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    gap: 8,
    borderWidth: 1,
    borderColor: '#27C99220',
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  journeyInfo: {
    flex: 1,
    marginRight: 8,
  },
  journeyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  journeySubtitle: {
    fontSize: 12,
    color: '#A5DCC6',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#27C992',
  },
  journeyDetails: {
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
});


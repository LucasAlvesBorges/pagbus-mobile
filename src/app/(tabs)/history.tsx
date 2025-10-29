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
import { paymentService } from '../../services/paymentService';
import { formatCurrencyWithSymbol } from '../../utils/currency';
import { formatDateToBrasilia } from '../../utils/date';

interface Transaction {
  id: string;
  created_at: string;
  linha?: string;
  veiculo?: string;
  quantidade?: number;
  valor_total?: string;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Buscar histórico do usuário logado
      const data = await paymentService.getUserTransactionHistory();
      
      // O endpoint retorna um array de TransactionHistory
      const transactionsList = Array.isArray(data) ? data : [];
      
      setTransactions(transactionsList);
    } catch (error: any) {
      // Não mostrar erro, apenas deixar vazio
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };


  const formatDate = (dateString: string) => {
    return formatDateToBrasilia(dateString);
  };

  const handleTransactionPress = (transaction: Transaction) => {
    // Navegar para detalhes da transação se necessário
    router.push({
      pathname: '/payment/payment-detail',
      params: {
        transactionId: transaction.id,
      },
    });
  };

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
        <Text style={styles.headerTitle}>Histórico</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#27C992" />
            <Text style={styles.loadingText}>Carregando histórico...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#A5DCC6" />
            <Text style={styles.emptyTitle}>Nenhuma transação encontrada</Text>
            <Text style={styles.emptySubtitle}>
              Suas transações aparecerão aqui
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/index' as any)}
            >
              <Text style={styles.emptyButtonText}>Fazer primeiro pagamento</Text>
            </TouchableOpacity>
          </View>
        ) : (
          transactions.map((transaction) => (
            <TouchableOpacity
              key={transaction.id}
              style={styles.transactionCard}
              onPress={() => handleTransactionPress(transaction)}
              activeOpacity={0.7}
            >
              <View style={styles.transactionHeader}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>
                    {transaction.linha || 'Transação'}
                  </Text>
                  {transaction.veiculo && (
                    <Text style={styles.transactionSubtitle}>
                      Veículo: {transaction.veiculo}
                    </Text>
                  )}
                </View>
                {transaction.valor_total && (
                  <Text style={styles.amountValue}>
                    {formatCurrencyWithSymbol(transaction.valor_total)}
                  </Text>
                )}
              </View>

              <View style={styles.transactionDetails}>
                {transaction.quantidade && (
                  <View style={styles.detailItem}>
                    <Ionicons name="receipt-outline" size={16} color="#A5DCC6" />
                    <Text style={styles.detailText}>
                      {transaction.quantidade}x Passagem
                    </Text>
                  </View>
                )}
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={16} color="#A5DCC6" />
                  <Text style={styles.detailText}>
                    {formatDate(transaction.created_at)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
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
  transactionCard: {
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
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 8,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  transactionSubtitle: {
    fontSize: 12,
    color: '#A5DCC6',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#27C992',
  },
  transactionDetails: {
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


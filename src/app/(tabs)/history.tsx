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
import { authService } from '../../services/authService';
import { formatDateToBrasilia } from '../../utils/date';

interface Transaction {
  id: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  transaction_history?: {
    linha?: string;
    veiculo?: string;
    quantidade?: number;
    valor_total?: string;
  };
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
      const userId = await authService.getStoredUserId();
      
      // Buscar todas as transações
      const data = await paymentService.listTransactions();
      
      // Filtrar por usuário se necessário
      let filteredTransactions = Array.isArray(data) ? data : [];
      
      if (userId) {
        filteredTransactions = filteredTransactions.filter((tx: any) => 
          tx.user_id === userId || tx.transaction_history?.user_id === userId
        );
      }
      
      // Ordenar por data mais recente
      filteredTransactions.sort((a: Transaction, b: Transaction) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      
      setTransactions(filteredTransactions);
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'aprovado':
      case 'approved':
        return '#4CAF50';
      case 'pendente':
      case 'pending':
        return '#FF9800';
      case 'cancelado':
      case 'cancelled':
        return '#F44336';
      default:
        return '#66708c';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'aprovado':
      case 'approved':
        return 'Aprovado';
      case 'pendente':
      case 'pending':
        return 'Pendente';
      case 'cancelado':
      case 'cancelled':
        return 'Cancelado';
      default:
        return status || 'Desconhecido';
    }
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
        <View style={styles.headerContent}>
           <View style={styles.headerIcon}>
             <Ionicons name="time" size={28} color="#fff" />
           </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Histórico</Text>
            <Text style={styles.headerSubtitle}>Suas transações recentes</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#226BFF" />
            <Text style={styles.loadingText}>Carregando histórico...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Nenhuma transação encontrada</Text>
            <Text style={styles.emptySubtitle}>
              Suas transações aparecerão aqui
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/payment/select-busline')}
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
                    {transaction.transaction_history?.linha || 'Transação'}
                  </Text>
                  {transaction.transaction_history?.veiculo && (
                    <Text style={styles.transactionSubtitle}>
                      Veículo: {transaction.transaction_history.veiculo}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(transaction.payment_status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(transaction.payment_status) },
                    ]}
                  >
                    {getStatusLabel(transaction.payment_status)}
                  </Text>
                </View>
              </View>

              {transaction.transaction_history?.valor_total && (
                <View style={styles.transactionAmount}>
                  <Text style={styles.amountLabel}>Valor:</Text>
                  <Text style={styles.amountValue}>
                    {formatCurrencyWithSymbol(transaction.transaction_history.valor_total)}
                  </Text>
                </View>
              )}

              {transaction.transaction_history?.quantidade && (
                <Text style={styles.transactionQuantity}>
                  {transaction.transaction_history.quantidade}x Passagem
                </Text>
              )}

              <View style={styles.transactionFooter}>
                <Ionicons name="calendar-outline" size={14} color="#66708c" />
                <Text style={styles.transactionDate}>
                  {formatDate(transaction.created_at)}
                </Text>
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
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
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
    color: '#66708c',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b1d29',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#66708c',
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#226BFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1d29',
    marginBottom: 4,
  },
  transactionSubtitle: {
    fontSize: 14,
    color: '#66708c',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  amountLabel: {
    fontSize: 14,
    color: '#66708c',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#226BFF',
  },
  transactionQuantity: {
    fontSize: 14,
    color: '#66708c',
  },
  transactionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  transactionDate: {
    fontSize: 12,
    color: '#66708c',
  },
});


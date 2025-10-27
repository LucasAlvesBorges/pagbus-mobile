import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { buslineService, BusLine } from '../../services/buslineService';

export default function SelectBusLineScreen() {
  const router = useRouter();
  const [busLines, setBusLines] = useState<BusLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusLines();
  }, []);

  const loadBusLines = async () => {
    try {
      setLoading(true);
      // TODO: Pegar company_id do contexto de autenticação
      const companyId = 1; // Temporário - deveria vir do contexto de autenticação
      const data = await buslineService.getBusLines(companyId);
      setBusLines(data);
    } catch (error: any) {
      console.error('Erro ao carregar linhas:', error);
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível carregar as linhas. Verifique sua conexão.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBusLine = (busLine: BusLine) => {
    router.push({
      pathname: '/payment/select-vehicle',
      params: {
        busLineId: busLine.id.toString(),
        busLineName: busLine.name,
        busLineCode: busLine.busline_code,
        busLineCompany: busLine.company.toString(),
      },
    });
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Selecionar Linha</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Carregando linhas...</Text>
          </View>
        ) : busLines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bus-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma linha disponível</Text>
          </View>
        ) : (
          <>
            {busLines.map((line) => (
              <TouchableOpacity
                key={line.id}
                style={styles.busLineCard}
                onPress={() => handleSelectBusLine(line)}
              >
                <View style={styles.busLineHeader}>
                  <Ionicons name="bus" size={32} color="#007AFF" />
                  <View style={styles.busLineInfo}>
                    <Text style={styles.busLineName}>{line.name}</Text>
                    <Text style={styles.busLineCode}>{line.busline_code}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#ccc" />
                </View>
              </TouchableOpacity>
            ))}
          </>
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    fontSize: 14,
    color: '#007AFF',
    flex: 1,
    lineHeight: 20,
  },
  busLineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  busLineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  busLineInfo: {
    flex: 1,
  },
  busLineName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  busLineCode: {
    fontSize: 14,
    color: '#666',
  },
});


import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { buslineService, BusLine } from '../../services/buslineService';
import { authService } from '../../services/authService';

export default function SelectBusLineScreen() {
  const router = useRouter();
  const [busLines, setBusLines] = useState<BusLine[]>([]);
  const [filteredBusLines, setFilteredBusLines] = useState<BusLine[]>([]);
  const [searchText, setSearchText] = useState('');
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
      setFilteredBusLines(data);
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

  // Filtrar linhas baseado na busca
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredBusLines(busLines);
    } else {
      const filtered = busLines.filter(line => {
        const search = searchText.toLowerCase();
        const name = line.name.toLowerCase();
        const code = line.busline_code.toLowerCase();
        return name.includes(search) || code.includes(search);
      });
      setFilteredBusLines(filtered);
    }
  }, [searchText, busLines]);

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
              console.error('Erro ao fazer logout:', error);
              Alert.alert('Erro', 'Não foi possível fazer logout');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="exit-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Selecionar Linha</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Campo de busca */}
        {!loading && busLines.length > 0 && (
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nome ou código da linha..."
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="none"
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchText('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            {searchText.length > 0 && (
              <Text style={styles.resultsCount}>
                {filteredBusLines.length} {filteredBusLines.length === 1 ? 'linha encontrada' : 'linhas encontradas'}
              </Text>
            )}
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Carregando linhas...</Text>
          </View>
        ) : filteredBusLines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bus-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchText ? 'Nenhuma linha encontrada' : 'Nenhuma linha disponível'}
            </Text>
            {searchText && (
              <Text style={styles.emptySubText}>Tente buscar por outro termo</Text>
            )}
          </View>
        ) : (
          <>
            {filteredBusLines.map((line) => (
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
  placeholder: {
    width: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1a1a1a',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    paddingLeft: 4,
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
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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


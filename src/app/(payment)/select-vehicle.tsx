import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vehicleService, Vehicle } from '../../services/vehicleService';
import { selectionService } from '../../services/selectionService';

export default function SelectVehicleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { busLineId, busLineName, busLineCode, busLineCompany } = params;
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      // TODO: Pegar company_id do contexto de autenticação
      const companyId = busLineCompany ? parseInt(busLineCompany as string) : 1;
      const data = await vehicleService.getVehicles(companyId);
      setVehicles(data);
      setFilteredVehicles(data);
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível carregar os veículos. Verifique sua conexão.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Filtrar veículos baseado na busca
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredVehicles(vehicles);
    } else {
      const filtered = vehicles.filter(vehicle => {
        const search = searchText.toLowerCase();
        const prefix = vehicle.prefix.toLowerCase();
        return prefix.includes(search);
      });
      setFilteredVehicles(filtered);
    }
  }, [searchText, vehicles]);

  const handleSelectVehicle = async (vehicle: Vehicle) => {
    try {
      // Salvar seleção no SecureStore
      await selectionService.saveSelection({
        busLineId: busLineId as string,
        busLineName: busLineName as string,
        busLineCode: busLineCode as string,
        busLineCompany: (busLineCompany as string) || '1',
        vehiclePrefix: vehicle.prefix,
      });
      
      // Voltar para tabs que mostra payment/index (vai carregar do SecureStore)
      router.replace('/(tabs)' as any);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a seleção');
    }
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Selecionar Veículo</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Linha selecionada */}
        <View style={styles.selectedInfoBox}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedLabel}>Linha selecionada:</Text>
            <Text style={styles.selectedText}>{busLineName}</Text>
          </View>
        </View>

        {/* Campo de busca */}
        {!loading && vehicles.length > 0 && (
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#27C992" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por prefixo do veículo..."
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="none"
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchText('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#27C992" />
                </TouchableOpacity>
              )}
            </View>
            {searchText.length > 0 && (
              <Text style={styles.resultsCount}>
                {filteredVehicles.length} {filteredVehicles.length === 1 ? 'veículo encontrado' : 'veículos encontrados'}
              </Text>
            )}
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#27C992" />
            <Text style={styles.loadingText}>Carregando veículos...</Text>
          </View>
        ) : filteredVehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color="#27C992" />
            <Text style={styles.emptyText}>
              {searchText ? 'Nenhum veículo encontrado' : 'Nenhum veículo disponível'}
            </Text>
            {searchText && (
              <Text style={styles.emptySubText}>Tente buscar por outro prefixo</Text>
            )}
          </View>
        ) : (
          <>
            {filteredVehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.prefix}
                style={styles.vehicleCard}
                onPress={() => handleSelectVehicle(vehicle)}
              >
                <View style={styles.vehicleHeader}>
                  <Ionicons name="car" size={32} color="#27C992" />
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleLabel}>Prefixo</Text>
                    <Text style={styles.vehiclePrefix}>{vehicle.prefix}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#27C992" />
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
  },
  placeholder: {
    width: 40,
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
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27C992',
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#fff',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  resultsCount: {
    fontSize: 14,
    color: '#fff',
    marginTop: 8,
    paddingLeft: 4,
  },
  selectedInfoBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  selectedInfo: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
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
    color: '#fff',
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
    color: '#fff',
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
  vehicleCard: {
    backgroundColor: '#111C20',
    borderRadius: 12,
    marginBottom: 12,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleLabel: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
  vehiclePrefix: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
});


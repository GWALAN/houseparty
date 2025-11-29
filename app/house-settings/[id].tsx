import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, FlatList, Modal, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Settings, X, Trash2, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Game = {
  id: string;
  name: string;
  game_type: string;
  scoring_type?: string;
  created_at: string;
};

export default function HouseSettingsScreen() {
  const { id } = useLocalSearchParams();
  const [house, setHouse] = useState<any>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [showGameManagement, setShowGameManagement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadHouseSettings();
  }, [id, user]);

  const loadHouseSettings = async () => {
    if (!user || !id) return;

    const { data: houseData } = await supabase
      .from('houses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (houseData) {
      setHouse(houseData);
    }

    const { data: gamesData } = await supabase
      .from('games')
      .select('id, name, game_type, scoring_type, created_at')
      .eq('house_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (gamesData) {
      setGames(gamesData);
    }

    setLoading(false);
  };


  const handleDeleteGame = async (gameId: string, gameName: string) => {
    if (!user || saving) return;

    if (Platform.OS === 'web') {
      const confirmed = confirm(
        `Are you sure you want to delete "${gameName}"? This will hide the game from your house, but all game history will be preserved.`
      );
      if (!confirmed) return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('games')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', gameId)
        .eq('house_id', house?.id);

      if (error) {
        console.error('Failed to delete game:', error);
        if (Platform.OS === 'web') {
          alert('Failed to delete game. Please try again.');
        }
        setSaving(false);
        return;
      }

      setGames(games.filter(g => g.id !== gameId));
      console.log('Game deleted successfully:', gameId);
    } catch (err) {
      console.error('Unexpected error deleting game:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>House Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.houseInfo}>
          <Settings size={32} color="#10B981" />
          <Text style={styles.houseName}>{house?.name}</Text>
        </View>


        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Manage Games</Text>
              <Text style={styles.sectionSubtitle}>
                Delete games without losing game history
              </Text>
            </View>
            <Pressable
              style={styles.manageButton}
              onPress={() => setShowGameManagement(true)}
            >
              <Settings size={18} color="#FFFFFF" />
              <Text style={styles.manageButtonText}>Manage</Text>
            </Pressable>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>{games.length}</Text>
            <Text style={styles.statsLabel}>Active Games</Text>
          </View>
        </View>
      </ScrollView>


      <Modal
        visible={showGameManagement}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGameManagement(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Games</Text>
              <Pressable onPress={() => setShowGameManagement(false)}>
                <X size={24} color="#FFFFFF" />
              </Pressable>
            </View>
            {games.length === 0 ? (
              <View style={styles.emptyGamesState}>
                <AlertTriangle size={48} color="#64748B" />
                <Text style={styles.emptyGamesText}>No games in this house</Text>
                <Text style={styles.emptyGamesSubtext}>Add a game to get started</Text>
              </View>
            ) : (
              <FlatList
                data={games}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.gameItem}>
                    <View style={styles.gameItemInfo}>
                      <Text style={styles.gameItemName}>{item.name || 'Unnamed Game'}</Text>
                      <Text style={styles.gameItemDetails}>
                        {item.game_type || 'Custom'} • {item.scoring_type || 'Points'}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDeleteGame(item.id, item.name || 'Unnamed Game')}
                      disabled={saving}
                    >
                      <Trash2 size={20} color="#EF4444" />
                    </Pressable>
                  </View>
                )}
                contentContainerStyle={styles.gamesList}
              />
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  houseInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  houseName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statsNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingTop: 20,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  gamesList: {
    padding: 16,
    paddingBottom: 32,
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gameItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  gameItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gameItemDetails: {
    fontSize: 13,
    color: '#94A3B8',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  emptyGamesState: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGamesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyGamesSubtext: {
    fontSize: 14,
    color: '#94A3B8',
  },
});

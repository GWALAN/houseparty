import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import HouseLimitModal from '@/components/HouseLimitModal';

export default function JoinHouseScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [houseName, setHouseName] = useState('');
  const { user } = useAuth();
  const router = useRouter();

  const handleJoin = async () => {
    try {
      console.log('[JOIN HOUSE] Button pressed');

      if (!inviteCode.trim() || !nickname.trim()) {
        console.log('[JOIN HOUSE] Validation failed: empty fields');
        setError('Please fill in all fields');
        return;
      }

      if (!user) {
        console.log('[JOIN HOUSE] No authenticated user');
        setError('You must be signed in to join a house');
        return;
      }

      console.log('[JOIN HOUSE] Starting join process...', { inviteCode, nickname, userId: user.id });
      setLoading(true);
      setError('');

      const normalizedCode = inviteCode.toUpperCase().trim();
      console.log('[JOIN HOUSE] Looking up house with code:', normalizedCode);

      const { data: house, error: houseError } = await supabase
        .from('houses')
        .select('id, name')
        .eq('invite_code', normalizedCode)
        .maybeSingle();

      if (houseError) {
        console.error('[JOIN HOUSE] Database error:', houseError);
        setError(`Error finding house: ${houseError.message}`);
        setLoading(false);
        return;
      }

      if (!house) {
        console.log('[JOIN HOUSE] No house found with code:', normalizedCode);
        setError('Invalid invite code. Please check and try again.');
        setLoading(false);
        return;
      }

      console.log('[JOIN HOUSE] House found:', house.id, house.name);
      setHouseName(house.name);

      // Check user's house limit before joining
      const { data: limitCheck, error: limitError } = await supabase
        .rpc('check_user_can_join_house', { user_id_param: user.id });

      if (limitError) {
        console.error('[JOIN HOUSE] Error checking house limit:', limitError);
        setError('Failed to check house limit');
        setLoading(false);
        return;
      }

      if (limitCheck && !limitCheck.can_join) {
        console.log('[JOIN HOUSE] House limit reached, showing upgrade modal');
        setLoading(false);
        setShowLimitModal(true);
        return;
      }

      // Check if house has reached 50-member cap
      const { count: memberCount } = await supabase
        .from('house_members')
        .select('*', { count: 'exact', head: true })
        .eq('house_id', house.id);

      const currentMemberCount = memberCount || 0;
      console.log('[JOIN HOUSE] Current member count:', currentMemberCount, '/ 50');

      if (currentMemberCount >= 50) {
        console.log('[JOIN HOUSE] House is full');
        setError(`${house.name} is full (50/50 members). Please try another house.`);
        setLoading(false);
        return;
      }

      console.log('[JOIN HOUSE] Checking existing membership...');

      const { data: existingMember } = await supabase
        .from('house_members')
        .select('id')
        .eq('house_id', house.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        console.log('[JOIN HOUSE] User is already a member');
        setError(`You are already a member of ${house.name}`);
        setLoading(false);
        return;
      }

      console.log('[JOIN HOUSE] Adding member to house...');

      const { error: memberError } = await supabase
        .from('house_members')
        .insert({
          house_id: house.id,
          user_id: user.id,
          nickname: nickname,
          role: 'member',
        });

      if (memberError) {
        console.error('[JOIN HOUSE] Member insert error:', memberError);
        setError(`Failed to join house: ${memberError.message}`);
        setLoading(false);
        return;
      }

      console.log('[JOIN HOUSE] Successfully joined house');
      console.log('[JOIN HOUSE] Navigating to home...');

      setLoading(false);

      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    } catch (err) {
      console.error('[JOIN HOUSE] Unexpected error:', err);
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#FFFFFF" />
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.title}>Join a House</Text>
        <Text style={styles.subtitle}>Enter the invite code to join</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Invite Code</Text>
            <TextInput
              style={styles.input}
              placeholder="ABC123"
              placeholderTextColor="#64748B"
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              returnKeyType="next"
              blurOnSubmit={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Your Nickname</Text>
            <TextInput
              style={styles.input}
              placeholder="PlayerOne"
              placeholderTextColor="#64748B"
              value={nickname}
              onChangeText={setNickname}
              returnKeyType="done"
              onSubmitEditing={handleJoin}
              editable={!loading}
            />
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleJoin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Join House</Text>
            )}
          </Pressable>
        </View>
      </View>

      <HouseLimitModal
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={() => {
          setShowLimitModal(false);
          router.push('/(tabs)/profile');
        }}
        context="join"
        houseName={houseName}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: typeof Platform !== 'undefined' && Platform.OS === 'android' ? 100 : 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 32,
  },
  error: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

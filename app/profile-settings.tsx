import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/lib/supabase';
import EmojiTextInput from '@/components/EmojiTextInput';

export default function ProfileSettingsScreen() {
  const [localDisplayName, setLocalDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const { user, resetPassword } = useAuth();
  const { displayName, updateDisplayName } = useProfile();
  const router = useRouter();

  useEffect(() => {
    loadProfileSettings();
  }, [user]);

  useEffect(() => {
    setLocalDisplayName(displayName || '');
  }, [displayName]);

  const loadProfileSettings = async () => {
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setPasswordError('');
    setSaving(true);

    try {
      if (localDisplayName !== displayName) {
        await updateDisplayName(localDisplayName);
      }

      if (newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
          setPasswordError('Passwords do not match');
          setSaving(false);
          return;
        }

        if (newPassword.length < 6) {
          setPasswordError('Password must be at least 6 characters');
          setSaving(false);
          return;
        }

        if (Platform.OS === 'web') {
          alert('To change your password, please use the Forgot Password link on the sign-in page.');
        } else {
          Alert.alert(
            'Change Password',
            'To change your password, please use the Forgot Password link on the sign-in page.'
          );
        }
        setSaving(false);
        return;
      }

      if (Platform.OS === 'web') {
        alert('Settings saved successfully!');
      } else {
        Alert.alert('Success', 'Settings saved successfully!');
      }

      router.back();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save settings: ' + error.message);
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
        <Text style={styles.title}>Profile Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.label}>Display Name</Text>
          <EmojiTextInput
            style={styles.input}
            placeholder="Your display name"
            placeholderTextColor="#64748B"
            value={localDisplayName}
            onChangeText={setLocalDisplayName}
          />
          <Text style={styles.hint}>This name will be shown alongside your username</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lock size={20} color="#10B981" />
            <Text style={styles.label}>Change Password</Text>
          </View>
          <Text style={styles.passwordNotice}>
            To change your password, please use the "Forgot Password" link on the sign-in page. This ensures secure password reset via email verification.
          </Text>
        </View>

        {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Settings</Text>
          )}
        </Pressable>
      </ScrollView>
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
    paddingBottom: typeof Platform !== 'undefined' && Platform.OS === 'android' ? 100 : 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
  hint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  passwordNotice: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  error: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#94A3B8',
  },
});

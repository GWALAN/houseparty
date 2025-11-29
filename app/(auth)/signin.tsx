import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Eye, EyeOff, Fingerprint } from 'lucide-react-native';
import * as Biometrics from '@/lib/biometrics';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const { signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const supported = await Biometrics.isBiometricSupported();
    const enrolled = await Biometrics.isBiometricEnrolled();
    const enabled = await Biometrics.isBiometricEnabled();
    const type = await Biometrics.getBiometricType();

    setBiometricType(type);
    setBiometricAvailable(supported && enrolled && enabled);
  };

  const handleSignIn = async (skipBiometricPrompt = false) => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (!skipBiometricPrompt && Platform.OS !== 'web') {
      const supported = await Biometrics.isBiometricSupported();
      const enrolled = await Biometrics.isBiometricEnrolled();
      const enabled = await Biometrics.isBiometricEnabled();

      if (supported && enrolled && !enabled) {
        const type = await Biometrics.getBiometricType();
        Alert.alert(
          `Enable ${type}?`,
          `Would you like to use ${type} to sign in next time?`,
          [
            {
              text: 'Not Now',
              style: 'cancel',
            },
            {
              text: 'Enable',
              onPress: async () => {
                try {
                  await Biometrics.enableBiometric(email, password);
                  Alert.alert('Success', `${type} enabled successfully`);
                } catch (error) {
                  console.error('[SIGNIN] Error enabling biometric:', error);
                }
              },
            },
          ]
        );
      }
    }
  };

  const handleBiometricSignIn = async () => {
    setBiometricLoading(true);
    setError('');

    try {
      const authenticated = await Biometrics.authenticateWithBiometrics();

      if (!authenticated) {
        setError('Authentication failed');
        setBiometricLoading(false);
        return;
      }

      const credentials = await Biometrics.getStoredCredentials();

      if (!credentials) {
        setError('No stored credentials found');
        setBiometricLoading(false);
        return;
      }

      const { error } = await signIn(credentials.email, credentials.password);

      if (error) {
        setError(error.message);
      }
    } catch (error) {
      console.error('[SIGNIN] Biometric sign in error:', error);
      setError('Biometric authentication failed');
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#FFFFFF" />
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} color="#94A3B8" />
              ) : (
                <Eye size={20} color="#94A3B8" />
              )}
            </Pressable>
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotPasswordButton}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </Pressable>

        {biometricAvailable && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={[styles.biometricButton, biometricLoading && styles.buttonDisabled]}
              onPress={handleBiometricSignIn}
              disabled={biometricLoading}
            >
              {biometricLoading ? (
                <ActivityIndicator color="#10B981" />
              ) : (
                <>
                  <Fingerprint size={24} color="#10B981" />
                  <Text style={styles.biometricText}>Sign in with {biometricType}</Text>
                </>
              )}
            </Pressable>
          </>
        )}

        <Pressable onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.link}>
            Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
          </Text>
        </Pressable>
      </View>
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
    gap: 16,
    marginBottom: 24,
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    padding: 16,
    paddingRight: 50,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#10B981',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748B',
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
    marginBottom: 24,
  },
  biometricText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: '#94A3B8',
    textAlign: 'center',
  },
  linkBold: {
    color: '#10B981',
    fontWeight: '600',
  },
});

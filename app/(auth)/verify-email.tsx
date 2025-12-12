import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  const { resendVerificationEmail } = useAuth();

  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleResendEmail = async () => {
    if (cooldownSeconds > 0) return;

    setResending(true);
    setResendSuccess(false);
    setResendError('');

    const { error } = await resendVerificationEmail(email);

    if (error) {
      setResendError(error.message || 'Failed to resend verification email');
    } else {
      setResendSuccess(true);
      setCooldownSeconds(60); // 60 second cooldown
      setTimeout(() => setResendSuccess(false), 5000);
    }

    setResending(false);
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <Pressable style={styles.backButton} onPress={() => router.replace('/(auth)/signin')}>
        <ArrowLeft size={24} color="#FFFFFF" />
      </Pressable>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Mail size={64} color="#10B981" />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification link to
        </Text>
        <Text style={styles.email}>{email}</Text>

        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>Next Steps:</Text>
          <Text style={styles.instructionsText}>1. Check your inbox for our verification email</Text>
          <Text style={styles.instructionsText}>2. Click the verification link in the email</Text>
          <Text style={styles.instructionsText}>3. You'll be redirected back to the app</Text>
          <Text style={styles.instructionsText}>4. Sign in with your new account</Text>
        </View>

        <Text style={styles.note}>
          Don't see the email? Check your spam folder.
        </Text>

        {resendSuccess && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>Verification email sent successfully!</Text>
          </View>
        )}

        {resendError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{resendError}</Text>
          </View>
        )}

        <Pressable
          style={[
            styles.resendButton,
            (resending || cooldownSeconds > 0) && styles.resendButtonDisabled
          ]}
          onPress={handleResendEmail}
          disabled={resending || cooldownSeconds > 0}
        >
          {resending ? (
            <ActivityIndicator color="#10B981" size="small" />
          ) : (
            <>
              <RefreshCw size={20} color={cooldownSeconds > 0 ? '#64748B' : '#10B981'} />
              <Text style={[
                styles.resendButtonText,
                cooldownSeconds > 0 && styles.resendButtonTextDisabled
              ]}>
                {cooldownSeconds > 0
                  ? `Resend in ${cooldownSeconds}s`
                  : 'Resend Verification Email'}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={styles.signInButton}
          onPress={() => router.replace('/(auth)/signin')}
        >
          <Text style={styles.signInButtonText}>Back to Sign In</Text>
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
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 32,
  },
  instructionsBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
    lineHeight: 20,
  },
  note: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  successText: {
    color: '#10B981',
    textAlign: 'center',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '600',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
    marginBottom: 16,
    width: '100%',
    maxWidth: 400,
  },
  resendButtonDisabled: {
    borderColor: '#334155',
    opacity: 0.6,
  },
  resendButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: '#64748B',
  },
  signInButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

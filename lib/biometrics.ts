import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const STORED_EMAIL_KEY = 'stored_email';
const STORED_PASSWORD_KEY = 'stored_password';

export async function isBiometricSupported(): Promise<boolean> {
  return false;
}

export async function isBiometricEnrolled(): Promise<boolean> {
  return false;
}

export async function getBiometricType(): Promise<string> {
  return 'none';
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  return false;
}

export async function isBiometricEnabled(): Promise<boolean> {
  return false;
}

export async function enableBiometric(email: string, password: string): Promise<void> {
  throw new Error('Biometric authentication not supported in Expo Go');
}

export async function disableBiometric(): Promise<void> {
  return;
}

export async function getStoredCredentials(): Promise<{ email: string; password: string } | null> {
  return null;
}

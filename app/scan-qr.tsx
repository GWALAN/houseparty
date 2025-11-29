import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { CameraView, Camera, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function ScanQRScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);

    try {
      console.log('[QR SCAN] Scanned data:', data);

      const qrData = JSON.parse(data);

      if (qrData.type !== 'house_invite') {
        Alert.alert('Invalid QR Code', 'This is not a valid house invite QR code.');
        setScanned(false);
        setProcessing(false);
        return;
      }

      if (qrData.expiresAt && Date.now() > qrData.expiresAt) {
        Alert.alert('Expired QR Code', 'This QR code has expired. Please ask for a new one.');
        setScanned(false);
        setProcessing(false);
        return;
      }

      const { houseId, inviteCode, houseName } = qrData;

      console.log('[QR SCAN] Valid house invite:', { houseId, houseName });

      const { data: existingMember } = await supabase
        .from('house_members')
        .select('id')
        .eq('house_id', houseId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingMember) {
        Alert.alert('Already a Member', `You are already a member of ${houseName}.`, [
          {
            text: 'View House',
            onPress: () => router.replace(`/house/${houseId}`),
          },
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
        setProcessing(false);
        return;
      }

      Alert.alert(
        'Join House',
        `Would you like to join "${houseName}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setScanned(false);
              setProcessing(false);
            },
          },
          {
            text: 'Join',
            onPress: async () => {
              await joinHouse(houseId, houseName);
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('[QR SCAN] Error processing QR code:', error);
      Alert.alert('Error', 'Could not read QR code. Please try again.');
      setScanned(false);
      setProcessing(false);
    }
  };

  const joinHouse = async (houseId: string, houseName: string) => {
    try {
      console.log('[QR SCAN] Joining house...', houseId);

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user?.id)
        .maybeSingle();

      const nickname = profile?.display_name || user?.email?.split('@')[0] || 'New Member';

      const { error } = await supabase.from('house_members').insert({
        house_id: houseId,
        user_id: user?.id,
        nickname: nickname,
        role: 'member',
      });

      if (error) {
        console.error('[QR SCAN] Error joining house:', error);

        if (error.code === '23505') {
          Alert.alert('Already Joined', 'You are already a member of this house.');
        } else {
          Alert.alert('Error', `Could not join house: ${error.message}`);
        }

        setScanned(false);
        setProcessing(false);
        return;
      }

      console.log('[QR SCAN] Successfully joined house');

      Alert.alert('Success!', `You have joined ${houseName}!`, [
        {
          text: 'View House',
          onPress: () => router.replace(`/house/${houseId}`),
        },
      ]);
    } catch (error) {
      console.error('[QR SCAN] Unexpected error joining house:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setScanned(false);
      setProcessing(false);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={styles.permissionTitle}>QR Scanning Not Available</Text>
          <Text style={styles.permissionText}>
            QR code scanning requires camera access, which is not available in the web version.
            {'\n\n'}
            To join a house, please use the "Join House" option and enter the invite code manually.
          </Text>
          <Pressable style={styles.permissionButton} onPress={() => router.replace('/join-house')}>
            <Text style={styles.buttonText}>Enter Invite Code</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  if (!permission) {
    return (
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!permission.granted) {
    return (
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan QR codes for joining houses.
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']}
          style={styles.overlay}
        >
          <View style={styles.header}>
            <Pressable
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <X size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {processing
                ? 'Processing...'
                : 'Position the QR code within the frame'}
            </Text>
            {processing && (
              <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 12 }} />
            )}
          </View>
        </LinearGradient>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#10B981',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  instructions: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 60,
  },
  instructionText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
});

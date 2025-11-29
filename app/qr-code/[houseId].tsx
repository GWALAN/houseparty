import { View, Text, StyleSheet, Pressable, Platform, Share } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Share2, Link as LinkIcon } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { deepLinking } from '@/lib/deepLinking';
import QRCode from 'react-native-qrcode-svg';
import Toast from '@/components/Toast';

type QRCodeProps = {
  value: string;
  size: number;
};

function QRCodeDisplay({ value, size }: QRCodeProps) {
  return (
    <View style={[styles.qrContainer, { width: size, height: size }]}>
      <QRCode
        value={value}
        size={size}
        backgroundColor="#FFFFFF"
        color="#000000"
      />
    </View>
  );
}

export default function QRCodeScreen() {
  const { houseId } = useLocalSearchParams();
  const [house, setHouse] = useState<any>(null);
  const [qrData, setQrData] = useState<string>('');
  const [shareLink, setShareLink] = useState<string>('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadHouseData();
  }, [houseId]);

  const loadHouseData = async () => {
    if (!houseId || !user) return;

    const { data, error } = await supabase
      .from('houses')
      .select('*')
      .eq('id', houseId)
      .maybeSingle();

    if (data && !error) {
      setHouse(data);

      const inviteLink = deepLinking.generateHouseInviteLink(data.id, data.invite_code);
      setShareLink(inviteLink);

      const qrPayload = JSON.stringify({
        type: 'house_invite',
        houseId: data.id,
        inviteCode: data.invite_code,
        houseName: data.name,
        url: inviteLink,
      });
      setQrData(qrPayload);
    }
  };

  const handleShareLink = async () => {
    try {
      const result = await Share.share({
        message: `Join my house "${house.name}" on HouseParty! ${shareLink}`,
        title: `Join ${house.name}`,
        url: shareLink,
      });

      if (result.action === Share.sharedAction) {
        setToast({ visible: true, message: 'Invite link shared!', type: 'success' });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      setToast({ visible: true, message: 'Failed to share link', type: 'error' });
    }
  };

  const handleCopyLink = async () => {
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(shareLink);
        setToast({ visible: true, message: 'Link copied to clipboard!', type: 'success' });
      } catch (error) {
        setToast({ visible: true, message: 'Failed to copy link', type: 'error' });
      }
    } else {
      setToast({ visible: true, message: 'Link: ' + shareLink, type: 'success' });
    }
  };

  if (!house) {
    return (
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.headerTitle}>House QR Code</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.qrWrapper}>
          <QRCodeDisplay value={qrData} size={280} />
        </View>

        <View style={styles.info}>
          <Text style={styles.houseName}>{house.name}</Text>
          <Text style={styles.infoText}>
            {Platform.OS === 'web'
              ? 'Share this QR code or invite code to let others join your house'
              : 'Have others scan this QR code to join your house'
            }
          </Text>
        </View>

        <View style={styles.actionsSection}>
          <Pressable style={styles.actionButton} onPress={handleShareLink}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.actionGradient}
            >
              <Share2 size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Share Link</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={handleCopyLink}>
            <View style={styles.actionOutline}>
              <LinkIcon size={20} color="#10B981" />
              <Text style={styles.actionTextOutline}>Copy Link</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.fallbackSection}>
          <Text style={styles.fallbackTitle}>Or share invite code:</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.code}>{house.invite_code}</Text>
          </View>
        </View>
      </View>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast({ ...toast, visible: false })}
      />
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
  loadingText: {
    fontSize: 16,
    color: '#94A3B8',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
  },
  qrWrapper: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  qrContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  info: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
  houseName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
  },
  expiryBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  expiryText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 32,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  actionOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 12,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  actionTextOutline: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '600',
  },
  fallbackSection: {
    marginTop: 'auto',
    width: '100%',
    alignItems: 'center',
    paddingBottom: 24,
  },
  fallbackTitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  codeContainer: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  code: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
    letterSpacing: 4,
  },
});

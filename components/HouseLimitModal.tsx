import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Crown, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

type HouseLimitModalProps = {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  context: 'create' | 'join';
  houseName?: string;
};

export default function HouseLimitModal({
  visible,
  onClose,
  onUpgrade,
  context,
  houseName
}: HouseLimitModalProps) {
  const title = context === 'create'
    ? 'House Limit Reached'
    : 'Upgrade to Join This House';

  const message = context === 'create'
    ? 'Free tier allows up to 2 houses. Upgrade to Premium for unlimited houses.'
    : houseName
      ? `You've reached your free limit of 2 houses. Upgrade to Premium for $4.99 to join "${houseName}" and more.`
      : `You've reached your free limit of 2 houses. Upgrade to Premium for $4.99 to join this house and more.`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#666" />
          </Pressable>

          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.iconGradient}
            >
              <Crown size={40} color="#FFF" fill="#FFF" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.benefitsContainer}>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitBullet}>•</Text>
              <Text style={styles.benefitText}>Unlimited houses</Text>
            </View>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitBullet}>•</Text>
              <Text style={styles.benefitText}>Join any house invitation</Text>
            </View>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitBullet}>•</Text>
              <Text style={styles.benefitText}>One-time payment, lifetime access</Text>
            </View>
          </View>

          <Pressable style={styles.upgradeButton} onPress={onUpgrade}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeGradient}
            >
              <Crown size={20} color="#FFF" fill="#FFF" />
              <Text style={styles.upgradeButtonText}>Upgrade to Premium - $4.99</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitBullet: {
    fontSize: 20,
    color: '#FFD700',
    marginRight: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  upgradeButton: {
    width: '100%',
    marginBottom: 12,
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
});

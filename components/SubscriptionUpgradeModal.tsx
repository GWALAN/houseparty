import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';

type SubscriptionUpgradeModalProps = {
  visible: boolean;
  onClose: () => void;
  currentPlan: string;
  onSelectPlan: (planId: string) => void;
};

type Plan = {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  colors: [string, string];
};

const plans: Plan[] = [
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99/mo',
    description: 'Perfect for casual players',
    features: ['Access to Pro banners', 'Custom house emoji', 'Priority support'],
    colors: ['#3B82F6', '#2563EB'],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '$19.99/mo',
    description: 'For serious competitors',
    features: ['All Pro features', 'Access to Elite banners', 'Advanced analytics', 'Custom badges'],
    colors: ['#8B5CF6', '#7C3AED'],
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: '$29.99/mo',
    description: 'The complete experience',
    features: ['All Elite features', 'Access to Ultimate banners', 'Exclusive rewards', 'Early access to new features'],
    colors: ['#EF4444', '#DC2626'],
  },
];

export default function SubscriptionUpgradeModal({
  visible,
  onClose,
  currentPlan,
  onSelectPlan,
}: SubscriptionUpgradeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Upgrade Your Plan</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {plans.map((plan) => (
              <Pressable
                key={plan.id}
                style={styles.planCard}
                onPress={() => onSelectPlan(plan.id)}
              >
                <LinearGradient
                  colors={plan.colors}
                  style={styles.planGradient}
                >
                  <View style={styles.planHeader}>
                    <View>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planDescription}>{plan.description}</Text>
                    </View>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                  </View>

                  <View style={styles.featuresContainer}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.featureRow}>
                        <Check size={16} color="#FFFFFF" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    style={styles.selectButton}
                    onPress={() => onSelectPlan(plan.id)}
                  >
                    <Text style={styles.selectButtonText}>Select Plan</Text>
                  </Pressable>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  planCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  planGradient: {
    padding: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  selectButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

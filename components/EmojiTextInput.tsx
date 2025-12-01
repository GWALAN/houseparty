import { View, TextInput, StyleSheet, Pressable, Modal, TextInputProps, Text, ScrollView, Platform } from 'react-native';
import { useState } from 'react';
import { Smile, X } from 'lucide-react-native';
import Emoji3D from './Emoji3D';

interface EmojiTextInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  style?: any;
}

const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋',
  '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳', '😏',
  '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩',
  '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵',
  '👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️', '🤞', '🤟',
  '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀',
  '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪',
];

export default function EmojiTextInput({ value, onChangeText, style, ...props }: EmojiTextInputProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiSelect = (emoji: string) => {
    onChangeText(value + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, style]}
        {...props}
      />
      <Pressable
        style={styles.emojiButton}
        onPress={() => setShowEmojiPicker(true)}
      >
        <Smile size={20} color="#64748B" />
      </Pressable>

      <Modal
        visible={showEmojiPicker}
        transparent={true}
        animationType={Platform.OS === 'ios' ? 'slide' : 'fade'}
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEmojiPicker(false)}
        >
          <Pressable style={styles.emojiPickerContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Emoji</Text>
              <Pressable onPress={() => setShowEmojiPicker(false)}>
                <X size={24} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView style={styles.emojiGrid}>
              <View style={styles.emojiRow}>
                {COMMON_EMOJIS.map((emoji, index) => (
                  <Pressable
                    key={index}
                    style={styles.emojiItem}
                    onPress={() => handleEmojiSelect(emoji)}
                  >
                    <Emoji3D emoji={emoji} size="large" />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    paddingRight: 48,
  },
  emojiButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emojiPickerContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: 500,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emojiGrid: {
    flex: 1,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emojiItem: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
});

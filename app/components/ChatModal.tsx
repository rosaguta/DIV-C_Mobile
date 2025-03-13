import { Modal, View, Text, Pressable, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { PropsWithChildren, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = PropsWithChildren<{
  isVisible: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
}>;

export default function ChatModal({ isVisible, children, onClose, onSendMessage }: Props) {
  const [chatMsg, setChatMsg] = useState('');
  
  const handleSend = () => {
    if (chatMsg.trim()) {
      onSendMessage(chatMsg);
      setChatMsg('');
    }
  };

  return (
    <View>
      <Modal animationType="slide" transparent={true} visible={isVisible}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalWrapper}>
          <View style={styles.modalContent}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Chat</Text>
              <Pressable onPress={onClose}>
                <MaterialIcons name="close" color="#fff" size={22} />
              </Pressable>
            </View>
            
            <View style={styles.chatContainer}>
              {children}
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                value={chatMsg}
                onChangeText={setChatMsg}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <Pressable 
                style={styles.sendButton} 
                onPress={handleSend}
                disabled={!chatMsg.trim()}
              >
                <Ionicons 
                  name="send" 
                  size={24} 
                  color={chatMsg.trim() ? "#007AFF" : "#C7C7CC"} 
                />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '40%',
    width: '100%',
    backgroundColor: '#F2F2F7',
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    position: 'absolute',
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  titleContainer: {
    height: '16%',
    backgroundColor: '#4F4F4F',
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
    padding: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    padding: 6,
  },
});
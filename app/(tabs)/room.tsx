import React, { useEffect, useState, useRef } from 'react';
import { Text, View, Button, StyleSheet, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { io } from 'socket.io-client';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, MediaStream, mediaDevices, RTCView, registerGlobals } from 'react-native-webrtc';
import { useRouter } from 'expo-router';
import ChatModal from '../components/ChatModal'
import * as Haptics from 'expo-haptics'
registerGlobals()
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.solcon.nl:3478' }
  ],
  iceCandidatePoolSize: 10,
};

type Participant = {
  id: string;
  username: string;
  stream: MediaStream | null;
}

type PeerConnection = {
  peerId: string;
  connection: RTCPeerConnection;
}

const Room = () => {
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [chat, setChat] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);

  const router = useRouter();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<any>(null);
  const socketChatRef = useRef<any>(null);
  const peerConnectionsRef = useRef<PeerConnection[]>([]);
  const isRoomCreatorRef = useRef(false);

  const [isChatModalVisible, setIsChatModalVisible] = useState(false)

  const roomName = "phone"

  useEffect(() => {
    if (!roomName) return;

    // Connect to socket server
    socketRef.current = io('http://145.93.105.237:4000', {
      transports: ['websocket'],
      forceNew: true
    });
    socketChatRef.current = io('http://145.93.105.237:4001',{
      transports: ['websocket']
    })
    console.log('Connecting to socket server...');
    socketChatRef.current.on('connect',()=>{
      console.log("connected to chat service")
      socketChatRef.current.emit('join', roomName)
      socketChatRef.current.emit('messages', roomName)
    })
    socketChatRef.current.on('message', handleChatMessage)

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server with ID:', socketRef.current.id);
      socketRef.current.emit('join', roomName);
      // socketRef.current.emit('messages', roomName);
    });
    

    // Socket event handlers
    socketRef.current.on('created', handleRoomCreated);
    socketRef.current.on('joined', handleRoomJoined);
    socketRef.current.on('user-list', handleUserList);
    socketRef.current.on('user-joined', handleUserJoined);
    socketRef.current.on('user-left', handleUserLeft);
    socketRef.current.on('ready', handlePeerReady);
    socketRef.current.on('message', handleChatMessage);
    socketRef.current.on('full', () => {
      alert('Room is full');
      router.push('/');
    });

    // WebRTC signaling events
    socketRef.current.on('offer', handleReceivedOffer);
    socketRef.current.on('answer', handleAnswer);
    socketRef.current.on('ice-candidate', handleIceCandidate);

    return () => {
      // Cleanup function
      leaveRoom();
    };
  }, [roomName]);

  // Setup local video when component mounts
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [localStreamRef.current]);

  const handleRoomCreated = () => {
    console.log('Room created, setting as host...');
    isRoomCreatorRef.current = true;
    requestMediaAccess();
  };

  const handleRoomJoined = () => {
    console.log('Room joined, requesting media...');
    requestMediaAccess();
  };

  const handleUserList = (users) => {
    console.log('Received user list:', users);
    // Store the current user list to initiate connections later
    users.forEach(user => {
      setParticipants(prev => {
        if (prev.find(p => p.id === user.id)) return prev;
        return [...prev, {
          id: user.id,
          username: user.username || `User ${user.id.substring(0, 5)}`,
          stream: null
        }];
      });
    });
  };

  const handleUserJoined = (user) => {
    console.log(`User joined: ${user.username || user.id}`);

    // Add new participant to state (without stream yet)
    setParticipants(prev => {
      if (prev.find(p => p.id === user.id)) return prev;
      return [...prev, {
        id: user.id,
        username: user.username || `User ${user.id.substring(0, 5)}`,
        stream: null
      }];
    });
  };

  const handlePeerReady = (peerId) => {
    console.log(`Peer is ready: ${peerId}`);
    // Initiate connection to this peer
    createPeerConnection(peerId);
  };

  const handleUserLeft = (userId) => {
    console.log(`User left: ${userId}`);

    // Clean up peer connection
    const connectionIndex = peerConnectionsRef.current.findIndex(pc => pc.peerId === userId);
    if (connectionIndex !== -1) {
      const connection = peerConnectionsRef.current[connectionIndex].connection;
      connection.ontrack = null;
      connection.onicecandidate = null;
      connection.close();

      peerConnectionsRef.current.splice(connectionIndex, 1);
    }

    // Remove from participants list
    setParticipants(prev => prev.filter(p => p.id !== userId));
  };

  const handleChatMessage = (messages) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setChat(messages);
  };

  const requestMediaAccess = () => {
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: true
      })
      .then((stream) => {
        console.log('Media access granted');
        localStreamRef.current = stream;
        localStreamRef.current?.getTracks().forEach((track) => {
          if (track.kind === 'video') {
            track.enabled = cameraActive;
          }
        });
        // Add local user to participants
        const localParticipant: Participant = {
          id: socketRef.current.id,
          username: `You`,
          stream: stream
        };

        setParticipants(prev => {
          if (prev.find(p => p.id === socketRef.current.id)) return prev;
          return [...prev, localParticipant];
        });

        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          
        }

        // Signal that we're ready to connect
        socketRef.current.emit('ready', roomName);
      })
      .catch((err) => {
        console.error('Error accessing media devices:', err);
        alert('Could not access camera or microphone. Please check permissions.');
      });
  };

  const createPeerConnection = (peerId) => {
    console.log(`Creating peer connection with ${peerId}`);

    // Check if we already have a connection to this peer
    const existingConnection = peerConnectionsRef.current.find(pc => pc.peerId === peerId);
    if (existingConnection) {
      console.log(`Connection to ${peerId} already exists`);
      return existingConnection.connection;
    }

    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Add this connection to our ref array
    peerConnectionsRef.current.push({
      peerId,
      connection: peerConnection
    });

    // Add our local stream tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    // Set up ICE candidate handling
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${peerId}`);
        socketRef.current.emit('ice-candidate', {
          targetId: peerId,
          candidate: event.candidate
        }, roomName);
      }
    };

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log(`Received tracks from ${peerId}`);

      setParticipants(prev => {
        const updatedParticipants = [...prev];
        const participantIndex = updatedParticipants.findIndex(p => p.id === peerId);

        if (participantIndex !== -1) {
          updatedParticipants[participantIndex] = {
            ...updatedParticipants[participantIndex],
            stream: event.streams[0]
          };
        }

        return updatedParticipants;
      });
    };

    // Create and send offer if we're initiating the connection
    peerConnection
      .createOffer()
      .then(offer => {
        return peerConnection.setLocalDescription(offer);
      })
      .then(() => {
        console.log(`Sending offer to ${peerId}`);
        socketRef.current.emit('offer', {
          targetId: peerId,
          offer: peerConnection.localDescription
        }, roomName);
      })
      .catch(err => {
        console.error('Error creating offer:', err);
      });

    return peerConnection;
  };

  const handleReceivedOffer = ({ offer, from }) => {
    console.log(`Received offer from ${from}`);

    // Create peer connection if it doesn't exist
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Save the connection
    peerConnectionsRef.current.push({
      peerId: from,
      connection: peerConnection
    });

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    // ICE candidate handling
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', {
          targetId: from,
          candidate: event.candidate
        }, roomName);
      }
    };

    // Track handling
    peerConnection.ontrack = (event) => {
      console.log(`Received tracks from ${from}`);

      setParticipants(prev => {
        const updatedParticipants = [...prev];
        const participantIndex = updatedParticipants.findIndex(p => p.id === from);

        if (participantIndex !== -1) {
          updatedParticipants[participantIndex] = {
            ...updatedParticipants[participantIndex],
            stream: event.streams[0]
          };
        } else {
          // If participant isn't in the list yet, add them
          updatedParticipants.push({
            id: from,
            username: `User ${from.substring(0, 5)}`,
            stream: event.streams[0]
          });
        }

        return updatedParticipants;
      });
    };

    // Set remote description (the offer)
    peerConnection
      .setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => {
        // Create answer
        return peerConnection.createAnswer();
      })
      .then(answer => {
        // Set local description (the answer)
        return peerConnection.setLocalDescription(answer);
      })
      .then(() => {
        // Send answer to peer
        socketRef.current.emit('answer', {
          targetId: from,
          answer: peerConnection.localDescription
        }, roomName);
      })
      .catch(err => {
        console.error('Error handling offer:', err);
      });
  };

  const handleAnswer = ({ answer, from }) => {
    console.log(`Received answer from ${from}`);

    // Find the appropriate peer connection
    const peerConnection = peerConnectionsRef.current.find(pc => pc.peerId === from)?.connection;

    if (peerConnection) {
      peerConnection
        .setRemoteDescription(new RTCSessionDescription(answer))
        .catch(err => {
          console.error('Error setting remote description:', err);
        });
    } else {
      console.error(`No peer connection found for ${from}`);
    }
  };

  const handleIceCandidate = ({ candidate, from }) => {
    console.log(`Received ICE candidate from ${from}`);

    // Find the appropriate peer connection
    const peerConnection = peerConnectionsRef.current.find(pc => pc.peerId === from)?.connection;

    if (peerConnection) {
      peerConnection
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch(err => {
          console.error('Error adding ICE candidate:', err);
        });
    } else {
      console.error(`No peer connection found for ${from}`);
    }
  };


  const toggleMediaStream = (type, state) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        if (track.kind === type) {
          track.enabled = !state;
        }
      });
    }
  };

  const toggleMic = () => {
    toggleMediaStream('audio', micActive);
    setMicActive((prev) => !prev);
  };

  const toggleCamera = () => {
    toggleMediaStream('video', cameraActive);
    setCameraActive((prev) => !prev);
  };

  const leaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave', roomName);
      socketRef.current.disconnect();
    }

    // Stop all local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach(({ connection }) => {
      connection.ontrack = null;
      connection.onicecandidate = null;
      connection.close();
    });

    peerConnectionsRef.current = [];

    // Navigate back to home
    router.push('/');
  };
  const toggleChat = ()=>{
    setIsChatModalVisible(true)
  }

  const onModalClose = () =>{
    setIsChatModalVisible(false)
  }
  const sendMessage = (message) =>{
    socketChatRef.current.emit("message", message, roomName)
  }
  return (
    <SafeAreaView style={styles.videoRoom}>
      <View style={styles.videoGrid}>
        {participants.map(participant => (
          <View key={participant.id} style={styles.videoBox}>
            {participant.stream ? (
              <RTCView
                streamURL={participant.stream.toURL()}
                style={styles.video}
                objectFit='cover'
                zOrder={participant.id === socketRef.current?.id ? 1 : 0}
              />
            ) : (
              <View style={[styles.video, { backgroundColor: '#222' }]} />
            )}
            <View style={styles.videoLabel}>
              <Text style={{ color: 'white' }}>
                {participant.id === socketRef.current?.id ? 'You' : participant.username}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.controls}>
        <Button
          onPress={toggleMic}
          title={micActive ? 'Mute Mic' : 'UnMute Mic'}
          color="#4285f4"
        />
        <Button
          onPress={toggleCamera}
          title={cameraActive ? 'Stop Camera' : 'Start Camera'}
          color="#4285f4"
        />
        <Button
          onPress={leaveRoom}
          title="Leave Room"
          color="#ea4335"
        />
        <Button
          onPress={toggleChat}
          title='open chat'
          color="#4285f4"
          />
      </View>
      <ChatModal onClose={onModalClose} isVisible={isChatModalVisible} onSendMessage={sendMessage}> 
        <ScrollView className="chat-messages">
          {chat.map((msg, index) => (
            <Text key={index}>{msg.text}</Text>
          ))}
        </ScrollView>
      </ChatModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  videoRoom: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 20,
    height: '100%',
  },
  videoGrid: {
    width: '100%',
    // height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  videoBox: {
    position: 'relative',
    width: '48%', // Approximation for grid-like layout
    height: '100%',
    aspectRatio: 4 / 3,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
    objectFit: 'fill'
  },
  videoLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  chatContainer: {
    width: '100%',
    maxWidth: 600,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  chatMessages: {
    height: 200,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    color: 'black',
  },
  chatInput: {
    flexDirection: 'row',
    gap: 10,
  },
  chatInputField: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  controls: {
    position: 'absolute',
    bottom: 15,
    flexDirection: 'row',
    gap: 15,
  },
  controlBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    backgroundColor: '#4285f4',
    color: 'white',
  },
  leaveBtn: {
    backgroundColor: '#ea4335',
  },
});

// Helper component to display video
const VideoPlayer = ({ stream, style }: { stream: MediaStream | null, style: any }) => {
  if (!stream) return <View style={[style, { backgroundColor: '#222' }]} />;

  return (
    <RTCView
      streamURL={stream.toURL()}
      style={style}
      objectFit='cover'
      zOrder={0}
    />
  );
};

export default Room;
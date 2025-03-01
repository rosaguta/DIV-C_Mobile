import React, { useEffect, useState, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { io } from 'socket.io-client';
// import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, MediaStream, mediaDevices, RTCView } from 'react-native-webrtc';

const ICE_SERVERS = {
  iceServers: [
    {
      urls: 'stun:stun.voipplanet.nl:3478',
    }
  ],
};
const { width } = Dimensions.get('window');

export default function RoomScreen() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [chat, setChat] = useState<string[]>([]);
  const [transport, setTransport] = useState<string>("N/A");
  const [roomName, setRoomName] = useState<string>("phone");
  const socketRef = useRef<any>(null);
  const [micActive, setMicActive] = useState<boolean>(true);
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [input, setInput] = useState<string>("");
  const userStreamRef = useRef<MediaStream | null>(null);
  const peerStreamRef = useRef<MediaStream | null>(null);
  const rtcConnectionRef = useRef<RTCPeerConnection | null>(null);
  const hostRef = useRef<boolean>(false);
  const chatScrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Only initialize socket and join room if roomName exists
    if (!roomName) return;

    // Connect directly to your Express server
    socketRef.current = io('http://192.168.2.161:4000', {
      transports: ['websocket'],
      forceNew: true
    });

    console.log('Connecting to socket server...');

    // First we join a room
    socketRef.current.on('connect', () => {
      console.log('Connected to socket server with ID:', socketRef.current.id);
      socketRef.current.emit('join', roomName);
      socketRef.current.emit('messages', roomName);
    });

    socketRef.current.on('joined', handleRoomJoined);
    // If the room didn't exist, the server would emit the room was 'created'
    socketRef.current.on('created', handleRoomCreated);
    // Whenever the next person joins, the server emits 'ready'
    socketRef.current.on('ready', initiateCall);
    // Whenever the user receives a message
    socketRef.current.on('message', (chats: string[]) => {
      console.log("all chats", chats);
      setChat(chats);
    });

    // Emitted when a peer leaves the room
    socketRef.current.on('leave', onPeerLeave);

    // If the room is full, we show an alert
    socketRef.current.on('full', () => {
      // Handle room full case for React Native
      // You might want to use navigation here instead
      console.log('Room is full');
    });

    // Event called when a remote user initiating the connection
    socketRef.current.on('offer', handleReceivedOffer);
    socketRef.current.on('answer', handleAnswer);
    socketRef.current.on('ice-candidate', handlerNewIceCandidateMsg);

    // clear up after
    return () => {
      if (socketRef.current) {
        console.log('Disconnecting socket...');
        socketRef.current.disconnect();
      }

      // Make sure to clean up media streams
      if (userStreamRef.current) {
        userStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomName]);

  const handleRoomJoined = () => {
    console.log('Room joined, requesting media access...');
    requestMediaAccess();
  };

  const handleRoomCreated = () => {
    console.log('Room created, setting as host and requesting media...');
    hostRef.current = true;
    requestMediaAccess();
  };

  const requestMediaAccess = async () => {
    try {
      // For React Native WebRTC, we use mediaDevices.getUserMedia
      // const stream = await MediaDevices.getUserMedia({
      //   audio: true,
      //   video: {
      //     width: 500,
      //     height: 500,
      //   },
      // });

      console.log('Media access granted, setting up local video');
      // userStreamRef.current = stream;

      // If we joined (not created) the room, emit ready event
      if (!hostRef.current) {
        socketRef.current.emit('ready', roomName);
      }
    } catch (err) {
      console.error('Error accessing media devices:', err);
      // Use React Native Alert instead of browser alert
      console.log('Could not access camera or microphone. Please check permissions.');
    }
  };

  const sendChat = () => {
    console.log("msg send", input);
    socketRef.current.emit('message', input, roomName);
    setInput("");
  };

  const handleInputChange = (text: string) => {
    setInput(text);
  };

  const initiateCall = () => {
    console.log('Ready to initiate call, host status:', hostRef.current);
    if (hostRef.current) {
      rtcConnectionRef.current = createPeerConnection();

      // Only add tracks if we have a stream
      if (userStreamRef.current) {
        userStreamRef.current.getTracks().forEach(track => {
          rtcConnectionRef.current?.addTrack(track, userStreamRef.current!);
        });

        rtcConnectionRef.current
          .createOffer()
          .then((offer) => {
            rtcConnectionRef.current?.setLocalDescription(offer);
            socketRef.current.emit('offer', offer, roomName);
          })
          .catch((error) => {
            console.error('Error creating offer:', error);
          });
      } else {
        console.error('No local stream available when initiating call');
      }
    }
  };

  const onPeerLeave = () => {
    console.log('Peer left the room');
    // This person is now the creator because they are the only person in the room.
    hostRef.current = true;
    
    if (peerStreamRef.current) {
      peerStreamRef.current.getTracks().forEach((track) => track.stop());
      peerStreamRef.current = null;
    }

    // Safely closes the existing connection established with the peer who left.
    if (rtcConnectionRef.current) {
      rtcConnectionRef.current.ontrack = null;
      rtcConnectionRef.current.onicecandidate = null;
      rtcConnectionRef.current.close();
      rtcConnectionRef.current = null;
    }
  };

  const createPeerConnection = () => {
    console.log('Creating peer connection');
    // We create a RTC Peer Connection
    const connection = new RTCPeerConnection(ICE_SERVERS);

    // We implement our onicecandidate method for when we received a ICE candidate from the STUN server
    connection.onicecandidate = handleICECandidateEvent;

    // We implement our onTrack method for when we receive tracks
    connection.ontrack = handleTrackEvent;
    return connection;
  };

  const handleReceivedOffer = (offer: RTCSessionDescriptionInit) => {
    console.log('Received offer, creating answer');
    if (!hostRef.current && userStreamRef.current) {
      rtcConnectionRef.current = createPeerConnection();

      userStreamRef.current.getTracks().forEach(track => {
        rtcConnectionRef.current?.addTrack(track, userStreamRef.current!);
      });

      rtcConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));

      rtcConnectionRef.current
        .createAnswer()
        .then((answer) => {
          rtcConnectionRef.current?.setLocalDescription(answer);
          socketRef.current.emit('answer', answer, roomName);
        })
        .catch((error) => {
          console.error('Error creating answer:', error);
        });
    }
  };

  const handleAnswer = (answer: RTCSessionDescriptionInit) => {
    console.log('Received answer from peer');
    rtcConnectionRef.current
      ?.setRemoteDescription(new RTCSessionDescription(answer))
      .catch((err) => console.error('Error setting remote description:', err));
  };

  const handleICECandidateEvent = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      console.log('Generated ICE candidate');
      socketRef.current.emit('ice-candidate', event.candidate, roomName);
    }
  };

  const handlerNewIceCandidateMsg = (incoming: RTCIceCandidateInit) => {
    console.log('Received ICE candidate');
    // We cast the incoming candidate to RTCIceCandidate
    const candidate = new RTCIceCandidate(incoming);
    rtcConnectionRef.current
      ?.addIceCandidate(candidate)
      .catch((e) => console.error('Error adding ICE candidate:', e));
  };

  const handleTrackEvent = (event: RTCTrackEvent) => {
    console.log('Received tracks from peer');
    // Set the remote stream reference
    peerStreamRef.current = event.streams[0];
  };

  const toggleMediaStream = (type: string, state: boolean) => {
    if (userStreamRef.current) {
      userStreamRef.current.getTracks().forEach((track) => {
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
      socketRef.current.emit('leave', roomName); // Let's the server know that user has left the room.
    }

    if (userStreamRef.current) {
      userStreamRef.current.getTracks().forEach((track) => track.stop());
      userStreamRef.current = null;
    }

    if (peerStreamRef.current) {
      peerStreamRef.current.getTracks().forEach((track) => track.stop());
      peerStreamRef.current = null;
    }

    // Safely closes the existing connection
    if (rtcConnectionRef.current) {
      rtcConnectionRef.current.ontrack = null;
      rtcConnectionRef.current.onicecandidate = null;
      rtcConnectionRef.current.close();
      rtcConnectionRef.current = null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Video Container */}
      <View style={styles.videoContainer}>
        <View style={styles.videoBox}>
          {/* {userStreamRef.current && (
            <RTCView 
              streamURL={userStreamRef.current.toURL()} 
              style={styles.video} 
              objectFit="cover" 
              mirror={true} 
            />
          )} */}
          <View style={styles.videoLabel}>
            <Text style={styles.videoLabelText}>You</Text>
          </View>
        </View>
        <View style={styles.videoBox}>
          {/* {peerStreamRef.current && (
            <RTCView 
              streamURL={peerStreamRef.current.toURL()} 
              style={styles.video} 
              objectFit="cover" 
            />
          )} */}
          <View style={styles.videoLabel}>
            <Text style={styles.videoLabelText}>Peer</Text>
          </View>
        </View>
      </View>
      
      {/* Chat Section */}
      <View style={styles.chatSection}>
        <Text style={styles.sectionHeader}>Chat</Text>
        
        {/* Chat Messages */}
        <View style={styles.chatContainer}>
          <ScrollView 
            ref={chatScrollViewRef}
            style={styles.chatScrollView}
            contentContainerStyle={styles.chatContent}
          >
            {chat.length === 0 ? (
              <Text style={styles.noMessagesText}>No messages yet</Text>
            ) : (
              chat.map((msg, index) => (
                <View key={index} style={styles.chatMessageContainer}>
                  <Text style={styles.chatMessage}>{msg}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
        
        {/* Chat Input */}
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input}
            value={input}
            onChangeText={handleInputChange}
            placeholder="Type your message"
            placeholderTextColor="#999"
          />
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={sendChat}
            disabled={!input.trim()}
          >
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={toggleMic} style={[styles.controlBtn, micActive ? {} : styles.inactiveBtn]}>
          <Text style={styles.buttonText}>{micActive ? 'Mute Mic' : 'Unmute Mic'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={leaveRoom} style={[styles.controlBtn, styles.leaveBtn]}>
          <Text style={styles.buttonText}>Leave Room</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={toggleCamera} style={[styles.controlBtn, cameraActive ? {} : styles.inactiveBtn]}>
          <Text style={styles.buttonText}>{cameraActive ? 'Stop Camera' : 'Start Camera'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    padding: 10,
  },
  videoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 10,
  },
  videoBox: {
    position: 'relative',
    width: width > 600 ? 300 : width * 0.45,
    height: width > 600 ? 220 : width * 0.45 * 0.75,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    margin: 5,
    backgroundColor: '#333',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
  },
  videoLabel: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  videoLabelText: {
    color: 'white',
    fontSize: 12,
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  chatSection: {
    flex: 1,
    marginTop: 10,
  },
  chatContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    backgroundColor: '#333',
    marginBottom: 10,
  },
  chatScrollView: {
    flex: 1,
  },
  chatContent: {
    padding: 10,
    flexGrow: 1,
  },
  chatMessageContainer: {
    backgroundColor: '#444',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  chatMessage: {
    color: '#fff',
    fontSize: 14,
  },
  noMessagesText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 10,
    color: '#000',
    marginRight: 5,
  },
  sendButton: {
    backgroundColor: '#4285f4',
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  controlBtn: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#4285f4',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  inactiveBtn: {
    backgroundColor: '#666',
  },
  leaveBtn: {
    backgroundColor: '#ea4335',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
});
import React, { useEffect, useState, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { io } from 'socket.io-client';
import { useRouter } from 'expo-router';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, MediaStream, mediaDevices, RTCView, registerGlobals } from 'react-native-webrtc';
import { MessageCircle, Mic, MicOff, Camera, CameraOff, Phone } from 'lucide-react-native';
registerGlobals()
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.solcon.nl:3478' }

  ],
  iceCandidatePoolSize: 10,
};
const { width } = Dimensions.get('window');

type Participant = {
  id: String, 
  name: String, 
  stream: MediaStream, 
  isMuted: Boolean, 
  isVideoOff: Boolean 
}


export default function RoomScreen() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [chat, setChat] = useState<string[]>([]);
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
  const router = useRouter()
  const [showDeviceSettings, setShowDeviceSettings] = useState<boolean>(false)
  const participantsRef = useRef<Participant[]>([])
  

  useEffect(() => {
    // Only initialize socket and join room if roomName exists
    if (!roomName) return;

    // Connect directly to your Express server
    socketRef.current = io('http://192.168.2.191:4000', {
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
      socketRef.current.off('connect');
      socketRef.current.off('joined');
      socketRef.current.off('created');
      socketRef.current.off('ready');
      socketRef.current.off('message');
    };

  }, [isConnected]);



  useEffect(() => {
    if (peerStreamRef.current) {
      console.log('Peer stream changed, forcing re-render');
      setIsConnected(prev => !prev);
    }
  }, [peerStreamRef.current]);


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
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 500,
          height: 500,
        },
      });

      console.log('Media access granted, setting up local video');
      userStreamRef.current = stream;
      const participant: Participant = {id:"1",name:"Rose",stream:stream,isMuted:false,isVideoOff:false}

      participantsRef.current.push(participant)
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
      if (participantsRef.current[0].stream) {
        participants[0].stream.getTracks().forEach(track => {
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
    const connection = new RTCPeerConnection(ICE_SERVERS);

    connection.onicecandidate = handleICECandidateEvent;
    connection.ontrack = handleTrackEvent;

    // Add these connection state monitors
    connection.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', connection.iceConnectionState);
    };

    connection.onconnectionstatechange = () => {
      console.log('Connection State:', connection.connectionState);
    };

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
    console.log('Received tracks from peer', event.streams);
    console.log('Track details:', {
      kind: event.track.kind,
      enabled: event.track.enabled,
      readyState: event.track.readyState,
      id: event.track.id
    });

    if (event.streams && event.streams[0]) {
      console.log('Setting peer stream with track type:', event.track.kind);

      // Force a short delay before setting the stream (helps with rendering issues)
      setTimeout(() => {
        peerStreamRef.current = event.streams[0];
        // Force re-render
        setIsConnected(prev => !prev);
      }, 500);
    } else {
      console.error('Received track event with no streams');
    }
  };
  const toggleMediaStream = (type: any, state: any) => {
    if (userStreamRef.current) {
      userStreamRef.current.getTracks().forEach((track) => {
        if (track.kind === type) {
          track.enabled = !state;
        }
      });
    }
    // if (peerStreamRef.current) {
    //   peerStreamRef.current.getTracks().forEach((track) => {
    //     if (track.kind === type) {
    //       track.enabled = !state;
    //     }
    //   });
    // }
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
    router.push("/")
  };



  const renderParticipantCard = (participant:MediaStream) => {
    return (
      <View key={participant.id} style={styles.participantCard}>
        <View style={styles.participantVideoContainer}>
          {participant.stream && participant.stream !== null && !participant.isVideoOff ? (
            <RTCView
              streamURL={participant.stream.toURL()}
              style={styles.participantVideo}
              objectFit="cover"
              mirror={participant.id === 'local'}
            />
          ) : (
            <View style={styles.noVideoPlaceholder}>
              <Text style={styles.placeholderText}>{participant.name[0]}</Text>
            </View>
          )}
          
          {/* Mute/Video Status Indicators */}
          <View style={styles.statusIcons}>
            {participant.isMuted && (
              <Mic color="white" size={16} style={styles.muteIcon} />
            )}
            {participant.isVideoOff && (
              <CameraOff color="white" size={16} style={styles.videoOffIcon} />
            )}
          </View>
        </View>
        <Text style={styles.participantName}>{participant.name}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Voice Call Header */}
      <View style={styles.header}>
        <Text style={styles.channelName}>Voice Channel</Text>
        <Text style={styles.connectedStatus}>Connected</Text>
      </View>

      {/* Participants Grid */}
      <View style={styles.participantsGrid}>
        {participants.map(renderParticipantCard)}
      </View>

      {/* Chat Icon */}
      <TouchableOpacity 
        style={styles.chatButton} 
        onPress={() => {/* Toggle chat view */}}
      >
        <MessageCircle color="white" size={24} />
      </TouchableOpacity>

      {/* Call Controls */}
      <View style={styles.callControls}>
        <TouchableOpacity 
          style={[
            styles.controlButton, 
            micActive ? styles.activeControl : styles.inactiveControl
          ]} 
          onPress={toggleMic}
        >
          {micActive ? <Mic color="white" size={24} /> : <MicOff color="white" size={24} />}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.controlButton, 
            cameraActive ? styles.activeControl : styles.inactiveControl
          ]} 
          onPress={toggleCamera}
        >
          {cameraActive ? <Camera color="white" size={24} /> : <CameraOff color="white" size={24} />}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.endCallButton} 
          onPress={leaveRoom}
        >
          <Phone color="white" size={24} style={{transform: [{rotate: '135deg'}]}} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#36393f', // Discord dark theme background
  },
  header: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#2f3136', // Slightly lighter dark background
  },
  channelName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  connectedStatus: {
    color: '#43b581', // Discord online green
    fontSize: 14,
    marginTop: 5,
  },
  participantsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  participantCard: {
    width: width * 0.45,
    margin: 5,
    alignItems: 'center',
  },
  participantVideoContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#2f3136',
  },
  participantVideo: {
    width: '100%',
    height: '100%',
  },
  noVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#40444b',
  },
  placeholderText: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  },
  participantName: {
    color: 'white',
    marginTop: 10,
    fontSize: 14,
  },
  statusIcons: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
  },
  muteIcon: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 2,
    marginRight: 5,
  },
  videoOffIcon: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 2,
  },
  chatButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#7289da', // Discord blurple
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#2f3136',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  activeControl: {
    backgroundColor: '#7289da', // Discord blurple
  },
  inactiveControl: {
    backgroundColor: '#ed4245', // Discord red
  },
  endCallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ed4245', // Discord red
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
});


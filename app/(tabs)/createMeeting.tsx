import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, } from 'react-native';
import { useRouter } from 'expo-router';
import { Modal, ModalContent, ModalTitle } from 'react-native-modals';
import * as Clipboard from 'expo-clipboard';
type MeetingDetails = {
  meetingId: string,
  name: string,
  inviteCode: string,
  participants: Array<string> | null
  chat: [] | null,

}
const MICROSOFT_USERS = [
  { name: "Benjamin Elbersen", email: "belbersen@digitalindividuals.com" },
  { name: "Dirk Nuijs", email: "dnuijs@digitalindividuals.com" },
  { name: "Rose van Leeuwen", email: "rvleeuwen@digitalindividuals.com" },
  { name: "Liv Knapen", email: "lknapen@digitalindividuals.com" },
  { name: "Stijn Charmant", email: "scharmant@digitalindividuals.com" },
  { name: "Daan Spronk", email: "dspronk@digitalindividuals.com" },
];

export default function CreateMeetingScreen() {
  const [title, setTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [invitees, setInvitees] = useState([]);
  const [ShowRoomCreatedModal, setShowRoomCreatedModal] = useState<boolean>(false)
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails | undefined>()
  const [copiedText, setCopiedText] = useState('');
  const router = useRouter()

  const filteredUsers = MICROSOFT_USERS.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addInvitee = (user) => {
    if (!invitees.find(i => i.email === user.email)) {
      setInvitees([...invitees, user]);
    }
  };

  const CreateMeeting = async () => {
    let createdMeeting;
    const jsonBody = JSON.stringify({
      name: title,
      participants: invitees.map(({ email }) => (email))
    })
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    try {
      const response = await fetch('http://192.168.2.7:9090/api/meetings', {
        method: "POST",
        body: jsonBody,
        headers: myHeaders
      })
      createdMeeting = await response.json()
      if (createdMeeting) {
        setMeetingDetails(createdMeeting);
        setShowRoomCreatedModal(true);
      } else {
        alert("Failed to create meeting. Please try again.");
      }
    } catch (exception) {
      console.log("something just happened:", exception);
      alert("Error creating meeting: " + exception.message);
    }
  }

  const JoinMeetingNow = () => {
    setShowRoomCreatedModal(false);
      if (meetingDetails && meetingDetails.meetingId && meetingDetails.name) {
        try {
          router.push({
            pathname: "/(tabs)/meeting",
            params: { meetingId: meetingDetails.meetingId, meetingName: meetingDetails.name }
          });
        } catch (exception) {
          console.error("Navigation error:", exception);
          alert("Error navigating: " + exception.message);
        }
      } else {
        console.log("Meeting details missing required properties");
        if (!meetingDetails) console.log("meetingDetails is undefined");
        else {
          console.log("Available properties:", Object.keys(meetingDetails));
          console.log("id present:", Boolean(meetingDetails.meetingId));
          console.log("name present:", Boolean(meetingDetails.name));
        }
        alert("Meeting details are not available");
      }
  };

  const copyToClipboard = async () => {
    if (meetingDetails && meetingDetails.inviteCode) {
      await Clipboard.setStringAsync(meetingDetails.inviteCode);
      alert("Invite code copied to clipboard!");
    } else {
      alert("No invite code available to copy");
    }
  };


  return (
    <View>
      <ScrollView contentContainerStyle={styles.container}>
        {/* <Text style={styles.header}>Create Meeting</Text> */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter meeting title"
          value={title}
          onChangeText={setTitle}
        />
        <Text style={styles.label}>Invite Participants</Text>
        <TextInput
          style={styles.input}
          placeholder="Search by name or email"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <View style={styles.listContainer}>
          {filteredUsers.map(user => (
            <View key={user.email} style={styles.userItem}>
              <Text style={{ flex: 1 }}>{user.name} ({user.email})</Text>
              <Button title="Add" onPress={() => addInvitee(user)} />
            </View>
          ))}
        </View>
        {invitees.length > 0 && (
          <View style={styles.invitedSection}>
            <Text style={styles.label}>Invited Participants</Text>
            {invitees.map(inv => (
              <Text key={inv.email}>{inv.name} ({inv.email})</Text>
            ))}
          </View>
        )}
        <Button title="Create Meeting" onPress={() => CreateMeeting()} />
      </ScrollView>
      <Modal
        visible={ShowRoomCreatedModal}
        onTouchOutside={() => setShowRoomCreatedModal(false)}
        modalTitle={<ModalTitle title='Meeting Created Successfully' />}
      >
        <ModalContent style={styles.modalContent}>
          <Text style={styles.modalHeader}>Meeting Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Meeting name:</Text>
            <Text style={styles.detailValue}>{meetingDetails?.name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invite code:</Text>
            <Text style={styles.detailValue}>{meetingDetails?.inviteCode}</Text>
          </View>

          <View style={styles.participantsSection}>
            <Text style={styles.detailLabel}>Participants:</Text>
            <View style={styles.participantsList}>
              {meetingDetails?.participants?.map((p, index) => (
                <Text key={index} style={styles.participantItem}>
                  • {p.split('@')[0]}
                </Text>
              ))}
            </View>
          </View>

          <Text style={styles.actionHeader}>What would you like to do?</Text>
          <View style={styles.buttonContainer}>
            <View style={styles.actionButton}>
              <Button
                title="Join Meeting Now"
                onPress={() => JoinMeetingNow()}
              />
            </View>
            <View style={styles.actionButton}>
              <Button
                title="Copy Invite Code"
                onPress={() => copyToClipboard()}
              />
            </View>
          </View>
        </ModalContent>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 50,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20
  },
  label: {
    fontSize: 18,
    marginBottom: 6
  },
  input: {
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15
  },
  listContainer: {
    marginBottom: 20
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  invitedSection: {
    marginBottom: 20
  },
  modalFlexContainer: {
    marginVertical: 10,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modalContent: {
    padding: 10,
    minWidth: 300,
    maxWidth: '95%'
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center'
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  detailLabel: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#555'
  },
  detailValue: {
    fontSize: 15,
    maxWidth: '60%',
    textAlign: 'right'
  },
  participantsSection: {
    marginTop: 5,
    marginBottom: 15
  },
  participantsList: {
    marginTop: 5,
    paddingLeft: 5
  },
  participantItem: {
    fontSize: 14,
    marginBottom: 3
  },
  actionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
    color: '#333'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5
  }

});

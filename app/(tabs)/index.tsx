import { Text, View, StyleSheet, Image, TextInput, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';


type MeetingDetails = {
  meetingId: string,
  name: string,
  inviteCode: string,
  participants: Array<string> | null
  chat: [] | null,

}

export default function Index() {
  const router = useRouter();
  const currentUserMail = "rvleeuwen@digitalindividuals.com"
  const [inviteTextField, setInviteTextField] = useState<String>('')

  const joinMeeting = async () => {
    const jsonBody = JSON.stringify({
      email: currentUserMail,
      inviteCode: inviteTextField
    });
  
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
  
    try {
      const response = await fetch('http://192.168.2.7:9090/api/meetings/join', {
        method: "POST",
        body: jsonBody,
        headers: myHeaders
      });
  
      if (!response.ok) {
        if (response.status === 400) {
          console.error("Forbidden: You are not allowed to join this meeting.");
        } else {
          console.error(`Error: Received status code ${response.status}`);
        }
        return;
      }
  
      const joined: MeetingDetails = await response.json();
  
      if (joined) {
        router.push({
          pathname: "/(tabs)/meeting",
          params: {
            meetingId: joined.meetingId,
            meetingName: joined.name
          }
        });
      }
  
    } catch (exception) {
      console.error("Network error or unexpected exception:", exception);
    }
  };




  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        <View style={styles.containerCenter}>
          <Image style={styles.image} source={require('../../assets/images/div.png')} />
        </View>
        <View style={styles.flexContainer}>
          <View style={styles.flexItem}>
            <Text style={styles.labelText}>
              Please enter the invite ID that you may have received by mail or in person
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder='Enter invite Code'
              placeholderTextColor="#999"
              onChangeText={setInviteTextField}
            />
              <View style={styles.joinButton}>
                <Button title='Join' onPress={() => joinMeeting()} />
              </View>
          </View>
          <View style={styles.flexItem}>
            <Text style={styles.labelText}>Or create the meeting yourself</Text>
            <Button onPress={() => router.push('/(tabs)/createMeeting')} title='Create Meeting' color="#3B82F6" />
          </View>
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 700,
  },
  image: {
    resizeMode: 'contain',
    width: 200,
    height: 150,
    marginBottom: 20,
  },
  containerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  flexItem: {
    flex: 1,
    minWidth: 300,
    backgroundColor: "#fff",
    padding: 20,
    margin: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    width: '100%',
    marginVertical: 10,
    padding: 12,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#000',
  },
  labelText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  joinButton: {
    width: 100,
    // alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  }
});

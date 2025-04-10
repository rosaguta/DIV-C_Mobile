import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet } from 'react-native';

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

  const filteredUsers = MICROSOFT_USERS.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addInvitee = (user) => {
    if (!invitees.find(i => i.email === user.email)) {
      setInvitees([...invitees, user]);
    }
  };

  const CreateMeeting = async () =>{
    let createdRoom;
    const jsonBody = JSON.stringify({
        name: title,
        participants: invitees.map(({email})=>(email))
    })
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    try{
        const response = await fetch('http://145.93.105.237:9090/api/meetings',{
            method: "POST",
            body: jsonBody,
            headers: myHeaders
        })
        createdRoom = await response.text()
    }catch(exception){
        console.log("something just happened", exception)
    }
    console.log()
    alert(createdRoom)

  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Create Meeting</Text>
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
  }
});

import { Text, View, StyleSheet, Image, TextInput, Button } from 'react-native';

export default function Index() {
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
              placeholder='Enter invite ID'
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.flexItem}>
            <Text style={styles.labelText}>Or create the meeting yourself</Text>
            <Button title='Create Meeting' color="#3B82F6" />
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
    marginTop: 10,
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
});

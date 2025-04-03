import { Text, View, StyleSheet, Image, TextInput } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <View style={styles.contentArea}>
        <View style={styles.containerCenter}>
          <Image style={styles.image} source={require('../../assets/images/div.png')} />
        </View>
        <Text style={styles.text}>Please enter the invite id that you may have recieved per mail or via person</Text>
        <View style={styles.containerCenter}>
          <TextInput style={styles.textInput} placeholder='id of invite' color></TextInput>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  contentArea: {
    margin: 5
  },
  text: {
    // color: '#fff',
  },
  heading: {
    fontSize: 24,
  },
  button: {
    fontSize: 20,
    textDecorationLine: 'underline',
  },
  image: {
    objectFit: 'contain',
    width: '200',
    height: '150',
  },
  containerCenter: {
    alignItems: 'center'
  },
  textInput:{
    backgroundColor: "#cccccc",
    color: "#000000"
  }
});

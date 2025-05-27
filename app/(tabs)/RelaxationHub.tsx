import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Image,
} from "react-native";

const images = {
  breathing: require("../../assets/images/BreathingExercise.jpg"),
  meditation: require("../../assets/images/meditation.jpg"),
  music: require("../../assets/images/playCalmingMusic.jpg"),
  bodyScan: require("../../assets/images/bodyScans.jpg"),
  visualization: require("../../assets/images/visualizations.jpg"),
};

const RelaxationHub: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState("");

  const openModal = (exercise: string) => {
    setSelectedExercise(exercise);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Relaxation Hub</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => openModal("Breathing Exercise")}
      >
        <Text style={styles.cardText}>Breathing Exercise</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => openModal("Meditation Guide")}
      >
        <Text style={styles.cardText}>Meditation Guide</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => openModal("Play Calming Music")}
      >
        <Text style={styles.cardText}>Play Calming Music</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.card}
        onPress={() => openModal("Body Scan Relaxation")}
      >
        <Text style={styles.cardText}>Body Scan Relaxation</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.card}
        onPress={() => openModal("Visualization Exercise")}
      >
        <Text style={styles.cardText}>Visualization Exercise</Text>
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedExercise}</Text>

            {selectedExercise === "Breathing Exercise" && (
              <>
                <Image
                  source={images.breathing}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                <Text style={styles.modalText}>
                  Try the 4-7-8 technique: Inhale for 4 seconds, hold for 7
                  seconds, and exhale slowly for 8 seconds. Let your breath
                  guide you into a state of deep relaxation. With each cycle,
                  feel your body unwind and your mind grow quieter.
                </Text>
              </>
            )}

            {selectedExercise === "Meditation Guide" && (
              <>
                <Image
                  source={images.meditation}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                <Text style={styles.modalText}>
                  Close your eyes, focus on your breath, and try a guided
                  meditation for 5–10 minutes. Let each inhale bring in calm,
                  and each exhale release tension. Allow your thoughts to settle
                  as you reconnect with the stillness within.
                </Text>
              </>
            )}

            {selectedExercise === "Play Calming Music" && (
              <>
                <Image
                  source={images.music}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                <Text style={styles.modalText}>
                  Listen to soothing instrumental or nature sounds to relax your
                  mind. Let the gentle melodies calm your thoughts and ease your
                  stress. Feel the rhythm of nature restore your inner peace and
                  bring you into the present moment.
                </Text>
              </>
            )}

            {selectedExercise === "Body Scan Relaxation" && (
              <>
                <Image
                  source={images.bodyScan}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                <Text style={styles.modalText}>
                  Lie down or sit comfortably. Close your eyes and bring your
                  attention to different parts of your body, starting from your
                  toes and moving upward. Notice any tension and gently let it
                  go. This body scan helps you relax deeply and reconnect with
                  your body.
                </Text>
              </>
            )}

            {selectedExercise === "Visualization Exercise" && (
              <>
                <Image
                  source={images.visualization}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                <Text style={styles.modalText}>
                  Close your eyes and imagine a peaceful place—like a quiet
                  beach, a forest trail, or a calm mountain view. Picture the
                  colors, sounds, and scents around you. Let your mind rest in
                  this safe space as stress fades away.
                </Text>
              </>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  card: {
    width: "90%",
    padding: 20,
    borderRadius: 10,
    backgroundColor: "#4caf50",
    marginVertical: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  cardText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalImage: {
    width: 200,
    height: 200,
    marginVertical: 15,
    borderRadius: 10,
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: "#ff5252",
    padding: 10,
    borderRadius: 5,
    width: "100%",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default RelaxationHub;

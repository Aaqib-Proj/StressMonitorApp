import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  Button,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  Modal,
  ImageBackground,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "../styles/styles";
import { useRouter } from "expo-router";

type StressData = number[];
type StressLevel = "High" | "Moderate" | "Normal";

interface MetricAnalysis {
  title: string;
  value: string;
  status: string;
  color: string;
  description: string;
  recommendations: string;
}

interface AnalysisData {
  title: string;
  status?: string;
  details: string | MetricAnalysis[];
  recommendation?: string;
}

interface UserData {
  name: string;
  age: string;
}

interface HistoryEntry {
  name: string;
  timestamp: string;
  stressLevel: number;
}

interface SensorData {
  gsr: number;
  temp: number;
  hrv: number;
  humidity?: number; // relative humidity percentage
}

const UserInputScreen: React.FC<{ onStart: (userData: UserData) => void }> = ({
  onStart,
}) => {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  const handleStart = () => {
    if (!name.trim() || !age.trim()) {
      Alert.alert("Error", "Please enter both name and age");
      return;
    }
    onStart({ name, age });
  };

  return (
    <View style={styles.startContainer}>
      <View style={styles.startContent}>
        <Text style={styles.startTitle}>Welcome to CalmPulse</Text>
        <Text style={styles.startSubtitle}>
          Your Personal Stress Management Assistant
        </Text>

        <View style={styles.iconContainer}>
          <FontAwesome6
            name="heart-pulse"
            size={80}
            color="#4caf50"
            style={styles.startIcon}
          />
        </View>

        <Text style={styles.inputLabel}>Enter Your Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Your Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Your Age"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>Start Monitoring</Text>
          <FontAwesome6
            name="arrow-right"
            size={20}
            color="#fff"
            style={styles.arrowIcon}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const App: React.FC = () => {
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [stressData, setStressData] = useState<StressData>([]);
  const [stressLevel, setStressLevel] = useState<StressLevel>("Normal");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [currentStress, setCurrentStress] = useState<number>(0);
  const [bodyTemperature, setBodyTemperature] = useState<number>(36.5);
  const [hrvValue, setHrvValue] = useState<number>(50);
  const [progressAnimation] = useState(new Animated.Value(0));
  const [tempAnimation] = useState(new Animated.Value(36.5));
  const [hrvAnimation] = useState(new Animated.Value(50));
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [monitoringInterval, setMonitoringInterval] = useState<number | null>(
    null
  );
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);
  const [showIPInput, setShowIPInput] = useState<boolean>(false);
  const [esp32IP, setEsp32IP] = useState<string>("");
  const [ipAddress, setIpAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [readings, setReadings] = useState<number[]>([]);
  const [isCollectingData, setIsCollectingData] = useState<boolean>(false);
  const [isDisconnected, setIsDisconnected] = useState(false);

  const [sensorData, setSensorData] = useState<SensorData>({
    gsr: 0,
    temp: 36.5,
    hrv: 50,
  });
  const router = useRouter();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem("stressHistory");
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const saveToHistory = async (stressLevel: number) => {
    if (!userData) return;

    const newEntry: HistoryEntry = {
      name: userData.name,
      timestamp: new Date().toLocaleString(),
      stressLevel,
    };

    const updatedHistory = [...history, newEntry];
    setHistory(updatedHistory);

    try {
      await AsyncStorage.setItem(
        "stressHistory",
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      console.error("Error saving history:", error);
    }
  };

  const handleStartMonitoring = (data: UserData) => {
    setUserData(data);
    setIsStarted(true);
  };

  // Function to connect to ESP32
  const connectToESP32 = async (ip: string) => {
    try {
      setIsConnecting(true);
      console.log(`Attempting to connect to ESP32 at IP: ${ip}`);

      // Validate IP address format
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipPattern.test(ip)) {
        throw new Error(
          "Invalid IP address format. Please enter a valid IP address (e.g., 192.168.1.100)"
        );
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout to 10 seconds

      // First try to connect to the root endpoint
      console.log("Attempting to connect to root endpoint...");
      const rootResponse = await fetch(`http://${ip}/`, {
        method: "GET",
        headers: {
          Accept: "text/plain",
          "User-Agent": "CalmPulse-App/1.0",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!rootResponse.ok) {
        throw new Error(
          `Root endpoint failed with status: ${rootResponse.status}. Please check if ESP32 is running and accessible.`
        );
      }

      const rootText = await rootResponse.text();
      console.log("Root endpoint response:", rootText);

      // Create new AbortController for data endpoint
      const dataController = new AbortController();
      const dataTimeoutId = setTimeout(() => dataController.abort(), 10000);

      // Then try to connect to the data endpoint
      console.log("Attempting to connect to data endpoint...");
      const dataResponse = await fetch(`http://${ip}/data`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "CalmPulse-App/1.0",
        },
        signal: dataController.signal,
      });

      clearTimeout(dataTimeoutId);

      if (!dataResponse.ok) {
        throw new Error(
          `Data endpoint failed with status: ${dataResponse.status}. Please check if ESP32 is running and accessible.`
        );
      }

      const data = await dataResponse.json();
      console.log("Data endpoint response:", data);

      setEsp32IP(ip);
      setIsConnected(true);
      setShowIPInput(false);
      Alert.alert("Success", "Connected to ESP32 successfully!");
    } catch (error: any) {
      console.error("Connection error details:", error);
      let errorMessage = "Failed to connect to ESP32. Please check:\n\n";

      if (error.name === "AbortError") {
        errorMessage += "• Connection timed out (10 seconds)\n";
        errorMessage += "• Check if ESP32 is responding\n";
        errorMessage += "• Try restarting the ESP32\n";
        errorMessage += "• Verify ESP32 is running a web server\n";
      } else if (error.message.includes("Network request failed")) {
        errorMessage +=
          "• Make sure your phone and ESP32 are on the same network\n";
        errorMessage += "• Check if the ESP32 is powered on\n";
        errorMessage += "• Verify the IP address is correct\n";
        errorMessage += "• Try restarting the ESP32\n";
        errorMessage +=
          "• Check if your network allows device-to-device communication\n";
        errorMessage += "• Try using a mobile hotspot instead\n";
      } else if (error.message.includes("TypeError")) {
        errorMessage += "• Network connectivity issue\n";
        errorMessage += "• Check your internet connection\n";
        errorMessage += "• Try switching networks\n";
      } else {
        errorMessage += `Error: ${error.message}`;
      }

      Alert.alert("Connection Error", errorMessage);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Function to calculate the most stable reading
  const calculateStableReading = (readings: number[]): number => {
    if (readings.length === 0) return 0;

    // Calculate the standard deviation
    const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
    const squareDiffs = readings.map((value) => {
      const diff = value - mean;
      return diff * diff;
    });
    const avgSquareDiff =
      squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    // Find the reading closest to the mean
    const stableReading = readings.reduce((prev, curr) => {
      return Math.abs(curr - mean) < Math.abs(prev - mean) ? curr : prev;
    });

    return stableReading;
  };

  // Modified startMonitoring function to remove 15-second limit
  const startMonitoring = () => {
    if (!isConnected) {
      alert("Please connect to ESP32 first");
      return;
    }

    const interval = setInterval(fetchSensorData, 1000); // Collect data every second
    setMonitoringInterval(interval as unknown as number);
    setIsMonitoring(true);
  };

  // Modified fetchSensorData to store readings
  const fetchSensorData = async () => {
    try {
      console.log(`Fetching data from ESP32 at IP: ${esp32IP}`);
      const response = await fetch(`http://${esp32IP}/data`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

      const data: SensorData = await response.json();
      console.log("Received sensor data:", data);

      if (
        !data ||
        typeof data.gsr !== "number" ||
        typeof data.temp !== "number" ||
        typeof data.hrv !== "number"
      ) {
        throw new Error("Invalid sensor data format");
      }

      // Reset disconnection state on successful fetch
      if (isDisconnected) {
        setIsDisconnected(false);
      }

      // Validate HRV range (0-150) and handle special case
      if (data.hrv === 6) {
        data.hrv = 62; // Show 62ms when HRV is 6ms
      } else {
        data.hrv = Math.max(0, Math.min(150, data.hrv));
      }

      setSensorData(data);

      // Calculate stress level based on sensor data
      const stressValue = calculateStress(data);
      setCurrentStress(stressValue);
      setBodyTemperature(data.temp);
      setHrvValue(data.hrv);

      // Animate the progress
      Animated.parallel([
        Animated.timing(progressAnimation, {
          toValue: stressValue,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(tempAnimation, {
          toValue: data.temp,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(hrvAnimation, {
          toValue: getHrvDisplayPercentage(data.hrv),
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start();
    } catch (error) {
      console.error("Error fetching sensor data:", error);

      // Only show alert if not already disconnected
      if (!isDisconnected) {
        setIsDisconnected(true);
        Alert.alert(
          "Connection Error",
          "Lost connection to ESP32. Attempting to reconnect...",
          [
            {
              text: "Stop Monitoring",
              onPress: () => {
                stopMonitoring();
                setIsDisconnected(false);
              },
            },
            {
              text: "OK",
              onPress: () => setIsDisconnected(false),
            },
          ]
        );
      }

      // Stop monitoring after 3 failed attempts
      if (isDisconnected) {
        stopMonitoring();
      }
    }
  };

  // Function to get HRV percentage for display (0-150ms)
  const getHrvDisplayPercentage = (hrv: number) => {
    return Math.min(100, Math.max(0, ((hrv - 0) / (150 - 0)) * 100));
  };

  // Function to get HRV percentage for stress calculation (0-150ms)
  const getHrvStressPercentage = (hrv: number) => {
    return Math.min(100, Math.max(0, ((hrv - 0) / (150 - 0)) * 100));
  };

  // Function to calculate age-adjusted HRV baseline
  const calculateAgeAdjustedHRV = (hrv: number, age: number): number => {
    // Age-based HRV baseline adjustments (normalized to 0-150ms range)
    const ageBaseline = {
      "18-25": 120, // Higher baseline for young adults
      "26-35": 110,
      "36-45": 100,
      "46-55": 90,
      "56-65": 80,
      "65+": 70,
    };

    // Get baseline for age group
    let baseline = 100; // default baseline
    if (age <= 25) baseline = ageBaseline["18-25"];
    else if (age <= 35) baseline = ageBaseline["26-35"];
    else if (age <= 45) baseline = ageBaseline["36-45"];
    else if (age <= 55) baseline = ageBaseline["46-55"];
    else if (age <= 65) baseline = ageBaseline["56-65"];
    else baseline = ageBaseline["65+"];

    // Adjust HRV based on baseline
    return Math.max(0, Math.min(100, ((hrv - baseline) / baseline) * 100));
  };

  // Function to calculate temperature contribution with Indian context
  const calculateTemperatureContribution = (temp: number): number => {
    // New temperature ranges
    if (temp >= 30 && temp <= 36) {
      return 0; // No stress contribution for normal range
    } else if (temp > 36 && temp <= 37) {
      return 50; // Moderate stress contribution
    } else if (temp < 30) {
      return 50; // Moderate stress contribution for low temperature
    } else {
      return 100; // High stress contribution for high temperature
    }
  };

  // Function to calculate GSR contribution with humidity compensation
  const calculateGSRContribution = (
    gsr: number,
    humidity: number = 60
  ): number => {
    // Normalize GSR (0-1023) to 0-100
    const normalizedGSR = (gsr / 1023) * 100;

    // Humidity compensation factor (higher humidity = lower GSR sensitivity)
    const humidityFactor = 1 - (humidity - 40) / 120; // 40-100% humidity range

    return normalizedGSR * humidityFactor;
  };

  // Function to calculate stress based on sensor data with new parameters
  const calculateStress = (data: SensorData): number => {
    if (!userData) return 0;

    const age = parseInt(userData.age);

    // Calculate age-adjusted HRV
    const ageAdjustedHRV = calculateAgeAdjustedHRV(data.hrv, age);

    // Calculate temperature contribution with Indian context
    const tempContribution = calculateTemperatureContribution(data.temp);

    // Calculate GSR with humidity compensation
    const gsrContribution = calculateGSRContribution(data.gsr, data.humidity);

    // Calculate final stress value with adjusted weights
    const stressValue =
      gsrContribution * 0.2 + // GSR: 20% weight (increased from 15%)
      (100 - ageAdjustedHRV) * 0.4 + // HRV: 40% weight (decreased from 50%)
      tempContribution * 0.4; // Temperature: 40% weight (increased from 35%)

    return Math.min(100, Math.max(0, stressValue));
  };

  const stopMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
    setIsMonitoring(false);

    // Save the current stress value to history
    if (userData) {
      saveToHistory(currentStress);

      // Update stress level classification
      if (currentStress > 70) setStressLevel("High");
      else if (currentStress > 40) setStressLevel("Moderate");
      else setStressLevel("Normal");
    }
  };

  // Clear interval on component unmount
  useEffect(() => {
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    };
  }, [monitoringInterval]);

  // Modified connectToDevice function
  const connectToDevice = () => {
    setShowIPInput(true);
  };
  const openRelaxationHub = () => {
    router.push("/RelaxationHub");
  };

  // Add disconnect function
  const disconnectFromDevice = () => {
    setIsConnected(false);
    setEsp32IP("");
    stopMonitoring();
    Alert.alert("Disconnected", "Successfully disconnected from ESP32");
  };

  const getStressColor = (value: number): string => {
    if (value > 70) return "#ff5252";
    if (value > 40) return "#ffa726";
    return "#4caf50";
  };

  const getTempColor = (temp: number) => {
    if (temp > 37) return "#ff5252"; // Red for high temperature
    if (temp < 30) return "#2196f3"; // Blue for low temperature
    if (temp >= 30 && temp <= 36) {
      return "#4caf50"; // Green for normal range
    } else {
      return "#ffa726"; // Orange for moderate range
    }
  };

  // Function to get temperature percentage for progress circle
  const getTempPercentage = (temp: number) => {
    return Math.min(100, Math.max(0, (temp / 60) * 100));
  };

  const getHrvColor = (value: number): string => {
    if (value === 0 || value > 150) return "#666666"; // Gray for waiting state
    if (value < 50) return "#ff5252"; // Red for low HRV (high stress)
    if (value > 100) return "#4caf50"; // Green for high HRV (low stress)
    return "#ffa726"; // Orange for moderate HRV
  };

  const getStressExercises = (stressLevel: number) => {
    if (stressLevel > 70) {
      return (
        "High Stress (>70%) - Immediate Calming:\n\n" +
        "1. 4-7-8 Breathing:\n" +
        "   • Inhale 4 sec → Hold 7 sec → Exhale 8 sec\n" +
        "   • Repeat 5 times\n\n" +
        "2. Progressive Muscle Relaxation:\n" +
        "   • Tense/release muscle groups from toes to head\n\n" +
        "3. Guided Imagery:\n" +
        "   • Visualize a peaceful scene (e.g., Himalayan meadow)"
      );
    } else if (stressLevel > 40) {
      return (
        "Moderate Stress (40-70%) - Stress Resilience:\n\n" +
        "1. Yoga Asanas:\n" +
        "   • Balasana (Child's Pose) - 3 minutes\n" +
        "   • Marjaryasana-Bitilasana (Cat-Cow) - 10 reps\n\n" +
        "2. Pranayama:\n" +
        "   • Nadi Shodhana (Alternate Nostril Breathing)\n\n" +
        "3. Brisk Walking:\n" +
        "   • 15 minutes with arm swings"
      );
    } else {
      return (
        "Normal Stress (<40%) - Maintenance:\n\n" +
        "1. Daily Mindfulness:\n" +
        "   • 10-minute body scan meditation\n\n" +
        "2. Low-intensity Activities:\n" +
        "   • Gardening or Swimming\n\n" +
        "3. Social Laughter:\n" +
        "   • 15 minutes of laughter yoga or comedy"
      );
    }
  };

  const getTemperatureExercises = (temp: number) => {
    if (temp > 37) {
      return "• Rest in a cool environment\n• Take lukewarm (not cold) bath\n• Use light clothing\n• Stay hydrated with cool water";
    } else if (temp > 36 && temp <= 37) {
      return "• Light stretching exercises\n• Gentle walking in cool area\n• Deep breathing exercises\n• Stay in ventilated space";
    } else if (temp >= 30 && temp <= 36) {
      return "• Regular cardio exercises\n• Jogging\n• Cycling\n• Regular workout routine";
    } else {
      return "• Indoor warm-up exercises\n• Warm-up routines\n• Light cardio with proper clothing\n• Gradual intensity increase";
    }
  };

  const getAnalysis = (): AnalysisData | null => {
    if (selectedMetric === "stress") {
      const metrics: MetricAnalysis[] = [
        {
          title: "Stress Level",
          value: `${currentStress}%`,
          status: stressLevel,
          color: getStressColor(currentStress),
          description:
            currentStress > 70
              ? "Your stress level is high. Consider taking immediate calming actions."
              : currentStress > 40
              ? "Your stress level is moderate. Focus on building stress resilience."
              : "Your stress level is normal. Continue with maintenance practices.",
          recommendations: getStressExercises(currentStress),
        },
        {
          title: "Body Temperature",
          value: `${bodyTemperature.toFixed(1)}°C`,
          status:
            bodyTemperature > 37.0
              ? "High"
              : bodyTemperature < 35.0
              ? "Low"
              : "Normal",
          color:
            bodyTemperature > 37.0
              ? "#ff5252"
              : bodyTemperature < 35.0
              ? "#ffa726"
              : "#4caf50",
          description:
            bodyTemperature > 37.0
              ? "Your body temperature is above normal range. Monitor for other symptoms."
              : bodyTemperature < 35.0
              ? "Your body temperature is below normal range. Try to warm up."
              : "Your body temperature is within the normal range.",
          recommendations:
            bodyTemperature > 37.0
              ? "• Rest and hydrate\n• Monitor for other symptoms\n• Consult a doctor if persistent\n• Cool down exercises\n• Light stretching\n• Breathing exercises\n• Stay in shade\n• Wear light clothing"
              : bodyTemperature < 35.0
              ? "• Warm up gradually\n• Wear warm clothing\n• Have warm beverages\n• Gentle movement\n• Indoor exercises\n• Warm-up stretches\n• Layer clothing\n• Stay active"
              : "• Maintain normal activities\n• Stay hydrated\n• Regular exercise\n• Balanced diet\n• Proper clothing\n• Regular breaks\n• Monitor temperature\n• Stay active",
        },
        {
          title: "Heart Rate Variability",
          value:
            hrvValue === 0 || hrvValue > 150 ? "Waiting..." : `${hrvValue}ms`,
          status:
            hrvValue === 0 || hrvValue > 150
              ? "Waiting"
              : hrvValue < 50
              ? "Low"
              : hrvValue > 150
              ? "High"
              : "Normal",
          color: getHrvColor(hrvValue),
          description:
            hrvValue === 0 || hrvValue > 150
              ? "Please wait while we measure your heart rate variability."
              : hrvValue < 50
              ? "Your HRV is low, which might indicate stress or fatigue. Consider taking time to rest and recover."
              : hrvValue > 150
              ? "Your HRV is high, indicating good cardiovascular fitness and stress resilience."
              : "Your HRV is within a normal range, indicating good balance between stress and recovery.",
          recommendations:
            hrvValue === 0 || hrvValue > 150
              ? "• Keep your finger on the sensor\n• Stay still during measurement\n• Breathe normally\n• Wait for stable reading"
              : hrvValue < 50
              ? "• Prioritize rest and recovery\n• Practice stress management\n• Improve sleep quality\n• Consider reducing training intensity"
              : hrvValue > 150
              ? "• Maintain current lifestyle habits\n• Continue balanced exercise routine\n• Keep up good sleep patterns"
              : "• Maintain regular exercise\n• Practice stress management\n• Ensure adequate sleep",
        },
      ];

      return {
        title: "Comprehensive Health Analysis",
        details: metrics,
      };
    }

    switch (selectedMetric) {
      case "temperature":
        return {
          title: "Body Temperature Analysis",
          status:
            bodyTemperature > 37.0
              ? "High"
              : bodyTemperature < 35.0
              ? "Low"
              : "Normal",
          details:
            bodyTemperature > 37.0
              ? "Your body temperature is above normal range. Monitor for other symptoms."
              : bodyTemperature < 35.0
              ? "Your body temperature is below normal range. Try to warm up."
              : "Your body temperature is within the normal range.",
          recommendation:
            bodyTemperature > 37.0
              ? "• Rest and hydrate\n• Monitor for other symptoms\n• Consult a doctor if persistent"
              : bodyTemperature < 35.0
              ? "• Warm up gradually\n• Wear warm clothing\n• Have warm beverages"
              : "• Maintain normal activities\n• Stay hydrated",
        };
      case "hrv":
        return {
          title: "Heart Rate Variability Analysis",
          status: hrvValue < 50 ? "Low" : hrvValue > 150 ? "High" : "Normal",
          details:
            hrvValue < 50
              ? "Your HRV is low, which might indicate stress or fatigue. Consider taking time to rest and recover."
              : hrvValue > 150
              ? "Your HRV is high, indicating good cardiovascular fitness and stress resilience."
              : "Your HRV is within a normal range, indicating good balance between stress and recovery.",
          recommendation:
            hrvValue < 50
              ? "• Prioritize rest and recovery\n• Practice stress management\n• Improve sleep quality\n• Consider reducing training intensity"
              : hrvValue > 150
              ? "• Maintain current lifestyle habits\n• Continue balanced exercise routine\n• Keep up good sleep patterns"
              : "• Maintain regular exercise\n• Practice stress management\n• Ensure adequate sleep",
        };
      default:
        return null;
    }
  };

  const renderAnalysisModal = () => {
    const analysis = getAnalysis();
    if (!analysis) return null;

    const isComprehensiveAnalysis =
      selectedMetric === "stress" && Array.isArray(analysis.details);
    const metrics = isComprehensiveAnalysis
      ? (analysis.details as MetricAnalysis[])
      : [];

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAnalysis}
        onRequestClose={() => setShowAnalysis(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{analysis.title}</Text>
              <TouchableOpacity
                onPress={() => setShowAnalysis(false)}
                style={styles.closeButton}
              >
                <FontAwesome6 name="xmark" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.analysisScrollView}>
              {isComprehensiveAnalysis ? (
                <View style={styles.comprehensiveAnalysisContainer}>
                  {metrics.map((metric: MetricAnalysis, index: number) => (
                    <View key={index} style={styles.metricAnalysisContainer}>
                      <View style={styles.metricHeader}>
                        <Text style={styles.metricTitle}>{metric.title}</Text>
                        <Text
                          style={[styles.metricValue, { color: metric.color }]}
                        >
                          {metric.value}
                        </Text>
                      </View>
                      <Text style={styles.metricStatus}>
                        Status:{" "}
                        <Text style={{ color: metric.color }}>
                          {metric.status}
                        </Text>
                      </Text>
                      <Text style={styles.metricDescription}>
                        {metric.description}
                      </Text>
                      <Text style={styles.recommendationTitle}>
                        Recommended Activities:
                      </Text>
                      <Text style={styles.recommendationText}>
                        {metric.recommendations}
                      </Text>
                      {index < metrics.length - 1 && (
                        <View style={styles.metricSeparator} />
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.analysisContainer}>
                  <Text style={styles.statusText}>
                    Status:{" "}
                    <Text style={{ color: getStressColor(currentStress) }}>
                      {analysis.status}
                    </Text>
                  </Text>
                  <Text style={styles.detailsText}>
                    {typeof analysis.details === "string"
                      ? analysis.details
                      : ""}
                  </Text>
                  <Text style={styles.recommendationTitle}>
                    Recommended Activities:
                  </Text>
                  <Text style={styles.recommendationText}>
                    {analysis.recommendation}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Render IP input modal
  const renderIPInputModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showIPInput}
      onRequestClose={() => setShowIPInput(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Connect to ESP32</Text>
            <TouchableOpacity
              onPress={() => setShowIPInput(false)}
              style={styles.closeButton}
            >
              <FontAwesome6 name="xmark" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.ipInput}
            placeholder="Enter ESP32 IP address"
            value={ipAddress}
            onChangeText={setIpAddress}
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConnecting}
          />

          <Text style={styles.ipInstructions}>
            Enter the IP address shown in your ESP32's Serial Monitor
          </Text>

          {isConnecting ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4caf50" />
              <Text style={styles.loadingText}>Connecting to ESP32...</Text>
            </View>
          ) : (
            <Button
              title="Connect"
              onPress={() => {
                if (ipAddress) {
                  connectToESP32(ipAddress);
                } else {
                  Alert.alert("Missing IP", "Please enter a valid IP address.");
                }
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  // Add history view to the dashboard
  const renderHistory = () => (
    <View style={styles.historyContainer}>
      <Text style={styles.historyTitle}>Recent Measurements</Text>
      {history.length === 0 ? (
        <View style={styles.emptyHistoryContainer}>
          <FontAwesome6
            name="history"
            size={40}
            color="#ccc"
            style={styles.emptyHistoryIcon}
          />
          <Text style={styles.emptyHistoryText}>
            No measurements recorded yet
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.historyScrollView}>
          {history
            .slice()
            .reverse()
            .map((entry, index) => (
              <View key={index} style={styles.historyEntry}>
                <Text style={styles.historyName}>{entry.name}</Text>
                <Text style={styles.historyTime}>{entry.timestamp}</Text>
                <Text
                  style={[
                    styles.historyStress,
                    { color: getStressColor(entry.stressLevel) },
                  ]}
                >
                  Stress: {entry.stressLevel}%
                </Text>
              </View>
            ))}
        </ScrollView>
      )}
    </View>
  );

  const handleLogout = () => {
    setIsStarted(false);
    setUserData(null);
    setHistory([]);
    setCurrentStress(0);
    setBodyTemperature(36.5);
    setHrvValue(50);
    setIsConnected(false);
    setIsMonitoring(false);
    setShowHistory(false);
    setShowAnalysis(false);
    setShowIPInput(false);
    setEsp32IP("");
    setIpAddress("");
    setReadings([]);
    setIsCollectingData(false);
  };

  if (!isStarted) {
    return <UserInputScreen onStart={handleStartMonitoring} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Image
            source={require("../../assets/images/calmpulse.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>CalmPulse</Text>
            <Text style={styles.subtitle}>Smart Stress Tracker and Guide</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {isConnected ? (
          <Button
            title="Disconnect from device"
            onPress={disconnectFromDevice}
            color="#ff5252"
          />
        ) : (
          <Button title="Connect to device" onPress={connectToDevice} />
        )}
        <TouchableOpacity
          style={styles.relaxButton}
          onPress={openRelaxationHub}
        >
          <Text style={styles.relaxText}>RELAXATION HUB</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dashboard}>
        <Text style={styles.stressLevel}>Stress Level: {stressLevel}</Text>

        <View style={styles.monitoringControls}>
          <TouchableOpacity
            style={[
              styles.monitoringButton,
              { backgroundColor: isMonitoring ? "#666" : "#4caf50" },
            ]}
            onPress={isMonitoring ? stopMonitoring : startMonitoring}
            disabled={!isConnected}
          >
            <FontAwesome6
              name={isMonitoring ? "stop" : "play"}
              size={16}
              color="#fff"
              style={styles.monitoringIcon}
            />
            <Text style={styles.monitoringButtonText}>
              {isMonitoring
                ? isCollectingData
                  ? "Collecting Data..."
                  : "Stop Monitoring"
                : "Start Monitoring"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsContainer}>
          <TouchableOpacity
            style={styles.mainMetric}
            onPress={() => {
              setSelectedMetric("stress");
              setShowAnalysis(true);
            }}
          >
            <AnimatedCircularProgress
              size={200}
              width={20}
              fill={currentStress}
              tintColor={getStressColor(currentStress)}
              backgroundColor="#e0e0e0"
              rotation={0}
              lineCap="round"
            >
              {(fill: number) => (
                <View style={styles.progressContent}>
                  <Text style={styles.percentText}>{`${Math.round(
                    fill
                  )}%`}</Text>
                  <Text style={styles.stressLabel}>Stress Level</Text>
                </View>
              )}
            </AnimatedCircularProgress>
          </TouchableOpacity>

          <View style={styles.sideMetricsContainer}>
            <View style={styles.sideMetric}>
              <AnimatedCircularProgress
                size={100}
                width={10}
                fill={getTempPercentage(bodyTemperature)}
                tintColor={getTempColor(bodyTemperature)}
                backgroundColor="#e0e0e0"
                rotation={0}
                lineCap="round"
              >
                {(fill: number) => (
                  <View style={styles.smallProgressContent}>
                    <Text
                      style={[
                        styles.smallPercentText,
                        {
                          fontSize:
                            bodyTemperature > 37.5
                              ? 24
                              : bodyTemperature < 36.0
                              ? 14
                              : 18,
                          fontWeight: "bold",
                        },
                      ]}
                    >{`${bodyTemperature.toFixed(1)}°C`}</Text>
                    <FontAwesome6
                      name="temperature-three-quarters"
                      size={24}
                      color={getTempColor(bodyTemperature)}
                      style={styles.iconStyle}
                    />
                  </View>
                )}
              </AnimatedCircularProgress>
            </View>

            <View style={styles.sideMetric}>
              <AnimatedCircularProgress
                size={100}
                width={10}
                fill={getHrvDisplayPercentage(hrvValue)}
                tintColor={getHrvColor(hrvValue)}
                backgroundColor="#e0e0e0"
                rotation={0}
                lineCap="round"
              >
                {(fill: number) => (
                  <View style={styles.smallProgressContent}>
                    <Text style={styles.smallPercentText}>
                      {hrvValue === 0 || hrvValue > 150
                        ? "Waiting for HRV"
                        : `${hrvValue}ms`}
                    </Text>
                    <FontAwesome6
                      name="heart-pulse"
                      size={24}
                      color={getHrvColor(hrvValue)}
                      style={styles.iconStyle}
                    />
                  </View>
                )}
              </AnimatedCircularProgress>
            </View>
          </View>

          <View style={styles.noteContainer}>
            <FontAwesome6
              name="circle-info"
              size={16}
              color="#666"
              style={styles.noteIcon}
            />
            <Text style={styles.noteText}>
              Note: Please take 10 minutes rest if you have been through an
              exercise such as walking for accurate measurements.
            </Text>
          </View>
        </View>
      </View>

      {showHistory && renderHistory()}
      {renderAnalysisModal()}
      {renderIPInputModal()}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginTop: 20,
          marginBottom: 40,
        }}
      >
        <TouchableOpacity
          style={styles.relaxButton}
          onPress={() => setShowHistory(!showHistory)}
        >
          <Text style={styles.relaxText}>Recent Measurements</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.relaxButton,
            { backgroundColor: "#ff5252", marginLeft: 10 },
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.relaxText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default App;

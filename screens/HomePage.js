import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  Alert,
  Modal,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";

// Configure notification handling behavior (optional)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function HomePage() {
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [priorityAnimation] = useState(new Animated.Value(1));
  const [editTask, setEditTask] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [addButtonAnim] = useState(new Animated.Value(1));


  // Request notification permissions & setup channel on mount
  useEffect(() => {
    async function setupNotifications() {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
        });
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please enable notifications in settings to receive alerts."
        );
      }
    }
    setupNotifications();
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const storedTasks = await AsyncStorage.getItem("tasks");
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
    } catch (error) {
      console.error("Failed to load tasks:", error);
    }
  }

  async function saveTasks(updatedTasks) {
    try {
      await AsyncStorage.setItem("tasks", JSON.stringify(updatedTasks));
    } catch (error) {
      console.error("Failed to save tasks:", error);
    }
  }

  // Schedule a notification for testing (10 seconds later)
  async function scheduleTestNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Task Reminder",
        body: taskText
          ? `Priority: ${priority} - Time to complete: ${taskText}`
          : "This is a test notification.",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        channelId: "default",
      },
      trigger: new Date(Date.now() + 10000), // 10 seconds from now
    });
  }

  // Handle adding a task
  async function handleAddTask() {
    if (!taskText.trim()) {
      Alert.alert("Validation", "Task cannot be empty.");
      return;
    }

    // Animate the add button
    Animated.sequence([
      Animated.timing(addButtonAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(addButtonAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const newTask = {
      id: Date.now().toString(),
      text: taskText,
      priority,
      completed: false,
    };
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    setTaskText("");
    await saveTasks(updatedTasks);
  }

  // Handle editing a task
  async function handleEditTask() {
    if (!taskText.trim()) {
      Alert.alert("Validation", "Task cannot be empty.");
      return;
    }
    const updatedTasks = tasks.map((task) =>
      task.id === editTask.id ? { ...task, text: taskText, priority } : task
    );
    setTasks(updatedTasks);
    setEditTask(null);
    setTaskText("");
    setModalVisible(false);
    await saveTasks(updatedTasks);
  }

  // Animate priority selection
  function handlePrioritySelect(selectedPriority) {
    setPriority(selectedPriority);
    Animated.sequence([
      Animated.timing(priorityAnimation, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(priorityAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }

  // Toggle task completion
  async function toggleTaskCompletion(taskId) {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  }

  // Delete a task
  async function handleDeleteTask(taskId) {
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  }

  const renderItem = ({ item, index }) => (
    <Swipeable
      renderRightActions={() => (
        <View style={styles.swipeActions}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteTask(item.id)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      <View
        style={[
          styles.taskItem,
          item.priority === "High" && styles.highPriorityBackground,
          item.priority === "Medium" && styles.mediumPriorityBackground,
          item.priority === "Low" && styles.lowPriorityBackground,
        ]}
      >
        <TouchableOpacity
          style={styles.taskContent}
          onPress={() => toggleTaskCompletion(item.id)}
        >
          <Text style={styles.taskNumber}>{index + 1}.</Text>
          <Text
            style={[
              styles.taskText,
              item.completed && styles.completedTaskText,
            ]}
          >
            {item.text}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setEditTask(item);
            setTaskText(item.text);
            setPriority(item.priority);
            setModalVisible(true);
          }}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <Text style={styles.header}>
            {editTask ? "Edit Task" : "New Task"}
          </Text>

          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              style={[
                styles.addButton,
                { marginRight: 10, transform: [{ scale: addButtonAnim }] },
                !taskText.trim() && { backgroundColor: "#ccc" }, // greyed out when disabled
              ]}
              disabled={!taskText.trim()} // disables the button
              onPress={() => {
                scheduleTestNotification();
                handleAddTask();
              }}
            >
              <Text style={styles.addButtonText}>{"Add"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Task Input */}
        <TextInput
          style={styles.input}
          placeholder="Task Title"
          value={taskText}
          onChangeText={setTaskText}
        />

        {/* Priority Row */}
        <View style={styles.priorityRow}>
          {["High", "Medium", "Low"].map((level) => (
            <Animated.View
              key={level}
              style={[
                styles.priorityButton,
                styles[level.toLowerCase()],
                {
                  transform: [
                    { scale: priority === level ? priorityAnimation : 1 },
                  ],
                },
              ]}
            >
              <TouchableOpacity onPress={() => handlePrioritySelect(level)}>
                <Text style={styles.priorityText}>{level}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Task List Heading */}
        <Text style={styles.taskListHeading}>Added Tasks</Text>

        {/* Task List */}
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.taskList}
        />

        {/* Edit Modal */}
        <Modal visible={isModalVisible} transparent animationType="slide">
          <View style={styles.modalWrapper}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Edit Task</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Task Title"
                value={taskText}
                onChangeText={setTaskText}
              />
              <View style={styles.priorityRow}>
                {["High", "Medium", "Low"].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.priorityButton, styles[level.toLowerCase()]]}
                    onPress={() => setPriority(level)}
                  >
                    <Text style={styles.priorityText}>{level}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleEditTask}
                >
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 50 : 40,
    paddingHorizontal: 20,
    backgroundColor: "#F4F6F8",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: "700",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: "#007BFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  input: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#fff",
    fontSize: 16,
    marginBottom: 16,
    shadowColor: "#ccc",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  priorityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  priorityButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    elevation: 2,
  },
  high: {
    backgroundColor: "#E63946",
  },
  medium: {
    backgroundColor: "#FFA500",
  },
  low: {
    backgroundColor: "#2A9D8F",
  },
  priorityText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  taskListHeading: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
    color: "#222",
  },
  taskList: {
    paddingBottom: 40,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  highPriorityBackground: {
    backgroundColor: "#E63946",
  },
  mediumPriorityBackground: {
    backgroundColor: "#FFA500",
  },
  lowPriorityBackground: {
    backgroundColor: "#2A9D8F",
  },
  taskContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskNumber: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
    color: "#fff",
  },
  taskText: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
  },
  completedTaskText: {
    textDecorationLine: "line-through",
    color: "#ddd",
  },
  editButton: {
    backgroundColor: "#FFB347",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  swipeActions: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  deleteButton: {
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 3,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  modalWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalInput: {
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f9f9f9",
    fontSize: 16,
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E63946",
  },
  saveButton: {
    backgroundColor: "#007BFF",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  highPriorityShade: {
    backgroundColor: "rgba(230, 57, 70, 0.1)",
  },
  mediumPriorityShade: {
    backgroundColor: "rgba(255, 165, 0, 0.1)",
  },
  lowPriorityShade: {
    backgroundColor: "rgba(42, 157, 143, 0.1)",
  },
});

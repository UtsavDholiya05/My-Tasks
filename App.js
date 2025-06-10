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
  Dimensions,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const { width, height } = Dimensions.get("window");

export default function HomePage() {
  // State management
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [priorityAnimation] = useState(new Animated.Value(1));
  const [editText, setEditText] = useState("");
  const [isModalVisible, setModalVisible] = useState(false);
  const [addButtonAnim] = useState(new Animated.Value(1));
  const [editTask, setEditTask] = useState(null);
  const [editPriority, setEditPriority] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize app with notifications and load data
  useEffect(() => {
    async function setupNotifications() {
      // Set up notification channel for Android
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
        });
      }
      
      // Request notification permissions
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

  // Update status bar when dark mode changes
  useEffect(() => {
    // Set status bar style based on dark mode
    StatusBar.setBarStyle(isDarkMode ? "light-content" : "dark-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(isDarkMode ? "#121212" : "#F8F9FA");
    }
  }, [isDarkMode]);

  // Load dark mode preference from storage
  useEffect(() => {
    async function loadDarkModePreference() {
      try {
        const savedMode = await AsyncStorage.getItem('darkMode');
        if (savedMode !== null) {
          setIsDarkMode(savedMode === 'true');
        }
      } catch (error) {
        console.error('Failed to load dark mode preference:', error);
      }
    }
    
    loadDarkModePreference();
  }, []);

  // Handle notifications for deleted tasks
  useEffect(() => {
    // Add notification received listener for catching notifications for deleted tasks
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      try {
        // Get the taskId directly from the notification identifier
        const notificationId = notification.request.identifier;
        
        console.log(`Notification received with ID: ${notificationId}`);
        
        // Check if the task still exists by checking if this ID exists in tasks
        const taskExists = tasks.some(task => task.id === notificationId);
        
        if (!taskExists) {
          console.log(`Task ${notificationId} no longer exists, dismissing notification`);
          Notifications.dismissNotificationAsync(notificationId);
        }
      } catch (error) {
        console.error("Error handling notification:", error);
      }
    });
    
    return () => {
      // Clean up subscription
      notificationListener.remove();
    };
  }, [tasks]);

  // Load tasks from storage
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

  // Save tasks to storage
  async function saveTasks(updatedTasks) {
    try {
      await AsyncStorage.setItem("tasks", JSON.stringify(updatedTasks));
    } catch (error) {
      console.error("Failed to save tasks:", error);
    }
  }

  // Add a new task
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

    // Generate ID first before any other operations
    const taskId = Date.now().toString();
    
    // Schedule notification using the task ID
    const notificationId = await scheduleTaskNotification(taskText, priority, taskId);

    // Create task with the same ID
    const newTask = {
      id: taskId,
      text: taskText,
      priority,
      completed: false,
      notificationId: notificationId
    };
    
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    setTaskText("");
    await saveTasks(updatedTasks);
  }

  // Schedule a notification for a task
  async function scheduleTaskNotification(text, priority, taskId) {
    try {
      // Use the task ID as the notification identifier
      const notificationIdentifier = taskId;
      
      // Schedule notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Task Reminder",
          body: `Time to complete: ${text} (${priority})`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: "default",
          data: { taskId: notificationIdentifier },
        },
        trigger: new Date(Date.now() + 10000),
        identifier: notificationIdentifier,
      });
      
      console.log(`Scheduled notification with identifier: ${notificationIdentifier}`);
      return notificationIdentifier; 
    } catch (error) {
      console.error("Failed to schedule notification:", error);
      return null;
    }
  }

  // Edit an existing task
  async function handleEditTask() {
    if (!editText.trim()) {
      Alert.alert("Validation", "Task cannot be empty.");
      return;
    }

    try {
      // Find the task to get its notification ID
      const taskToEdit = tasks.find(task => task.id === editTask.id);
      
      // Cancel the existing notification
      if (taskToEdit) {
        try {
          await Notifications.cancelScheduledNotificationAsync(taskToEdit.id);
          console.log(`Cancelled notification for edited task: ${taskToEdit.id}`);
        } catch (error) {
          console.error("Failed to cancel notification:", error);
        }
      }
      
      // Schedule a new notification using the same task ID
      const notificationId = await scheduleTaskNotification(
        editText,
        editPriority,
        editTask.id
      );
      
      // Update the task
      const updatedTasks = tasks.map((task) =>
        task.id === editTask.id ? {
          ...task,
          text: editText,
          priority: editPriority,
          notificationId: notificationId
        } : task
      );
      
      // Update state and storage
      setTasks(updatedTasks);
      setEditTask(null);
      setEditText("");
      setEditPriority("");
      setModalVisible(false);
      await saveTasks(updatedTasks);
    } catch (error) {
      console.error("Error editing task:", error);
    }
  }

  // Animate priority selection in main screen
  function handlePrioritySelect(selectedPriority) {
    setPriority(selectedPriority);

    // Reset animation value for consistent behavior
    priorityAnimation.setValue(1);

    // Animated sequence for button scaling
    Animated.sequence([
      // Scale up
      Animated.timing(priorityAnimation, {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true,
      }),
      // Bounce back with spring effect
      Animated.spring(priorityAnimation, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }

  // Handle priority selection in edit modal
  function handleEditPrioritySelect(selectedPriority) {
    setEditPriority(selectedPriority);

    // Same animation as main screen
    priorityAnimation.setValue(1);
    Animated.sequence([
      Animated.timing(priorityAnimation, {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(priorityAnimation, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }

  // Toggle task completion status
  async function toggleTaskCompletion(taskId) {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  }

  // Delete a task and its notification
  async function handleDeleteTask(taskId) {
    try {
      // Find the task to get its notification identifier
      const taskToDelete = tasks.find(task => task.id === taskId);
      
      if (taskToDelete) {
        // Cancel the notification
        const notificationIdentifier = taskId;
        await Notifications.cancelScheduledNotificationAsync(notificationIdentifier);
        
        // For Android, also dismiss any shown notifications
        if (Platform.OS === 'android') {
          try {
            await Notifications.dismissNotificationAsync(notificationIdentifier);
          } catch (dismissError) {
            console.log("No active notification to dismiss");
          }
        }
        
        console.log(`Cancelled notification with identifier: ${notificationIdentifier}`);
      }
      
      // Remove the task from state and storage
      const updatedTasks = tasks.filter((task) => task.id !== taskId);
      setTasks(updatedTasks);
      await saveTasks(updatedTasks);
    } catch (error) {
      console.error("Error deleting task:", error);
      // Proceed with deletion even if notification cancellation fails
      const updatedTasks = tasks.filter((task) => task.id !== taskId);
      setTasks(updatedTasks);
      await saveTasks(updatedTasks);
    }
  }

  // Toggle between dark and light mode
  async function toggleDarkMode() {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    try {
      await AsyncStorage.setItem('darkMode', String(newMode));
    } catch (error) {
      console.error('Failed to save dark mode preference:', error);
    }
  }

  // Render individual task items
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
          isDarkMode && styles.darkTaskItem,
          item.priority === "High" && (isDarkMode ? styles.darkHighPriority : styles.highPriorityBackground),
          item.priority === "Medium" && (isDarkMode ? styles.darkMediumPriority : styles.mediumPriorityBackground),
          item.priority === "Low" && (isDarkMode ? styles.darkLowPriority : styles.lowPriorityBackground),
        ]}
      >
        <TouchableOpacity style={styles.taskContent} onPress={() => toggleTaskCompletion(item.id)}>
          <Text style={[
            styles.taskNumber,
            isDarkMode && styles.darkTaskNumber
          ]}>{index + 1}.</Text>
          <Text
            style={[
              styles.taskText,
              isDarkMode && styles.darkTaskText,
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
            setEditText(item.text);
            setEditPriority(item.priority);
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
      {/* Status Bar configuration for both light and dark modes */}
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#121212" : "#F8F9FA"}
        translucent={false}
      />
      
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        {/* App Header with Dark Mode Toggle */}
        <View style={[styles.headerRow, isDarkMode && styles.darkHeaderRow]}>
          <Text style={[styles.header, isDarkMode && styles.darkHeader]}>
            {"My Tasks"}
          </Text>

          <TouchableOpacity
            style={styles.darkModeToggle}
            onPress={toggleDarkMode}
          >
            <Text style={styles.darkModeToggleText}>
              {isDarkMode ? "☀️" : "🌙"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Task Input with Add Button */}
        <View
          style={[
            styles.inputContainer,
            isDarkMode && styles.darkInputContainer,
          ]}
        >
          <TextInput
            style={[styles.inputWithButton, isDarkMode && styles.darkInput]}
            placeholder="Task Title"
            placeholderTextColor={isDarkMode ? "#888" : "#999"}
            value={taskText}
            onChangeText={setTaskText}
          />
          <TouchableOpacity
            style={[
              styles.addButton,
              { transform: [{ scale: addButtonAnim }] },
              !taskText.trim() && { backgroundColor: "#ccc" },
            ]}
            disabled={!taskText.trim()}
            onPress={handleAddTask}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Priority Selection Buttons */}
        <View style={[styles.priorityRow, isDarkMode && styles.darkPriorityRow]}>
          {["High", "Medium", "Low"].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.priorityButton,
                styles[level.toLowerCase()],
                priority === level && styles.selectedPriorityButton,
                priority !== level && styles.unselectedPriorityButton,
              ]}
              onPress={() => handlePrioritySelect(level)}
              activeOpacity={0.7}
            >
              <Text style={styles.priorityText}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Task List Section */}
        <View style={[styles.taskListContainer, isDarkMode && styles.darkTaskListContainer]}>
          <Text style={[styles.taskListHeading, isDarkMode && styles.darkTaskListHeading]}>
            Added Tasks
          </Text>
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.taskList}
          />
        </View>

        {/* Edit Task Modal */}
        <Modal visible={isModalVisible} transparent animationType="slide">
          <View style={[styles.modalWrapper, isDarkMode && styles.darkModalWrapper]}>
            <View style={[styles.modalContainer, isDarkMode && styles.darkModalContainer]}>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>
                Edit Task
              </Text>
              <TextInput
                style={[styles.modalInput, isDarkMode && styles.darkModalInput]}
                placeholder="Task Title"
                placeholderTextColor={isDarkMode ? "#888" : "#999"}
                value={editText}
                onChangeText={setEditText}
              />
              
              {/* Edit Modal Priority Selection */}
              <View style={[styles.priorityRow, isDarkMode && styles.darkPriorityRow]}>
                {["High", "Medium", "Low"].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.priorityButton,
                      styles[level.toLowerCase()],
                      editPriority === level && styles.selectedPriorityButton,
                      editPriority !== level && styles.unselectedPriorityButton,
                    ]}
                    onPress={() => handleEditPrioritySelect(level)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.priorityText}>{level}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Modal Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setModalVisible(false);
                    setEditTask(null);
                  }}
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

// Styles for the app
const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? height * 0.07 : height * 0.06,
    paddingHorizontal: width * 0.05,
    backgroundColor: "#F8F9FA", // Light background
  },

  // Header Section
  headerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: height * 0.025,
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.04,
    backgroundColor: "#FFFFFF",
    borderRadius: width * 0.03,
    borderLeftWidth: 4,
    borderLeftColor: "#007BFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    position: "relative",
  },
  header: {
    fontSize: width * 0.065,
    fontWeight: "700",
    color: "#2C3E50",
    textAlign: "center",
  },
  
  // Dark Mode Toggle Button
  darkModeToggle: {
    position: "absolute",
    right: width * 0.04,
    padding: width * 0.02,
    borderRadius: width * 0.02,
  },
  darkModeToggleText: {
    fontSize: width * 0.06,
  },

  // Input Section
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: height * 0.025,
  },
  inputWithButton: {
    flex: 1,
    borderColor: "#E0E0E0",
    borderWidth: 1,
    borderRadius: width * 0.03,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.018,
    backgroundColor: "#fff",
    fontSize: width * 0.045,
    color: "#555",
    marginRight: width * 0.02,
  },
  addButton: {
    backgroundColor: "#007BFF",
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.05,
    borderRadius: width * 0.03,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: width * 0.042,
  },

  // Priority Selection Section
  priorityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: height * 0.025,
    backgroundColor: "#FFFFFF",
    padding: width * 0.03,
    borderRadius: width * 0.03,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  priorityButton: {
    flex: 1,
    marginHorizontal: width * 0.015,
    paddingVertical: height * 0.018,
    borderRadius: width * 0.03,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  high: {
    backgroundColor: "#E53935", // Red for high priority
  },
  medium: {
    backgroundColor: "#FF9800", // Orange for medium priority
  },
  low: {
    backgroundColor: "#00897B", // Teal for low priority
  },
  priorityText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: width * 0.042,
    textAlign: "center",
  },
  selectedPriorityButton: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
    transform: [{ scale: 1.1 }],
  },
  unselectedPriorityButton: {
    transform: [{ scale: 0.75 }],
    opacity: 0.65,
    elevation: 1,
  },

  // Task List Section
  taskListContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: width * 0.03,
    borderTopWidth: 4,
    borderTopColor: "#3F51B5",
    marginTop: height * 0.025,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
  },
  taskListHeading: {
    fontSize: width * 0.055,
    fontWeight: "700",
    marginBottom: height * 0.02,
    color: "#2C3E50",
    paddingBottom: height * 0.015,
    paddingHorizontal: width * 0.04,
    paddingTop: height * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEFF1",
  },
  taskList: {
    paddingHorizontal: width * 0.04,
    paddingBottom: height * 0.05,
  },

  // Individual Task Items
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: width * 0.04,
    borderRadius: width * 0.025,
    marginBottom: height * 0.015,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
  },
  highPriorityBackground: {
    backgroundColor: "#FFF8F8",
    borderLeftColor: "#E53935",
  },
  mediumPriorityBackground: {
    backgroundColor: "#FFF3E0",
    borderLeftColor: "#FF9800",
  },
  lowPriorityBackground: {
    backgroundColor: "#E0F2F1",
    borderLeftColor: "#00897B",
  },
  taskContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskNumber: {
    fontSize: width * 0.045,
    fontWeight: "600",
    marginRight: width * 0.035,
    color: "#546E7A",
  },
  taskText: {
    fontSize: width * 0.045,
    color: "#37474F",
    flex: 1,
  },
  completedTaskText: {
    textDecorationLine: "line-through",
    color: "#9E9E9E",
  },

  // Task Action Buttons
  editButton: {
    backgroundColor: "#007BFF",
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.04,
    borderRadius: width * 0.02,
    elevation: 2,
    alignSelf: "flex-end",
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: width * 0.038,
  },
  swipeActions: {
    justifyContent: "row",
    alignItems: "center",
    paddingHorizontal: width * 0.02,
  },
  deleteButton: {
    backgroundColor: "#F44336",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.04,
    borderRadius: width * 0.02,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    height: "83%",
    width: width * 0.2,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: width * 0.04,
  },

  // Modal Styles
  modalWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)", // Light white blur for light mode
  },
  darkModalWrapper: {
    backgroundColor: "rgba(20, 20, 20, 0.7)", // Dark blur for dark mode
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "rgba(255, 255, 255, 0.97)", // Slightly transparent for glossy feel
    padding: width * 0.05,
    borderRadius: width * 0.03,
    elevation: 15,
    borderTopWidth: 4,
    borderTopColor: "#007BFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    // Add subtle inner shadow for depth
    borderTopColor: "#007BFF",
    borderWidth: 0.5,
    borderLeftColor: "rgba(255, 255, 255, 0.9)",
    borderRightColor: "rgba(255, 255, 255, 0.9)",
    borderBottomColor: "rgba(255, 255, 255, 0.9)",
  },
  darkModalContainer: {
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    borderTopColor: "#2196F3",
    borderColor: "rgba(60, 60, 60, 0.8)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
  },
  modalTitle: {
    fontSize: width * 0.055,
    fontWeight: "bold",
    marginBottom: height * 0.025,
    textAlign: "center",
    color: "#2C3E50",
  },
  modalInput: {
    borderColor: "#E0E0E0",
    borderWidth: 1,
    borderRadius: width * 0.03,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.018,
    backgroundColor: "#F5F5F5",
    fontSize: width * 0.045,
    marginBottom: height * 0.025,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: height * 0.01,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: width * 0.015,
    paddingVertical: height * 0.018,
    borderRadius: width * 0.03,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#757575", // Dark gray cancel button
  },
  saveButton: {
    backgroundColor: "#007BFF", // Blue save button
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: width * 0.042,
  },

  // Dark Mode Styles
  darkContainer: {
    backgroundColor: "#121212",
  },
  darkHeaderRow: {
    backgroundColor: "#1E1E1E",
    borderLeftColor: "#2196F3",
  },
  darkHeader: {
    color: "#FFFFFF",
  },
  darkInputContainer: {
    backgroundColor: "#1E1E1E",
  },
  darkInput: {
    backgroundColor: "#333",
    borderColor: "#555",
    color: "#FFFFFF",
  },
  darkPriorityRow: {
    backgroundColor: "#1E1E1E",
  },
  darkTaskListContainer: {
    backgroundColor: "#1E1E1E",
    borderTopColor: "#2196F3",
  },
  darkTaskListHeading: {
    color: "#FFFFFF",
    borderBottomColor: "#333",
  },
  darkTaskItem: {
    backgroundColor: "#2D2D2D",
  },
  darkTaskText: {
    color: "#FFFFFF",
  },
  darkTaskNumber: {
    color: "#AAAAAA",
  },
  darkHighPriority: {
    backgroundColor: "#331111",
    borderLeftColor: "#E53935",
  },
  darkMediumPriority: {
    backgroundColor: "#332211",
    borderLeftColor: "#FF9800",
  },
  darkLowPriority: {
    backgroundColor: "#113322",
    borderLeftColor: "#00897B",
  },
  darkModalWrapper: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  darkModalContainer: {
    backgroundColor: "#1E1E1E",
    borderTopColor: "#2196F3",
  },
  darkModalTitle: {
    color: "#FFFFFF",
  },
  darkModalInput: {
    backgroundColor: "#333",
    borderColor: "#555",
    color: "#FFFFFF",
  },
});
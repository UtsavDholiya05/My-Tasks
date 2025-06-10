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

// Configure notification handling behavior (optional)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const { width, height } = Dimensions.get("window");

export default function HomePage() {
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [priorityAnimation] = useState(new Animated.Value(1));
  const [editText, setEditText] = useState("");
  const [isModalVisible, setModalVisible] = useState(false);
  const [addButtonAnim] = useState(new Animated.Value(1));
  // Add this line with your other state declarations at the top of your component
  const [editTask, setEditTask] = useState(null); // Add this line to define editTask state
  // Add this state for edit modal priority
  const [editPriority, setEditPriority] = useState("");
  // Add this state at the top with your other state declarations
  const [isDarkMode, setIsDarkMode] = useState(false);

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

    // Set status bar style explicitly
    StatusBar.setBarStyle("dark-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("#F8F9FA");
    }
  }, []);

  // Load dark mode preference
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
    // Other existing useEffect code...
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

    // Generate ID first before ANY other operations
    const taskId = Date.now().toString();
    
    // Schedule notification using EXACTLY this ID - only do this once!
    const notificationId = await scheduleTaskNotification(taskText, priority, taskId);

    // Create task with the SAME ID
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

  // Updated scheduleTaskNotification function
  async function scheduleTaskNotification(text, priority, taskId) {
    try {
      // Important: This ensures the EXACT same ID is used everywhere
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

  // Handle editing a task
  async function handleEditTask() {
    if (!editText.trim()) {
      Alert.alert("Validation", "Task cannot be empty.");
      return;
    }

    try {
      // Find the task to get its notification ID
      const taskToEdit = tasks.find(task => task.id === editTask.id);
      
      // Cancel the existing notification using the task ID (which is the same as notification ID)
      if (taskToEdit) {
        try {
          await Notifications.cancelScheduledNotificationAsync(taskToEdit.id);
          console.log(`Cancelled notification for edited task: ${taskToEdit.id}`);
        } catch (error) {
          console.error("Failed to cancel notification:", error);
        }
      }
      
      // Schedule a new notification - passing the SAME task ID
      const notificationId = await scheduleTaskNotification(
        editText,
        editPriority,
        editTask.id // Use the existing task ID to keep consistency
      );
      
      // Update the task
      const updatedTasks = tasks.map((task) =>
        task.id === editTask.id ? {
          ...task,
          text: editText,
          priority: editPriority,
          notificationId: notificationId // This should be the same as task.id now
        } : task
      );
      
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

  // Animate priority selection
  function handlePrioritySelect(selectedPriority) {
    setPriority(selectedPriority);

    // Reset animation value to ensure consistent behavior
    priorityAnimation.setValue(1);

    // Improved animation sequence
    Animated.sequence([
      // Scale up more noticeably
      Animated.timing(priorityAnimation, {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true,
      }),
      // Bounce back with slight overshoot
      Animated.spring(priorityAnimation, {
        toValue: 1,
        friction: 5,
        tension: 100,
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
    try {
      // Find the task to get its notification ID and identifier
      const taskToDelete = tasks.find(task => task.id === taskId);
      
      if (taskToDelete) {
        // Use the task ID itself as the notification identifier (matching how it's created)
        const notificationIdentifier = taskId;
        
        // Cancel using both methods to ensure it's completely stopped
        await Notifications.cancelScheduledNotificationAsync(notificationIdentifier);
        
        // For Android, try dismissing any already shown notifications
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
        {/* Task content */}
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
        {/* Edit button */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setEditTask(item);
            setEditText(item.text);
            setEditPriority(item.priority); // Set edit priority separately
            setModalVisible(true);
          }}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );

  // Add this function to handle edit priority selection
  function handleEditPrioritySelect(selectedPriority) {
    setEditPriority(selectedPriority);

    // Reset animation value to ensure consistent behavior
    priorityAnimation.setValue(1);

    // Improved animation sequence for edit modal
    Animated.sequence([
      // Scale up more noticeably
      Animated.timing(priorityAnimation, {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true,
      }),
      // Bounce back with slight overshoot
      Animated.spring(priorityAnimation, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }

  // Update function to toggle and save dark mode
  async function toggleDarkMode() {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    try {
      await AsyncStorage.setItem('darkMode', String(newMode));
    } catch (error) {
      console.error('Failed to save dark mode preference:', error);
    }
  }

  // Add this to your useEffect
  useEffect(() => {
    // Your existing code...
    
    // Add notification received listener for debugging
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
      // Your existing cleanup code...
      notificationListener.remove();
    };
  }, [tasks]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar
        bbarStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#121212" : "#F8F9FA"}
        translucent={false}
      />
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        {/* Header Row - Remove add button from here */}
        <View style={[styles.headerRow, isDarkMode && styles.darkHeaderRow]}>
          <Text style={[styles.header, isDarkMode && styles.darkHeader]}>
            {"My Tasks"}
          </Text>

          <TouchableOpacity
            style={styles.darkModeToggle}
            onPress={() => setIsDarkMode((prev) => !prev)}
          >
            <Text style={styles.darkModeToggleText}>
              {isDarkMode ? "☀️" : "🌙"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Task Input with Add button on right */}
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
            onPress={() => {
              handleAddTask();
            }}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Priority Row */}
        <View style={[
  styles.priorityRow,
  isDarkMode && styles.darkPriorityRow
]}>
          {["High", "Medium", "Low"].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.priorityButton,
                styles[level.toLowerCase()],
                priority === level && styles.selectedPriorityButton,
                priority !== level && styles.unselectedPriorityButton, // Apply unselected style
              ]}
              onPress={() => handlePrioritySelect(level)}
              activeOpacity={0.7}
            >
              <Text style={styles.priorityText}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Task List Section */}
        <View style={[
  styles.taskListContainer,
  isDarkMode && styles.darkTaskListContainer
]}>
          <Text style={[
    styles.taskListHeading,
    isDarkMode && styles.darkTaskListHeading
  ]}>Added Tasks</Text>
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.taskList}
          />
        </View>

        {/* Edit Modal with improved background blur */}
        <Modal visible={isModalVisible} transparent animationType="slide">
          <View style={[
            styles.modalWrapper,
            isDarkMode && styles.darkModalWrapper
          ]}>
            <View style={[
              styles.modalContainer,
              isDarkMode && styles.darkModalContainer
            ]}>
              <Text style={[
                styles.modalTitle,
                isDarkMode && styles.darkModalTitle
              ]}>Edit Task</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  isDarkMode && styles.darkModalInput
                ]}
                placeholder="Task Title"
                placeholderTextColor={isDarkMode ? "#888" : "#999"}
                value={editText}
                onChangeText={setEditText}
              />
              {/* Update the Edit Modal priority buttons */}
              <View style={styles.priorityRow}>
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
                  onPress={() => handleEditTask()}
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

// Updated styles for a more clean and professional UI
const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? height * 0.07 : height * 0.06, // Increased from 0.05/0.04
    paddingHorizontal: width * 0.05,
    backgroundColor: "#F8F9FA", // Light background
  },

  // Header Section
  headerRow: {
    flexDirection: "row",
    justifyContent: "center", // Center the title
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
    position: "relative", // For absolute positioning of the Add button
  },
  header: {
    fontSize: width * 0.065,
    fontWeight: "700",
    color: "#2C3E50",
    textAlign: "center", // Center-align the text
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
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: width * 0.042,
  },

  // Input Section
  input: {
    borderColor: "#E0E0E0",
    borderWidth: 1,
    borderRadius: width * 0.03,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.018,
    backgroundColor: "#fff",
    fontSize: width * 0.045,
    marginBottom: height * 0.025,
    color: "#555",
    shadowColor: "#ccc",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
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
    justifyContent: "center", // Add this to center text vertically
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
    textAlign: "center", // Add this to ensure text is centered horizontally
  },

  // Task List Section
  taskListContainer: {
    flex: 0.93,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: width * 0.03,
    borderTopWidth: 4,
    borderTopColor: "#3F51B5", // Blue for task list header
    marginTop: height * 0.025,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden", // This prevents content from spilling outside rounded corners
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
    paddingBottom: height * 0.05, // Add extra space at the bottom for better scrolling
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
    borderLeftWidth: 4, // Left border indicator
  },
  highPriorityBackground: {
    backgroundColor: "#FFF8F8", // Light red background
    borderLeftColor: "#E53935", // Red left border
  },
  mediumPriorityBackground: {
    backgroundColor: "#FFF3E0", // Light orange background
    borderLeftColor: "#FF9800", // Orange left border
  },
  lowPriorityBackground: {
    backgroundColor: "#E0F2F1", // Light teal background
    borderLeftColor: "#00897B", // Teal left border
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
    color: "#546E7A", // Dark blue-gray
  },
  taskText: {
    fontSize: width * 0.045,
    color: "#37474F", // Dark gray
    flex: 1,
  },
  completedTaskText: {
    textDecorationLine: "line-through",
    color: "#9E9E9E", // Medium gray
  },

  // Task Action Buttons
  editButton: {
    backgroundColor: "#007BFF", // Blue edit button
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.04,
    borderRadius: width * 0.02,
    elevation: 2,
    alignSelf: "flex-end", // Ensure it stays on the right
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: width * 0.038,
  },
  swipeActions: {
    justifyContent: "row",
    alignItems: "row",
    paddingHorizontal: width * 0.02,
  },
  deleteButton: {
    backgroundColor: "#F44336", // Red delete button
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
    backgroundColor: "rgba(0, 0, 0, 0.95)", // Change from 1 to 0.6 for blur effect
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#fff",
    padding: width * 0.05,
    borderRadius: width * 0.03,
    elevation: 5,
    borderTopWidth: 4,
    borderTopColor: "#007BFF",
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
    backgroundColor: "#757575", // Dark gray cancel button instead of red
  },
  saveButton: {
    backgroundColor: "#007BFF", // Blue save button
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: width * 0.042,
  },
  selectedPriorityButton: {
    borderWidth: 3, // Thick border
    borderColor: "#FFFFFF", // White border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5, // Increased opacity for more noticeable shadow
    shadowRadius: 5,
    elevation: 10, // Higher elevation for better pop effect
    transform: [{ scale: 1.1 }], // Make selected button slightly larger
  },
  unselectedPriorityButton: {
    transform: [{ scale: 0.85 }], // Make unselected buttons significantly smaller (changed from 0.95)
    opacity: 0.75, // Further reduce opacity for better contrast (changed from 0.85)
    elevation: 1, // Reduce elevation to make it appear less prominent
  },
  darkHeaderRow: {
    backgroundColor: "#1E1E1E",
    borderLeftColor: "#2196F3",
  },
  darkHeader: {
    color: "#FFFFFF",
  },
  darkModeToggle: {
    position: "absolute",
    right: width * 0.04,
    padding: width * 0.02,
    borderRadius: width * 0.02,
  },
  darkModeToggleText: {
    fontSize: width * 0.06,
  },
  darkContainer: {
    backgroundColor: "#121212",
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

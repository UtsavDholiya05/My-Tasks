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
import DateTimePicker from '@react-native-community/datetimepicker';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const { width, height } = Dimensions.get("window");

// Notification timing options
const NOTIFICATION_OPTIONS = [
  { label: "No Notification", value: "none", milliseconds: 0 },
  { label: "10 Seconds", value: "10s", milliseconds: 10 * 1000 },
  { label: "1 Minute", value: "1m", milliseconds: 1 * 60 * 1000 },
  { label: "5 Minutes", value: "5m", milliseconds: 5 * 60 * 1000 },
  { label: "30 Minutes", value: "30m", milliseconds: 30 * 60 * 1000 },
  { label: "1 Hour", value: "1h", milliseconds: 1 * 60 * 60 * 1000 },
  { label: "2 Hours", value: "2h", milliseconds: 2 * 60 * 60 * 1000 },
  { label: "6 Hours", value: "6h", milliseconds: 6 * 60 * 60 * 1000 },
  { label: "12 Hours", value: "12h", milliseconds: 12 * 60 * 60 * 1000 },
  { label: "1 Day", value: "1d", milliseconds: 1 * 24 * 60 * 60 * 1000 },
  { label: "2 Days", value: "2d", milliseconds: 2 * 24 * 60 * 60 * 1000 },
  { label: "3 Days", value: "3d", milliseconds: 3 * 24 * 60 * 60 * 1000 },
  { label: "1 Week", value: "1w", milliseconds: 7 * 24 * 60 * 60 * 1000 },
  { label: "Custom Date & Time", value: "custom", milliseconds: 0 },
];

export default function HomePage() {
  // State management
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState("");
  // const [priority, setPriority] = useState("Medium"); // Commented out priority
  // const [priorityAnimation] = useState(new Animated.Value(1)); // Commented out priority animation
  const [editText, setEditText] = useState("");
  const [isModalVisible, setModalVisible] = useState(false);
  const [addButtonAnim] = useState(new Animated.Value(1));
  const [editTask, setEditTask] = useState(null);
  // const [editPriority, setEditPriority] = useState(""); // Commented out edit priority
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // New state for date/time picker
  const [notificationDate, setNotificationDate] = useState(new Date(Date.now() + 60000)); // Default 1 minute from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editNotificationDate, setEditNotificationDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);

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

    // Check if notification date is in the future
    if (notificationDate <= new Date()) {
      Alert.alert("Invalid Date", "Please select a future date and time for the notification.");
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
    
    // Schedule notification using the task ID and selected date/time
    const notificationId = await scheduleTaskNotification(taskText, taskId, notificationDate);

    // Create task with the same ID (removed priority)
    const newTask = {
      id: taskId,
      text: taskText,
      completed: false,
      notificationId: notificationId,
      notificationDate: notificationDate.toISOString()
    };
    
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    setTaskText("");
    
    // Reset notification date to 1 minute from now
    setNotificationDate(new Date(Date.now() + 60000));
    
    await saveTasks(updatedTasks);
  }

  // Schedule a notification for a task (updated to use custom date/time)
  async function scheduleTaskNotification(text, taskId, scheduledDate) {
    try {
      const notificationIdentifier = taskId;
      
      // Schedule notification for the specified date/time
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Task Reminder",
          body: `Time to complete: ${text}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: "default",
          data: { taskId: notificationIdentifier },
        },
        trigger: scheduledDate,
        identifier: notificationIdentifier,
      });
      
      console.log(`Scheduled notification with identifier: ${notificationIdentifier} for ${scheduledDate}`);
      return notificationIdentifier; 
    } catch (error) {
      console.error("Failed to schedule notification:", error);
      return null;
    }
  }

  // Edit an existing task (updated to handle new date/time)
  async function handleEditTask() {
    if (!editText.trim()) {
      Alert.alert("Validation", "Task cannot be empty.");
      return;
    }

    // Check if notification date is in the future
    if (editNotificationDate <= new Date()) {
      Alert.alert("Invalid Date", "Please select a future date and time for the notification.");
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
      
      // Schedule a new notification using the same task ID and new date/time
      const notificationId = await scheduleTaskNotification(
        editText,
        editTask.id,
        editNotificationDate
      );
      
      // Update the task (removed priority)
      const updatedTasks = tasks.map((task) =>
        task.id === editTask.id ? {
          ...task,
          text: editText,
          notificationId: notificationId,
          notificationDate: editNotificationDate.toISOString()
        } : task
      );
      
      // Update state and storage
      setTasks(updatedTasks);
      setEditTask(null);
      setEditText("");
      setModalVisible(false);
      await saveTasks(updatedTasks);
    } catch (error) {
      console.error("Error editing task:", error);
    }
  }

  // Handle date change for main screen
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(notificationDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setNotificationDate(newDate);
    }
  };

  // Handle time change for main screen
  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(notificationDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setNotificationDate(newDate);
    }
  };

  // Handle date change for edit modal
  const onEditDateChange = (event, selectedDate) => {
    setShowEditDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(editNotificationDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setEditNotificationDate(newDate);
    }
  };

  // Handle time change for edit modal
  const onEditTimeChange = (event, selectedTime) => {
    setShowEditTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(editNotificationDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setEditNotificationDate(newDate);
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

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

  // Render individual task items (updated to remove priority styling)
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
        ]}
      >
        <TouchableOpacity style={styles.taskContent} onPress={() => toggleTaskCompletion(item.id)}>
          <Text style={[
            styles.taskNumber,
            isDarkMode && styles.darkTaskNumber
          ]}>{index + 1}.</Text>
          <View style={styles.taskTextContainer}>
            <Text
              style={[
                styles.taskText,
                isDarkMode && styles.darkTaskText,
                item.completed && styles.completedTaskText,
              ]}
            >
              {item.text}
            </Text>
            {item.notificationDate && (
              <Text style={[
                styles.notificationDateText,
                isDarkMode && styles.darkNotificationDateText
              ]}>
                📅 {formatDate(new Date(item.notificationDate))}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setEditTask(item);
            setEditText(item.text);
            setEditNotificationDate(item.notificationDate ? new Date(item.notificationDate) : new Date(Date.now() + 60000));
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

        {/* Date and Time Selection Section */}
        <View style={[styles.dateTimeContainer, isDarkMode && styles.darkDateTimeContainer]}>
          <Text style={[styles.dateTimeLabel, isDarkMode && styles.darkDateTimeLabel]}>
            Notification Time:
          </Text>
          <View style={styles.dateTimeButtons}>
            <TouchableOpacity
              style={[styles.dateTimeButton, isDarkMode && styles.darkDateTimeButton]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateTimeButtonText, isDarkMode && styles.darkDateTimeButtonText]}>
                📅 {notificationDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateTimeButton, isDarkMode && styles.darkDateTimeButton]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={[styles.dateTimeButtonText, isDarkMode && styles.darkDateTimeButtonText]}>
                🕒 {notificationDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            </TouchableOpacity>
          </View>
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

        {/* Date/Time Pickers for main screen */}
        {showDatePicker && (
          <DateTimePicker
            value={notificationDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={notificationDate}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}

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
              
              {/* Date and Time Selection in Edit Modal */}
              <View style={[styles.dateTimeContainer, isDarkMode && styles.darkDateTimeContainer]}>
                <Text style={[styles.dateTimeLabel, isDarkMode && styles.darkDateTimeLabel]}>
                  Notification Time:
                </Text>
                <View style={styles.dateTimeButtons}>
                  <TouchableOpacity
                    style={[styles.dateTimeButton, isDarkMode && styles.darkDateTimeButton]}
                    onPress={() => setShowEditDatePicker(true)}
                  >
                    <Text style={[styles.dateTimeButtonText, isDarkMode && styles.darkDateTimeButtonText]}>
                      📅 {editNotificationDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dateTimeButton, isDarkMode && styles.darkDateTimeButton]}
                    onPress={() => setShowEditTimePicker(true)}
                  >
                    <Text style={[styles.dateTimeButtonText, isDarkMode && styles.darkDateTimeButtonText]}>
                      🕒 {editNotificationDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  </TouchableOpacity>
                </View>
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

          {/* Date/Time Pickers for edit modal */}
          {showEditDatePicker && (
            <DateTimePicker
              value={editNotificationDate}
              mode="date"
              display="default"
              onChange={onEditDateChange}
              minimumDate={new Date()}
            />
          )}

          {showEditTimePicker && (
            <DateTimePicker
              value={editNotificationDate}
              mode="time"
              display="default"
              onChange={onEditTimeChange}
            />
          )}
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

// Updated styles with new notification timing styles
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

  // Date and Time Selection Styles
  dateTimeContainer: {
    backgroundColor: "#FFFFFF",
    padding: width * 0.04,
    borderRadius: width * 0.03,
    marginBottom: height * 0.025,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  darkDateTimeContainer: {
    backgroundColor: "#1E1E1E",
  },
  dateTimeLabel: {
    fontSize: width * 0.045,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: height * 0.015,
  },
  darkDateTimeLabel: {
    color: "#FFFFFF",
  },
  dateTimeButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: "#007BFF",
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.04,
    borderRadius: width * 0.025,
    marginHorizontal: width * 0.01,
    alignItems: "center",
    elevation: 2,
  },
  darkDateTimeButton: {
    backgroundColor: "#2196F3",
  },
  dateTimeButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: width * 0.04,
  },
  darkDateTimeButtonText: {
    color: "#FFFFFF",
  },
  taskTextContainer: {
    flex: 1,
  },
  notificationDateText: {
    fontSize: width * 0.035,
    color: "#666",
    marginTop: height * 0.005,
  },
  darkNotificationDateText: {
    color: "#AAA",
  },

  // Task List Section
  taskListContainer: {
    flex: 0.95,
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
    backgroundColor: "rgba(0, 0, 0, 0.9)",
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

  // Notification Timing Button
  notificationTimingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: width * 0.04,
    borderRadius: width * 0.03,
    marginBottom: height * 0.025,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  darkNotificationTimingButton: {
    backgroundColor: "#1E1E1E",
    borderColor: "#555",
  },
  notificationTimingText: {
    fontSize: width * 0.045,
    color: "#2C3E50",
    fontWeight: "500",
  },
  darkNotificationTimingText: {
    color: "#FFFFFF",
  },
  dropdownArrow: {
    fontSize: width * 0.035,
    color: "#666",
  },

  // Task Text Container
  taskTextContainer: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: width * 0.035,
    color: "#666",
    marginTop: 2,
  },
  darkNotificationLabel: {
    color: "#AAA",
  },

  // Notification Modal Styles
  notificationModalContainer: {
    width: "85%",
    maxHeight: "70%",
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    padding: width * 0.05,
    borderRadius: width * 0.03,
    elevation: 15,
    borderTopWidth: 4,
    borderTopColor: "#007BFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
  },
  darkNotificationModalContainer: {
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    borderTopColor: "#2196F3",
  },
  notificationOptionsContainer: {
    maxHeight: height * 0.4,
    marginBottom: height * 0.02,
  },
  notificationOption: {
    padding: width * 0.04,
    borderRadius: width * 0.02,
    marginBottom: height * 0.01,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  darkNotificationOption: {
    backgroundColor: "#333",
    borderColor: "#555",
  },
  selectedNotificationOption: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  notificationOptionText: {
    fontSize: width * 0.042,
    color: "#2C3E50",
    textAlign: "center",
  },
  darkNotificationOptionText: {
    color: "#FFFFFF",
  },
  selectedNotificationOptionText: {
    color: "#FFFFFF",
    fontWeight: "600",
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
  },backgroundColor: "#2D2D2D",
  darkTaskText: {
    color: "#FFFFFF",
  },color: "#FFFFFF",
  darkTaskNumber: {
    color: "#AAAAAA",
  },color: "#AAAAAA",
  darkHighPriority: {
    backgroundColor: "#331111",
    borderLeftColor: "#E53935",
  },borderLeftColor: "#E53935",
  darkMediumPriority: {
    backgroundColor: "#332211",
    borderLeftColor: "#FF9800",
  },borderLeftColor: "#FF9800",
  darkLowPriority: {
    backgroundColor: "#113322",
    borderLeftColor: "#00897B",
  },borderLeftColor: "#00897B",
  darkModalWrapper: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },backgroundColor: "rgba(0, 0, 0, 0.9)",
  darkModalContainer: {
    backgroundColor: "#1E1E1E",
    borderTopColor: "#2196F3",
  },borderTopColor: "#2196F3",
  darkModalTitle: {
    color: "#FFFFFF",
  },color: "#FFFFFF",
  darkModalInput: {
    backgroundColor: "#333",
    borderColor: "#555",
        color: "#FFFFFF",
  },color: "#FFFFFF",
});
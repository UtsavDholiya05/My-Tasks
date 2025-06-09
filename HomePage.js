import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import PushNotification from 'react-native-push-notification';

export default function HomePage() {
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [priorityAnimation] = useState(new Animated.Value(1));
  const [editTask, setEditTask] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    PushNotification.configure({
      onNotification: function (notification) {
        console.log('Notification received:', notification);
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const storedTasks = await AsyncStorage.getItem('tasks');
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  async function saveTasks(updatedTasks) {
    try {
      await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Failed to save tasks:', error);
    }
  }

  function scheduleNotification(task) {
    PushNotification.localNotificationSchedule({
      title: 'Task Reminder',
      message: `Time to complete: ${task.text}`,
      date: new Date(Date.now() + 10 * 1000),
      allowWhileIdle: true,
    });
  }

  function cancelNotification(taskId) {
    PushNotification.cancelLocalNotifications({ id: taskId });
  }

  async function handleAddTask() {
    if (!taskText.trim()) {
      Alert.alert('Validation', 'Task cannot be empty.');
      return;
    }
    const newTask = {
      id: Date.now().toString(),
      text: taskText,
      priority,
      completed: false,
    };
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    setTaskText('');
    await saveTasks(updatedTasks);
    scheduleNotification(newTask);
  }

  async function handleEditTask() {
    if (!taskText.trim()) {
      Alert.alert('Validation', 'Task cannot be empty.');
      return;
    }
    const updatedTasks = tasks.map((task) =>
      task.id === editTask.id ? { ...task, text: taskText, priority } : task
    );
    setTasks(updatedTasks);
    setEditTask(null);
    setTaskText('');
    setModalVisible(false);
    await saveTasks(updatedTasks);
  }

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

  async function toggleTaskCompletion(taskId) {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);

    const task = tasks.find((task) => task.id === taskId);
    if (task.completed) {
      cancelNotification(taskId);
    }
  }

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
          item.priority === 'High' && styles.highPriorityBackground,
          item.priority === 'Medium' && styles.mediumPriorityBackground,
          item.priority === 'Low' && styles.lowPriorityBackground,
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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>
          {editTask ? 'Edit Task' : 'New Task'}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={editTask ? handleEditTask : handleAddTask}
        >
          <Text style={styles.addButtonText}>
            {editTask ? 'Save' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Task Title"
        value={taskText}
        onChangeText={setTaskText}
      />

      <View style={styles.priorityRow}>
        {['High', 'Medium', 'Low'].map((level) => (
          <Animated.View
            key={level}
            style={[
              styles.priorityButton,
              styles[level.toLowerCase()],
              { transform: [{ scale: priority === level ? priorityAnimation : 1 }] },
            ]}
          >
            <TouchableOpacity onPress={() => handlePrioritySelect(level)}>
              <Text style={styles.priorityText}>{level}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <Text style={styles.taskListHeading}>Added Tasks</Text>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.taskList}
      />

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
              {['High', 'Medium', 'Low'].map((level) => (
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
  );
}

const styles = StyleSheet.create({
  // Add all styles here (same as original code)
});
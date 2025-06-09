import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Notification handler (must be outside component)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function NotificationScreen() {
  const [notificationId, setNotificationId] = useState(null);

  // Ask for permission
  useEffect(() => {
    async function requestPermission() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission not granted for notifications');
      } else {
        console.log('Notification permission granted');
      }
    }

    requestPermission();
  }, []);

  // Schedule a notification and store its ID
  async function scheduleNotification(taskText) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Task Reminder',
          body: `Don't forget: ${taskText}`,
        },
        trigger: { seconds: 10 },
      });

      setNotificationId(id);
      await AsyncStorage.setItem('scheduledNotificationId', id);
      Alert.alert('Notification scheduled!');
    } catch (error) {
      console.log('Error scheduling notification:', error);
    }
  }

  // Cancel the scheduled notification
  async function cancelNotification() {
    try {
      const storedId = await AsyncStorage.getItem('scheduledNotificationId');
      if (storedId) {
        await Notifications.cancelScheduledNotificationAsync(storedId);
        await AsyncStorage.removeItem('scheduledNotificationId');
        setNotificationId(null);
        Alert.alert('Notification canceled');
      } else {
        Alert.alert('No notification to cancel');
      }
    } catch (error) {
      console.log('Error canceling notification:', error);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Screen</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => scheduleNotification('Your sample task!')}
      >
        <Text style={styles.buttonText}>Schedule Notification</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={cancelNotification}>
        <Text style={styles.buttonText}>Cancel Notification</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomePage from './screens/HomePage';
import * as Notifications from 'expo-notifications';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomePage} />

        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
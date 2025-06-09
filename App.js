import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import HomePage from './screens/HomePage';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HomePage />
    </GestureHandlerRootView>
  );
}


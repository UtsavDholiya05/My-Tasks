# My Tasks

A modern task management app built with React Native and Expo

![My Tasks App](https://drive.google.com/drive/folders/1WINiSzKOpBACPhCa_INuioldh_EOseug)

## About

My Tasks is a feature-rich task management application that combines simplicity with powerful functionality. Designed with a clean, intuitive interface, it helps users efficiently manage their daily tasks with customizable priority levels, notifications, and light/dark themes.


## Features

### Core Functionality
- ✅ **Task Creation**: Add new tasks with customizable text
- ✅ **Task Listing**: View all tasks in an organized, scrollable list  
- ✅ **Task Completion**: Mark tasks as complete with visual indicators
- ✅ **Task Deletion**: Swipe to delete unwanted tasks
- ✅ **Local Notifications**: Automatic reminders for pending tasks

### Enhanced Features
- ✅ **Data Persistence**: Tasks and settings saved between sessions using AsyncStorage
- ✅ **Task Editing**: Modify existing task text and properties
- ✅ **Priority Levels**: Assign High, Medium, or Low priority with color-coding
- ✅ **Dark Mode**: Toggle between light and dark themes
- ✅ **Notification Management**: Auto-cancellation of notifications for completed/deleted tasks
- ✅ **Animations**: Smooth, responsive UI animations for better user experience

## Technology Stack

- **React Native**: Core framework for cross-platform mobile development
- **Expo**: Development toolchain and runtime
- **AsyncStorage**: Local data persistence
- **React Native Gesture Handler**: Swipe actions implementation
- **Expo Notifications**: Task reminders and alerts

## Installation

1. Clone this repository
- git clone https://github.com/Utsoliya05/My-Tasks.git
 -cd My-Tasks

2. Install dependencies
- npm install
# or
- yarn install

3. Start the development server
- npx expo start

4. Run on your preferred platform:
- Scan the QR code with Expo Go app on Android
- Scan with Camera app on iOS
- Press 'a' for Android emulator or 'i' for iOS simulator

5. Development Challenges & Solutions

- Notification Handling
-The biggest challenge was ensuring proper notification management across the application lifecycle. When a task is deleted or edited, its associated notification needed to be properly canceled to prevent orphaned notifications.

Solution:
- Implemented a consistent ID system where each notification uses the same identifier as its associated task, allowing for reliable cancellation and tracking. Added an extra layer of protection with a listener that automatically dismisses notifications for deleted tasks.

- State Synchronization
-Maintaining consistent state between the UI, local storage, and notification system required careful coordination.

Solution: 
- Developed a clean state management approach using React hooks with proper async handling to ensure data integrity across all app components and services.

Dark Mode Implementation
- Creating a visually appealing dark mode that maintained usability while reducing eye strain.

Solution: 
- Designed a comprehensive theme system with carefully selected color palettes for both modes, including proper contrast ratios for text readability and thoughtful status bar integration.

Technical Implementation Details
- Task Data Structure
Each task is stored with the following properties:

- {
  id: string,            // Unique identifier (timestamp)
  text: string,          // Task description
  priority: string,      // "High", "Medium", or "Low"
  completed: boolean,    // Completion status
  notificationId: string // ID for associated notification
}

Notification System
- Notifications are scheduled using Expo's notification API with a 10-second delay for demonstration purposes. In a production app, this would be configured with more practical timing options.

UI/UX Considerations
- Responsive Design: All UI elements scale appropriately based on device dimensions
- Color Coding: Different colors for priority levels make task importance instantly recognizable
- Swipe Actions: Intuitive gesture-based interactions for common functions

Future Enhancements
- Task categories and labels
- Due dates with calendar integration
- Recurring tasks
- Search and filtering capabilities
- Cloud synchronization
- Task sharing and collaboration
- Analytics dashboard for task completion metrics

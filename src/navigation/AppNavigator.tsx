import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {HomeScreen} from '../screens/HomeScreen';
import {AddReminderScreen} from '../screens/AddReminderScreen';
import {ReminderDetailScreen} from '../screens/ReminderDetailScreen';
import {SettingsScreen} from '../screens/SettingsScreen';

const Stack = createStackNavigator();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="AddReminder"
          component={AddReminderScreen}
          options={{presentation: 'modal'}}
        />
        <Stack.Screen name="ReminderDetail" component={ReminderDetailScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {HomeScreen} from '../screens/HomeScreen';
import {AddReminderScreen} from '../screens/AddReminderScreen';
import {ReminderDetailScreen} from '../screens/ReminderDetailScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {ArchiveScreen} from '../screens/ArchiveScreen';
import {StatsScreen} from '../screens/StatsScreen';
import {LocationPickerScreen} from '../screens/LocationPickerScreen';

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
        <Stack.Screen name="Archive" component={ArchiveScreen} />
        <Stack.Screen name="Stats" component={StatsScreen} />
        <Stack.Screen name="LocationPicker" component={LocationPickerScreen} options={{presentation: 'modal'}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

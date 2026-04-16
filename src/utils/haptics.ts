import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const options = {enableVibrateFallback: true, ignoreAndroidSystemSettings: false};

export const haptics = {
  light: () => ReactNativeHapticFeedback.trigger('impactLight', options),
  medium: () => ReactNativeHapticFeedback.trigger('impactMedium', options),
  heavy: () => ReactNativeHapticFeedback.trigger('impactHeavy', options),
  success: () => ReactNativeHapticFeedback.trigger('notificationSuccess', options),
  warning: () => ReactNativeHapticFeedback.trigger('notificationWarning', options),
  error: () => ReactNativeHapticFeedback.trigger('notificationError', options),
};

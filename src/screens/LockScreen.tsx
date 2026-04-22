import React, {useEffect, useRef, useState} from 'react';
import {
  Animated, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ReactNativeBiometrics, {BiometryTypes} from 'react-native-biometrics';
import {useTheme} from '../theme/ThemeContext';
import {Spacing} from '../theme';

interface Props {
  onUnlock: () => void;
}

const rnBiometrics = new ReactNativeBiometrics();

export function LockScreen({onUnlock}: Props) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const [biometryType, setBiometryType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {toValue: 1, duration: 400, useNativeDriver: true}).start();
    rnBiometrics.isSensorAvailable().then(({available, biometryType: type}) => {
      setBiometryType(available ? (type ?? 'Biometrics') : 'DeviceCredential');
      authenticate();
    });
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {toValue: 10, duration: 60, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: -10, duration: 60, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 6, duration: 60, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 0, duration: 60, useNativeDriver: true}),
    ]).start();
  };

  const authenticate = async () => {
    setError(null);
    try {
      const {success} = await rnBiometrics.simplePrompt({
        promptMessage: 'Войти в TickTack',
        cancelButtonText: 'Отмена',
        allowDeviceCredentials: true,
      });
      if (success) {
        onUnlock();
      } else {
        setError('Аутентификация отменена');
        shake();
      }
    } catch {
      setError('Попробуй ещё раз');
      shake();
    }
  };

  const biometryLabel =
    biometryType === BiometryTypes.FaceID ? 'Face ID' :
    biometryType === BiometryTypes.TouchID ? 'Touch ID' :
    'Разблокировать';

  const biometryIcon =
    biometryType === BiometryTypes.FaceID ? '⬡' : '◉';

  return (
    <Animated.View style={[styles.bg, {backgroundColor: colors.bg, opacity: fadeIn}]}>
      <View style={[styles.content, {paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40}]}>
        <Animated.View style={{transform: [{translateX: shakeAnim}]}}>
          <Text style={[styles.appName, {color: colors.textPrimary}]}>TickTack</Text>
          <Text style={[styles.subtitle, {color: colors.textMuted}]}>Разблокируй чтобы войти</Text>
        </Animated.View>

        {error && (
          <Text style={[styles.error, {color: colors.priorityHigh}]}>{error}</Text>
        )}

        <TouchableOpacity style={styles.bioBtn} onPress={authenticate}>
          <Text style={[styles.bioIcon, {color: colors.accent}]}>{biometryIcon}</Text>
          <Text style={[styles.bioLabel, {color: colors.textSecondary}]}>{biometryLabel}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bg: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
  },
  bioBtn: {
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.xl,
  },
  bioIcon: {fontSize: 56},
  bioLabel: {fontSize: 15},
  noBio: {fontSize: 14, textAlign: 'center', paddingHorizontal: 40},
  bypassBtn: {marginTop: 16, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24},
  bypassLabel: {fontSize: 16, fontWeight: '600'},
});

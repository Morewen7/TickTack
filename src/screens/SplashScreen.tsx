import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {TTLogo} from '../components/TTLogo';

interface Props {
  onFinish: () => void;
}

export function SplashScreen({onFinish}: Props) {
  const {colors} = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Появление
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      // Пауза
      Animated.delay(800),
      // Исчезновение
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View
      style={[styles.container, {backgroundColor: colors.bg, opacity: fadeOut}]}>
      <Animated.View style={[styles.content, {opacity, transform: [{scale}]}]}>
        <TTLogo size={80} color={colors.textPrimary} />
        <Text style={[styles.sub, {color: colors.textMuted}]}>TickTack</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  content: {alignItems: 'center'},
  sub: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: 8,
    textTransform: 'uppercase',
  },
});

import React, {useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {haptics} from '../utils/haptics';
import {TTLogo} from '../components/TTLogo';

const {width} = Dimensions.get('window');

export const ONBOARDING_KEY = '@ticktack_onboarded';

const slides = [
  {
    icon: null,
    title: 'TickTack',
    subtitle: 'Минималистичный планировщик,\nкоторый не отвлекает',
  },
  {
    icon: null,
    iconText: '≡',
    title: 'Списки и приоритеты',
    subtitle: 'Разбивай задачи по категориям,\nрасставляй важность',
  },
  {
    icon: null,
    iconText: '◎',
    title: 'Уведомления',
    subtitle: 'Ничего не забудешь — напомним\nв нужный момент',
  },
];

interface Props {
  onFinish: () => void;
}

export function OnboardingScreen({onFinish}: Props) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);

  const goNext = () => {
    haptics.light();
    if (current < slides.length - 1) {
      const next = current + 1;
      setCurrent(next);
      scrollRef.current?.scrollTo({x: next * width, animated: true});
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    haptics.success();
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onFinish();
  };

  const skip = () => {
    haptics.light();
    handleFinish();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.skipBtn, {top: insets.top + 16}]}
        onPress={skip}>
        <Text style={styles.skipText}>Пропустить</Text>
      </TouchableOpacity>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {x: scrollX}}}],
          {useNativeDriver: false},
        )}>
        {slides.map((slide, i) => (
          <View key={i} style={[styles.slide, {paddingBottom: insets.bottom + 140}]}>
            {i === 0 ? (
              <View style={styles.logoBox}>
                <TTLogo size={72} color="#ffffff" />
              </View>
            ) : (
              <Text style={styles.iconText}>{slide.iconText}</Text>
            )}
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </Animated.ScrollView>

      {/* Dots */}
      <View style={[styles.dotsRow, {bottom: insets.bottom + 90}]}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === current && styles.dotActive]}
          />
        ))}
      </View>

      {/* Button */}
      <TouchableOpacity
        style={[styles.btn, {bottom: insets.bottom + 32}]}
        onPress={goNext}>
        <Text style={styles.btnText}>
          {current === slides.length - 1 ? 'Начать' : 'Далее'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111111',
    zIndex: 100,
  },
  skipBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 15,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoBox: {
    marginBottom: 32,
  },
  iconText: {
    fontSize: 64,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 32,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: '#ffffff',
    width: 20,
  },
  btn: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#111111',
    fontSize: 17,
    fontWeight: '700',
  },
});

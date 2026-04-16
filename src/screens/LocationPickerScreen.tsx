import React, {useState} from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StatusBar,
  StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassCard} from '../components/GlassCard';
import {Radius, Spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {getCurrentLocation, requestLocationPermission} from '../utils/geolocation';
import {haptics} from '../utils/haptics';
import {ReminderLocation} from '../store/remindersStore';

interface Props {
  navigation: any;
  route: any;
}

const RADIUS_OPTIONS = [100, 200, 500, 1000];

export function LocationPickerScreen({navigation, route}: Props) {
  const {colors, mode} = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [radius, setRadius] = useState(200);
  const [onArrive, setOnArrive] = useState(true);
  const [locationName, setLocationName] = useState('');

  const onSave = route.params?.onSave as (loc: ReminderLocation) => void;

  const pickCurrentLocation = async () => {
    setLoading(true);
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert('Нет доступа', 'Разреши доступ к геолокации в настройках');
      setLoading(false);
      return;
    }
    try {
      const pos = await getCurrentLocation();
      setLocation(pos);
      setLocationName('Текущее место');
      haptics.success();
    } catch {
      Alert.alert('Ошибка', 'Не удалось получить местоположение');
    }
    setLoading(false);
  };

  const handleSave = () => {
    if (!location) return;
    haptics.success();
    onSave({
      ...location,
      radius,
      name: locationName || 'Моё место',
      onArrive,
    });
    navigation.goBack();
  };

  return (
    <View style={[styles.bg, {backgroundColor: colors.bg}]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl}]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => { haptics.light(); navigation.goBack(); }}>
            <Text style={[styles.navBack, {color: colors.textSecondary}]}>← Назад</Text>
          </TouchableOpacity>
          <Text style={[styles.navTitle, {color: colors.textPrimary}]}>Место</Text>
          <TouchableOpacity onPress={handleSave} disabled={!location}>
            <Text style={[styles.saveBtn, {color: location ? colors.accent : colors.textMuted}]}>Готово</Text>
          </TouchableOpacity>
        </View>

        <GlassCard style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={pickCurrentLocation} disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.accent} />
              : <Text style={[styles.locationBtn, {color: colors.accent}]}>
                  {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : '+ Использовать текущее место'}
                </Text>
            }
          </TouchableOpacity>
        </GlassCard>

        {location && (
          <>
            <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Радиус срабатывания</Text>
            <GlassCard style={styles.card}>
              <View style={styles.radiusRow}>
                {RADIUS_OPTIONS.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.radiusBtn, {
                      backgroundColor: radius === r ? colors.accent : colors.bgSecondary,
                      borderColor: radius === r ? colors.accent : colors.cardBorder,
                    }]}
                    onPress={() => setRadius(r)}>
                    <Text style={[styles.radiusText, {color: radius === r ? colors.bg : colors.textSecondary}]}>
                      {r >= 1000 ? `${r / 1000} км` : `${r} м`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>

            <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Триггер</Text>
            <GlassCard style={styles.card}>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>При прибытии</Text>
                <Switch
                  value={onArrive}
                  onValueChange={setOnArrive}
                  trackColor={{false: colors.switchTrack, true: colors.accent}}
                  thumbColor="#fff"
                />
              </View>
              {!onArrive && (
                <Text style={[styles.hint, {color: colors.textMuted}]}>
                  Напомнит когда покинешь это место
                </Text>
              )}
            </GlassCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {flex: 1},
  scroll: {paddingHorizontal: Spacing.md},
  nav: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg},
  navBack: {fontSize: 16},
  navTitle: {fontSize: 17, fontWeight: '600'},
  saveBtn: {fontSize: 16, fontWeight: '600'},
  card: {marginBottom: Spacing.lg},
  sectionLabel: {fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginLeft: Spacing.xs},
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 14},
  rowLabel: {fontSize: 16},
  locationBtn: {fontSize: 15, paddingHorizontal: Spacing.md, paddingVertical: 14},
  radiusRow: {flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md},
  radiusBtn: {flex: 1, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center'},
  radiusText: {fontSize: 13, fontWeight: '600'},
  hint: {fontSize: 13, paddingHorizontal: Spacing.md, paddingBottom: 10},
});

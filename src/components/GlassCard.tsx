import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {Radius} from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlassCard({children, style}: Props) {
  const {colors, mode} = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          shadowColor: mode === 'dark' ? '#000' : '#000',
          shadowOpacity: mode === 'dark' ? 0.4 : 0.1,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 20,
    elevation: 5,
  },
});

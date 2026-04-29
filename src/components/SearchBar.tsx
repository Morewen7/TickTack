import React from 'react';
import {
  Animated,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../theme/ThemeContext';

interface SearchBarProps {
  searchVisible: boolean;
  searchQuery: string;
  searchHeight: Animated.AnimatedInterpolation<number>;
  onChangeText: (text: string) => void;
  onClear: () => void;
}

export function SearchBar({
  searchVisible,
  searchQuery,
  searchHeight,
  onChangeText,
  onClear,
}: SearchBarProps) {
  const {colors} = useTheme();

  return (
    <Animated.View
      style={[
        styles.searchContainer,
        {height: searchHeight, overflow: 'hidden'},
      ]}>
      <View
        style={[
          styles.searchBox,
          {backgroundColor: colors.card, borderColor: colors.cardBorder},
        ]}>
        <Icon name="search" size={14} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, {color: colors.textPrimary}]}
          placeholder="Поиск..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={onChangeText}
          autoFocus={searchVisible}
          testID="search-input"
          accessibilityLabel="Поиск напоминаний"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={onClear}>
            <Icon name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
});

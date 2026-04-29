import React, {useRef} from 'react';
import {
  Animated,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../theme/ThemeContext';

interface QuickAddModalProps {
  visible: boolean;
  quickTitle: string;
  quickAddY: Animated.AnimatedInterpolation<number>;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function QuickAddModal({
  visible,
  quickTitle,
  quickAddY,
  onChangeText,
  onSubmit,
  onClose,
}: QuickAddModalProps) {
  const {colors} = useTheme();
  const quickInputRef = useRef<TextInput>(null);

  if (!visible) {return null;}

  return (
    <Animated.View
      style={[
        styles.quickAddModal,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          transform: [{translateY: quickAddY}],
        },
      ]}>
      <View style={styles.quickAddHeader}>
        <Text style={[styles.quickAddTitle, {color: colors.textPrimary}]}>
          Быстрое добавление
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <TextInput
        ref={quickInputRef}
        style={[
          styles.quickAddInput,
          {color: colors.textPrimary, borderColor: colors.cardBorder},
        ]}
        placeholder="Название задачи..."
        placeholderTextColor={colors.textMuted}
        value={quickTitle}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="done"
        autoFocus
      />
      <TouchableOpacity
        style={[styles.quickAddBtn, {backgroundColor: colors.accent}]}
        onPress={onSubmit}>
        <Text style={[styles.quickAddBtnText, {color: colors.bg}]}>
          Добавить
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  quickAddModal: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quickAddHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickAddTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  quickAddInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  quickAddBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickAddBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

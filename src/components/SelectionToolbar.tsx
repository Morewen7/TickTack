import React from 'react';
import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../theme/ThemeContext';
import {haptics} from '../utils/haptics';

interface SelectionToolbarProps {
  selectedCount: number;
  onComplete: () => void;
  onArchive: () => void;
  onMove: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function SelectionToolbar({
  selectedCount,
  onComplete,
  onArchive,
  onMove,
  onDelete,
  onCancel,
}: SelectionToolbarProps) {
  const {colors} = useTheme();

  return (
    <View
      style={[
        styles.selectionBar,
        {backgroundColor: colors.card, borderTopColor: colors.cardBorder},
      ]}>
      <Text style={[styles.selectionText, {color: colors.textPrimary}]}>
        Выбрано: {selectedCount}
      </Text>
      <View style={styles.selectionActions}>
        <TouchableOpacity
          style={[styles.selectionBtn, {backgroundColor: colors.accent + '22'}]}
          onPress={() => {
            haptics.success();
            onComplete();
          }}>
          <Icon
            name="checkmark-circle-outline"
            size={18}
            color={colors.accent}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.selectionBtn,
            {backgroundColor: colors.textSecondary + '22'},
          ]}
          onPress={() => {
            haptics.light();
            onArchive();
          }}>
          <Icon name="archive-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.selectionBtn,
            {backgroundColor: colors.textSecondary + '22'},
          ]}
          onPress={() => {
            haptics.light();
            onMove();
          }}>
          <Icon name="folder-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.selectionBtn,
            {backgroundColor: colors.priorityHigh + '22'},
          ]}
          onPress={() => {
            haptics.warning();
            onDelete();
          }}>
          <Icon name="trash-outline" size={18} color={colors.priorityHigh} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.selectionBtn,
            {backgroundColor: colors.textMuted + '22'},
          ]}
          onPress={() => {
            haptics.light();
            onCancel();
          }}>
          <Icon name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

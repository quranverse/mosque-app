import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Animated,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../utils/theme';

const IslamicDropdown = ({
  label,
  value,
  onSelect,
  options = [],
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  error,
  style = {},
  labelStyle = {},
  errorStyle = {},
  searchable = false,
  multiple = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [labelAnimation] = useState(new Animated.Value(value ? 1 : 0));

  const filteredOptions = searchable 
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchText.toLowerCase())
      )
    : options;

  const handleSelect = (option) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const isSelected = currentValues.some(v => v.value === option.value);
      
      if (isSelected) {
        onSelect(currentValues.filter(v => v.value !== option.value));
      } else {
        onSelect([...currentValues, option]);
      }
    } else {
      onSelect(option);
      setIsOpen(false);
    }
  };

  const getDisplayValue = () => {
    if (multiple && Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      if (value.length === 1) return value[0].label;
      return `${value.length} items selected`;
    }
    
    return value ? value.label : placeholder;
  };

  const getContainerStyle = () => {
    const baseStyle = [styles.container];
    
    if (error) {
      baseStyle.push(styles.error);
    }
    
    if (disabled) {
      baseStyle.push(styles.disabled);
    }
    
    return [...baseStyle, style];
  };

  const renderOption = ({ item }) => {
    const isSelected = multiple 
      ? Array.isArray(value) && value.some(v => v.value === item.value)
      : value && value.value === item.value;

    return (
      <TouchableOpacity
        style={[styles.option, isSelected && styles.selectedOption]}
        onPress={() => handleSelect(item)}
      >
        <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
          {item.label}
        </Text>
        {isSelected && (
          <Icon name="check" size={20} color={Colors.primary.main} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}{required && ' *'}
        </Text>
      )}
      
      <TouchableOpacity
        style={getContainerStyle()}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
      >
        <Text style={[
          styles.displayText,
          !value && styles.placeholderText
        ]}>
          {getDisplayValue()}
        </Text>
        
        <Icon 
          name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
          size={24} 
          color={disabled ? Colors.text.disabled : Colors.text.secondary}
        />
      </TouchableOpacity>
      
      {error && (
        <Text style={[styles.errorText, errorStyle]}>
          {error}
        </Text>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {label || 'Select Option'}
              </Text>
              <TouchableOpacity 
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            {searchable && (
              <View style={styles.searchContainer}>
                <Icon name="search" size={20} color={Colors.text.secondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholderTextColor={Colors.text.hint}
                />
              </View>
            )}
            
            <FlatList
              data={filteredOptions}
              renderItem={renderOption}
              keyExtractor={(item) => item.value.toString()}
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
            />
            
            {multiple && (
              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.doneButton}
                  onPress={() => setIsOpen(false)}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.weights.medium,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  error: {
    borderColor: Colors.status.error,
    borderWidth: 2,
  },
  disabled: {
    backgroundColor: Colors.neutral.background,
    opacity: 0.6,
  },
  displayText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
  },
  placeholderText: {
    color: Colors.text.hint,
  },
  errorText: {
    fontSize: Typography.sizes.sm,
    color: Colors.status.error,
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.neutral.surface,
    borderRadius: BorderRadius.lg,
    width: '100%',
    maxHeight: '80%',
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutral.background,
    borderRadius: BorderRadius.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.divider,
  },
  selectedOption: {
    backgroundColor: Colors.primary.surface,
  },
  optionText: {
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
    flex: 1,
  },
  selectedOptionText: {
    color: Colors.primary.main,
    fontWeight: Typography.weights.medium,
  },
  modalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
  },
  doneButton: {
    backgroundColor: Colors.primary.main,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  doneButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
});

export default IslamicDropdown;

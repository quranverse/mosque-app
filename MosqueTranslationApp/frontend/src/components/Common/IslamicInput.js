import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Animated 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, ComponentThemes } from '../../utils/theme';

const IslamicInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  maxLength,
  error,
  required = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style = {},
  inputStyle = {},
  labelStyle = {},
  errorStyle = {},
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [labelAnimation] = useState(new Animated.Value(value ? 1 : 0));

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(labelAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();

    // Scroll to input when focused (if onFocus prop is provided)
    if (props.onFocus) {
      props.onFocus();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(labelAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getContainerStyle = () => {
    const baseStyle = [styles.container];
    
    if (isFocused) {
      baseStyle.push(styles.focused);
    }
    
    if (error) {
      baseStyle.push(styles.error);
    }
    
    if (disabled) {
      baseStyle.push(styles.disabled);
    }
    
    return [...baseStyle, style];
  };

  const getInputStyle = () => {
    const baseStyle = [styles.input];
    
    if (multiline) {
      baseStyle.push(styles.multilineInput);
    }
    
    if (leftIcon) {
      baseStyle.push(styles.inputWithLeftIcon);
    }
    
    if (rightIcon || secureTextEntry) {
      baseStyle.push(styles.inputWithRightIcon);
    }
    
    return [...baseStyle, inputStyle];
  };

  const animatedLabelStyle = {
    position: 'absolute',
    left: leftIcon ? 40 : Spacing.md,
    top: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [multiline ? 16 : 12, -8],
    }),
    fontSize: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [Typography.sizes.base, Typography.sizes.sm],
    }),
    color: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [Colors.text.secondary, isFocused ? Colors.primary.main : Colors.text.secondary],
    }),
    backgroundColor: Colors.neutral.surface,
    paddingHorizontal: 4,
    zIndex: 1,
  };

  return (
    <View style={styles.wrapper}>
      {label && (
        <Animated.Text style={[animatedLabelStyle, labelStyle]}>
          {label}{required && ' *'}
        </Animated.Text>
      )}
      
      <View style={getContainerStyle()}>
        {leftIcon && (
          <Icon 
            name={leftIcon} 
            size={20} 
            color={isFocused ? Colors.primary.main : Colors.text.secondary}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={getInputStyle()}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.hint}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity 
            onPress={togglePasswordVisibility}
            style={styles.rightIcon}
          >
            <Icon 
              name={showPassword ? 'visibility-off' : 'visibility'} 
              size={20} 
              color={Colors.text.secondary}
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity 
            onPress={onRightIconPress}
            style={styles.rightIcon}
          >
            <Icon 
              name={rightIcon} 
              size={20} 
              color={isFocused ? Colors.primary.main : Colors.text.secondary}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={[styles.errorText, errorStyle]}>
          {error}
        </Text>
      )}
      
      {maxLength && (
        <Text style={styles.characterCount}>
          {value ? value.length : 0}/{maxLength}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral.surface,
    minHeight: ComponentThemes.input.height,
  },
  focused: {
    borderColor: Colors.primary.main,
    borderWidth: 2,
  },
  error: {
    borderColor: Colors.status.error,
    borderWidth: 2,
  },
  disabled: {
    backgroundColor: Colors.neutral.background,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
    textAlignVertical: 'top',
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: Spacing.lg,
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: Spacing.sm,
  },
  leftIcon: {
    marginLeft: Spacing.md,
  },
  rightIcon: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.sizes.sm,
    color: Colors.status.error,
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  characterCount: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.hint,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
});

export default IslamicInput;

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../utils/theme';

const IslamicButton = ({
  title,
  onPress,
  variant = 'primary', // 'primary', 'secondary', 'outline', 'ghost', 'prayer'
  size = 'md', // 'sm', 'md', 'lg', 'xl'
  icon = null,
  iconPosition = 'left', // 'left', 'right'
  loading = false,
  disabled = false,
  gradient = false,
  style = {},
  textStyle = {},
  ...props
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[`size_${size}`]];
    
    if (disabled) {
      baseStyle.push(styles.disabled);
    } else {
      baseStyle.push(styles[`variant_${variant}`]);
    }
    
    return [...baseStyle, style];
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`textSize_${size}`]];
    
    if (disabled) {
      baseStyle.push(styles.disabledText);
    } else {
      baseStyle.push(styles[`textVariant_${variant}`]);
    }
    
    return [...baseStyle, textStyle];
  };

  const renderContent = () => (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator 
          size={size === 'sm' ? 'small' : 'small'} 
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary.main : Colors.text.inverse} 
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Icon 
              name={icon} 
              size={getIconSize(size)} 
              color={getIconColor(variant, disabled)}
              style={styles.iconLeft}
            />
          )}
          <Text style={getTextStyle()}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Icon 
              name={icon} 
              size={getIconSize(size)} 
              color={getIconColor(variant, disabled)}
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </View>
  );

  if (gradient && variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        disabled={disabled || loading}
        activeOpacity={0.8}
        {...props}
      >
        <LinearGradient
          colors={[Colors.primary.main, Colors.primary.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={getButtonStyle()}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={getButtonStyle()}
      onPress={onPress} 
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

// Specialized Islamic button variants
const PrayerButton = ({ prayerName, time, isNext = false, ...props }) => (
  <IslamicButton
    title={`${prayerName} - ${time}`}
    variant={isNext ? 'prayer' : 'outline'}
    icon="schedule"
    size="lg"
    {...props}
  />
);

const QiblaButton = ({ accuracy = 'far', ...props }) => (
  <IslamicButton
    title="Find Qibla"
    variant="primary"
    icon="explore"
    gradient={accuracy === 'perfect'}
    {...props}
  />
);

const TranslationButton = ({ isLive = false, ...props }) => (
  <IslamicButton
    title={isLive ? 'Join Live Translation' : 'Start Translation'}
    variant={isLive ? 'secondary' : 'primary'}
    icon={isLive ? 'live-tv' : 'translate'}
    gradient={isLive}
    {...props}
  />
);

const getIconSize = (size) => {
  switch (size) {
    case 'sm': return 16;
    case 'md': return 18;
    case 'lg': return 20;
    case 'xl': return 24;
    default: return 18;
  }
};

const getIconColor = (variant, disabled) => {
  if (disabled) return Colors.text.disabled;
  
  switch (variant) {
    case 'primary':
    case 'secondary':
    case 'prayer':
      return Colors.text.inverse;
    case 'outline':
    case 'ghost':
      return Colors.primary.main;
    default:
      return Colors.text.inverse;
  }
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  
  // Size variants
  size_sm: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 32,
  },
  size_md: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 40,
  },
  size_lg: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    minHeight: 48,
  },
  size_xl: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
    minHeight: 56,
  },
  
  // Text size variants
  textSize_sm: {
    fontSize: Typography.sizes.sm,
  },
  textSize_md: {
    fontSize: Typography.sizes.base,
  },
  textSize_lg: {
    fontSize: Typography.sizes.lg,
  },
  textSize_xl: {
    fontSize: Typography.sizes.xl,
  },
  
  // Color variants
  variant_primary: {
    backgroundColor: Colors.primary.main,
  },
  variant_secondary: {
    backgroundColor: Colors.secondary.main,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary.main,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_prayer: {
    backgroundColor: Colors.prayer.current,
  },
  
  // Text color variants
  textVariant_primary: {
    color: Colors.text.inverse,
  },
  textVariant_secondary: {
    color: Colors.text.inverse,
  },
  textVariant_outline: {
    color: Colors.primary.main,
  },
  textVariant_ghost: {
    color: Colors.primary.main,
  },
  textVariant_prayer: {
    color: Colors.text.inverse,
  },
  
  // Disabled state
  disabled: {
    backgroundColor: Colors.neutral.border,
    borderColor: Colors.neutral.border,
  },
  disabledText: {
    color: Colors.text.disabled,
  },
});

export default IslamicButton;
export { PrayerButton, QiblaButton, TranslationButton };

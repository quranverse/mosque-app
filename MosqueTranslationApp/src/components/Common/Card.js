import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

const Card = ({ 
  children, 
  style = {}, 
  onPress = null,
  elevation = 2,
  borderRadius = 10,
  padding = 15,
  margin = 0,
  backgroundColor = '#fff',
}) => {
  const cardStyle = [
    styles.card,
    {
      elevation,
      borderRadius,
      padding,
      margin,
      backgroundColor,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: 0.1,
      shadowRadius: elevation,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    // Base card styles are applied dynamically
  },
});

export default Card;

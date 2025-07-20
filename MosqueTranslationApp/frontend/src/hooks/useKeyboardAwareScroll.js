import { useEffect, useRef } from 'react';
import { Keyboard, Platform } from 'react-native';

const useKeyboardAwareScroll = () => {
  const scrollViewRef = useRef(null);
  const currentInputRef = useRef(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      handleKeyboardShow
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleKeyboardShow = (event) => {
    if (currentInputRef.current && scrollViewRef.current) {
      // Delay to ensure the input is focused
      setTimeout(() => {
        currentInputRef.current.measureInWindow((x, y, width, height) => {
          const keyboardHeight = event.endCoordinates.height;
          const screenHeight = event.endCoordinates.screenY;
          const inputBottom = y + height;
          
          // Check if input is hidden behind keyboard
          if (inputBottom > screenHeight - keyboardHeight) {
            const scrollOffset = inputBottom - (screenHeight - keyboardHeight) + 50; // 50px padding
            scrollViewRef.current.scrollTo({
              y: scrollOffset,
              animated: true,
            });
          }
        });
      }, 100);
    }
  };

  const handleKeyboardHide = () => {
    // Optional: scroll back to top or maintain position
  };

  const handleInputFocus = (inputRef) => {
    currentInputRef.current = inputRef;
  };

  return {
    scrollViewRef,
    handleInputFocus,
  };
};

export default useKeyboardAwareScroll;

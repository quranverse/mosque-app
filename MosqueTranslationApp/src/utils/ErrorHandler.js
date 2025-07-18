// Error Handler Utility for Mosque Translation App
import { Alert } from 'react-native';

class ErrorHandler {
  /**
   * Handle API errors with user-friendly messages
   */
  static handleApiError(error, context = 'API request') {
    console.error(`${context} error:`, error);

    let userMessage = 'An unexpected error occurred. Please try again.';
    let shouldShowAlert = true;

    // Safely get error message
    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    // Network errors
    if (errorMessage.includes('Network request failed') ||
        errorMessage.includes('fetch')) {
      userMessage = 'Network error. Please check your internet connection and try again.';
    }
    // Timeout errors
    else if (errorMessage.includes('timeout') ||
             errorMessage.includes('Request timeout')) {
      userMessage = 'Request timed out. Please check your connection and try again.';
    }
    // Authentication errors
    else if (errorMessage.includes('401') ||
             errorMessage.includes('Unauthorized') ||
             errorMessage.includes('Authentication failed')) {
      userMessage = 'Authentication failed. Please log in again.';
    }
    // Forbidden errors
    else if (errorMessage.includes('403') ||
             errorMessage.includes('Forbidden')) {
      userMessage = 'You don\'t have permission to perform this action.';
    }
    // Not found errors
    else if (errorMessage.includes('404') ||
             errorMessage.includes('Not found')) {
      userMessage = 'The requested resource was not found.';
    }
    // Server errors
    else if (errorMessage.includes('500') ||
             errorMessage.includes('Internal Server Error')) {
      userMessage = 'Server error. Please try again later.';
    }
    // Validation errors
    else if (errorMessage.includes('Validation failed') ||
             errorMessage.includes('validation')) {
      userMessage = errorMessage; // Use the specific validation message
    }
    // Custom error messages from API
    else if (errorMessage && !errorMessage.includes('TypeError')) {
      userMessage = errorMessage;
    }

    return {
      userMessage,
      shouldShowAlert,
      originalError: error
    };
  }

  /**
   * Show error alert to user
   */
  static showErrorAlert(error, title = 'Error', context = 'operation') {
    const { userMessage } = this.handleApiError(error, context);
    
    Alert.alert(
      title,
      userMessage,
      [{ text: 'OK', style: 'default' }],
      { cancelable: true }
    );
  }

  /**
   * Handle location errors
   */
  static handleLocationError(error) {
    console.error('Location error:', error);

    let userMessage = 'Unable to get your location. Please enable location services.';

    if (error.code === 1) { // PERMISSION_DENIED
      userMessage = 'Location permission denied. Please enable location access in your device settings.';
    } else if (error.code === 2) { // POSITION_UNAVAILABLE
      userMessage = 'Location unavailable. Please check your GPS settings.';
    } else if (error.code === 3) { // TIMEOUT
      userMessage = 'Location request timed out. Please try again.';
    }

    return {
      userMessage,
      shouldShowAlert: true,
      originalError: error
    };
  }

  /**
   * Handle authentication errors specifically
   */
  static handleAuthError(error, context = 'authentication') {
    console.error(`${context} error:`, error);

    let userMessage = 'Authentication failed. Please try again.';
    let shouldLogout = false;

    // Safely get error message
    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    if (errorMessage.includes('Invalid email or password')) {
      userMessage = 'Invalid email or password. Please check your credentials.';
    } else if (errorMessage.includes('Email not verified')) {
      userMessage = 'Please verify your email address before logging in.';
    } else if (errorMessage.includes('Account deactivated')) {
      userMessage = 'Your account has been deactivated. Please contact support.';
    } else if (errorMessage.includes('Token expired') ||
               errorMessage.includes('Invalid token')) {
      userMessage = 'Your session has expired. Please log in again.';
      shouldLogout = true;
    }

    return {
      userMessage,
      shouldShowAlert: true,
      shouldLogout,
      originalError: error
    };
  }

  /**
   * Handle mosque-related errors
   */
  static handleMosqueError(error, context = 'mosque operation') {
    console.error(`${context} error:`, error);

    let userMessage = 'Unable to complete mosque operation. Please try again.';

    // Safely get error message
    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    if (errorMessage.includes('Mosque not found')) {
      userMessage = 'Mosque not found. It may have been removed or is no longer available.';
    } else if (errorMessage.includes('Already following')) {
      userMessage = 'You are already following this mosque.';
    } else if (errorMessage.includes('Not following')) {
      userMessage = 'You are not following this mosque.';
    } else if (errorMessage.includes('No mosques found')) {
      userMessage = 'No mosques found in your area. Try expanding your search radius.';
    }

    return {
      userMessage,
      shouldShowAlert: true,
      originalError: error
    };
  }

  /**
   * Handle translation session errors
   */
  static handleSessionError(error, context = 'translation session') {
    console.error(`${context} error:`, error);

    let userMessage = 'Unable to connect to translation session. Please try again.';

    // Safely get error message
    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    if (errorMessage.includes('Session not found')) {
      userMessage = 'Translation session not found. It may have ended.';
    } else if (errorMessage.includes('Session ended')) {
      userMessage = 'The translation session has ended.';
    } else if (errorMessage.includes('Connection failed')) {
      userMessage = 'Failed to connect to translation session. Please check your internet connection.';
    } else if (errorMessage.includes('Permission denied')) {
      userMessage = 'You don\'t have permission to join this session.';
    }

    return {
      userMessage,
      shouldShowAlert: true,
      originalError: error
    };
  }

  /**
   * Handle file upload errors
   */
  static handleUploadError(error, context = 'file upload') {
    console.error(`${context} error:`, error);

    let userMessage = 'File upload failed. Please try again.';

    // Safely get error message
    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    if (errorMessage.includes('File too large')) {
      userMessage = 'File is too large. Please choose a smaller file.';
    } else if (errorMessage.includes('Invalid file type')) {
      userMessage = 'Invalid file type. Please choose a supported file format.';
    } else if (errorMessage.includes('Upload timeout')) {
      userMessage = 'Upload timed out. Please check your connection and try again.';
    }

    return {
      userMessage,
      shouldShowAlert: true,
      originalError: error
    };
  }

  /**
   * Log error for debugging (in development)
   */
  static logError(error, context = 'application', additionalInfo = {}) {
    if (__DEV__) {
      console.group(`🚨 Error in ${context}`);
      console.error('Error:', error);
      console.log('Additional Info:', additionalInfo);
      console.log('Stack:', error?.stack || 'No stack trace available');
      console.groupEnd();
    }
  }

  /**
   * Create a standardized error response
   */
  static createErrorResponse(error, context = 'operation') {
    const { userMessage, originalError } = this.handleApiError(error, context);
    
    return {
      success: false,
      error: userMessage,
      originalError: originalError,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Retry mechanism for failed operations
   */
  static async retryOperation(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error?.message || error?.toString() || 'Unknown error');
        
        if (attempt < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error is recoverable (worth retrying)
   */
  static isRecoverableError(error) {
    const recoverableErrors = [
      'Network request failed',
      'Request timeout',
      'timeout',
      '500',
      '502',
      '503',
      '504'
    ];
    
    const errorMessage = error?.message || error?.toString() || '';
    return recoverableErrors.some(errorType =>
      errorMessage.toLowerCase().includes(errorType.toLowerCase())
    );
  }
}

export default ErrorHandler;

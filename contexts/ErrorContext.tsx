import React, { createContext, useContext, useState } from 'react';
import ErrorToast from '@/components/ErrorToast';

type ErrorContextType = {
  showError: (message: string, duration?: number) => void;
  clearError: () => void;
};

const ErrorContext = createContext<ErrorContextType>({
  showError: () => {},
  clearError: () => {},
});

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorDuration, setErrorDuration] = useState<number>(4000);
  const [isVisible, setIsVisible] = useState(false);

  const showError = (message: string, duration: number = 4000) => {
    setErrorMessage(message);
    setErrorDuration(duration);
    setIsVisible(true);
  };

  const clearError = () => {
    setIsVisible(false);
    setTimeout(() => {
      setErrorMessage('');
    }, 300);
  };

  return (
    <ErrorContext.Provider value={{ showError, clearError }}>
      {children}
      <ErrorToast
        visible={isVisible}
        message={errorMessage}
        duration={errorDuration}
        onDismiss={clearError}
      />
    </ErrorContext.Provider>
  );
}

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
};

export const formatSupabaseError = (error: any): string => {
  if (!error) return 'An unknown error occurred';

  if (typeof error === 'string') return error;

  if (error.message) {
    const message = error.message.toLowerCase();

    if (message.includes('jwt')) {
      return 'Your session has expired. Please sign in again.';
    }

    if (message.includes('permission') || message.includes('denied')) {
      return 'You do not have permission to perform this action.';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }

    if (message.includes('duplicate') || message.includes('unique')) {
      return 'This item already exists.';
    }

    if (message.includes('not found')) {
      return 'The requested item was not found.';
    }

    if (message.includes('foreign key')) {
      return 'Cannot complete action due to related data.';
    }

    return error.message;
  }

  if (error.code) {
    switch (error.code) {
      case '23505':
        return 'This item already exists.';
      case '23503':
        return 'Cannot complete action due to related data.';
      case '42501':
        return 'You do not have permission to perform this action.';
      case 'PGRST116':
        return 'No data found.';
      default:
        return `Error: ${error.code}`;
    }
  }

  return 'An unexpected error occurred. Please try again.';
};

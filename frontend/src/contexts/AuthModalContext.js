import React, { createContext, useState, useContext, useCallback } from 'react';

export const AuthModalContext = createContext();

export const AuthModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [onSuccessCallback, setOnSuccessCallback] = useState(null);

  const showAuthModal = useCallback((onSuccess = null, tab = 'login') => {
    setOnSuccessCallback(() => onSuccess);
    setActiveTab(tab);
    setIsOpen(true);
  }, []);

  const hideAuthModal = useCallback(() => {
    setIsOpen(false);
    setOnSuccessCallback(null);
    setActiveTab('login');
  }, []);

  const handleAuthSuccess = useCallback(() => {
    const callback = onSuccessCallback;
    setIsOpen(false);
    setOnSuccessCallback(null);
    setActiveTab('login');
    if (callback) {
      // Delay callback slightly to let auth state propagate
      setTimeout(() => callback(), 100);
    }
  }, [onSuccessCallback]);

  return (
    <AuthModalContext.Provider value={{
      isOpen,
      activeTab,
      setActiveTab,
      showAuthModal,
      hideAuthModal,
      handleAuthSuccess,
    }}>
      {children}
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return context;
};

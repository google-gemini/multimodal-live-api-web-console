import React, { useEffect, useState } from 'react';
import './toast.scss';

interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  duration?: number;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'error',
  duration = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-message">{message}</span>
    </div>
  );
};

export default Toast; 
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircleIcon } from './icons';

interface SaveToastProps {
  visible: boolean;
  message?: string;
  onDone?: () => void;
}

export const SaveToast: React.FC<SaveToastProps> = ({ visible, message = 'Settings saved', onDone }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onDone?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onDone]);

  if (!show) return null;

  return (
    <div className="save-toast">
      <CheckCircleIcon className="w-5 h-5" />
      <span className="bp-body-sm font-semibold text-primary-foreground">{message}</span>
    </div>
  );
};

export function useSaveToast() {
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback(() => {
    setToastVisible(false);
    // Force re-trigger on next tick
    requestAnimationFrame(() => setToastVisible(true));
  }, []);

  const hideToast = useCallback(() => setToastVisible(false), []);

  return { toastVisible, showToast, hideToast };
}

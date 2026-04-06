import { useState, useEffect, useCallback } from 'react';

export function useStorage(key, defaultValue = null) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback((newValue) => {
    setValue(prev => {
      const next = typeof newValue === 'function' ? newValue(prev) : newValue;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          localStorage.removeItem('mn-image-cache');
          try {
            localStorage.setItem(key, JSON.stringify(next));
          } catch (e2) {
            console.error('Storage error after cache clear:', e2);
          }
        } else {
          console.error('Storage error:', e);
        }
      }
      return next;
    });
  }, [key]);

  return [value, set];
}

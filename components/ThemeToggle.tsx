import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <button className="bg-muted px-4 py-3 rounded-full font-semibold" onClick={toggleTheme}
    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
    {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
  </button>;
}

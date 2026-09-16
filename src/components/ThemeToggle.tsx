'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-slate-700/65 transition-colors">
      <div>
        <span className="text-xs font-medium text-slate-800 dark:text-white block">Theme Appearance</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">Switch between cinematic dark mode and clean light mode.</span>
      </div>
      <button
        onClick={toggleTheme}
        className="px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg cursor-pointer"
      >
        {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      </button>
    </div>
  );
}
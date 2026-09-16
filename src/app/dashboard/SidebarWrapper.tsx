// src/app/dashboard/SidebarWrapper.tsx
'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkItem {
  name: string;
  href: string;
  activePattern: string;
  icon: ReactNode;
}

export default function SidebarWrapper({
  children,
  navLinks,
}: {
  children: ReactNode;
  navLinks: NavLinkItem[];
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Read theme preference on mount
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  // Close mobile drawer automatically when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const toggleGlobalTheme = () => {
    const nextTheme = !isDarkMode;
    const themeString = nextTheme ? 'dark' : 'light';

    setIsDarkMode(nextTheme);

    // 1. Save to localStorage
    localStorage.setItem('app-theme', themeString);

    // 2. Set the cookie so server reads and cookies().get('app-theme') match immediately
    document.cookie = `app-theme=${themeString}; path=/; max-age=31536000`;

    // 3. Broadcast event so active client components sync instantly
    window.dispatchEvent(new Event('theme-change'));
  };

  const sidebarContent = (
    <>
      {/* Toggle Collapse Button (Desktop/Tablet) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`hidden md:flex absolute -right-3.5 top-8 rounded-full p-1.5 shadow-md transition z-20 border cursor-pointer items-center justify-center ${
          isDarkMode
            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
        }`}
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Logo Container */}
      <div className={`flex items-center justify-between md:justify-center mb-6 md:mb-8 transition-all ${isCollapsed ? 'px-0' : ''}`}>
        <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
          isDarkMode ? 'bg-[#0b101b] border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <img
            src="/logo_2.png"
            alt="ChamberNex.live Icon"
            className="h-7 w-auto object-contain"
          />
        </div>
        {/* Mobile close button inside drawer */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          aria-label="Close navigation menu"
        >
          ✕
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1.5 flex-1 text-sm font-medium overflow-y-auto pr-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.activePattern;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3.5 py-3 md:py-2.5 rounded-lg transition overflow-hidden whitespace-nowrap active:scale-[0.98] ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : isDarkMode
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {link.icon}
              <span className={`${isCollapsed ? 'md:hidden' : 'block'}`}>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Global Theme Toggle & Footer Section */}
      <div className={`pt-4 border-t space-y-3 shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          onClick={toggleGlobalTheme}
          className={`w-full flex items-center justify-center gap-2 py-3 md:py-2.5 px-3 rounded-lg text-xs font-medium transition border cursor-pointer overflow-hidden whitespace-nowrap active:scale-95 ${
            isDarkMode
              ? 'bg-slate-800/80 text-amber-400 border-slate-700 hover:bg-slate-700'
              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
          }`}
          title="Toggle Theme"
        >
          <span>{isDarkMode ? '☀️' : '🌙'}</span>
          <span className={`${isCollapsed ? 'md:hidden' : 'block'}`}>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <div className="text-center overflow-hidden whitespace-nowrap">
          {!isCollapsed ? (
            <span className="text-xs text-slate-500 block">ChamberNex.live v1.0</span>
          ) : (
            <span className="text-[10px] text-slate-500 block md:hidden">v1.0</span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className={`flex min-h-[100dvh] font-sans transition-colors duration-300 pb-[env(safe-area-inset-bottom)] ${
      isDarkMode ? 'bg-[#0b132b] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Mobile Top Header Bar (<768px) */}
      <div className={`md:hidden fixed top-0 left-0 right-0 z-30 h-14 border-b px-4 flex items-center justify-between ${
        isDarkMode ? 'bg-[#131b2e]/95 backdrop-blur border-slate-800' : 'bg-white/95 backdrop-blur border-slate-200'
      }`}>
        <button
          onClick={() => setIsMobileOpen(true)}
          className={`p-2 rounded-lg border transition active:scale-95 cursor-pointer ${
            isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
          }`}
          aria-label="Open navigation menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round5" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo_2.png" alt="Logo" className="h-6 w-auto object-contain" />
        </div>
        <div className="w-9" /> {/* Spacer for balance */}
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Global Sidebar (Desktop persistent + Mobile slide-over drawer) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 border-r flex flex-col transition-all duration-300 ease-in-out p-5 md:p-6 shrink-0 w-64 md:w-auto transform ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${
          isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col pt-14 md:pt-0 min-w-0">
        {children}
      </main>
    </div>
  );
}
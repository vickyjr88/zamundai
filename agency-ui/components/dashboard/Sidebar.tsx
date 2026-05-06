'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, User, LogOut, Zap } from 'lucide-react';
import Cookies from 'js-cookie';

const NAV_ITEMS = [
  { href: '/dashboard', icon: MessageSquare, label: 'Chat' },
  { href: '/profile', icon: User, label: 'Profile & Credits' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    Cookies.remove('token', { path: '/' });
    window.location.assign('/login');
  };

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 w-64 bg-gray-900 border-r border-gray-800 flex-col h-screen flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Zap size={22} className="text-blue-400" />
            <span className="text-white font-bold text-lg tracking-tight">Zamunda AI</span>
          </div>
          <p className="text-gray-500 text-xs mt-1">Autonomous procurement assistant</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-gray-800 transition-colors w-full"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 inset-x-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Zap size={18} className="text-blue-400 flex-shrink-0" />
            <span className="text-white font-semibold tracking-tight truncate">Zamunda AI</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-300 hover:text-white px-2 py-1 rounded-md border border-gray-700"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-gray-900/95 backdrop-blur border-t border-gray-800 px-2 py-2">
        <nav className="grid grid-cols-2 gap-2">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-gray-300 bg-gray-800/80 hover:text-white'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

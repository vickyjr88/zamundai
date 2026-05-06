'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, User, LogOut, Zap } from 'lucide-react';
import Cookies from 'js-cookie';

const NAV_ITEMS = [
  { href: '/', icon: MessageSquare, label: 'Chat' },
  { href: '/profile', icon: User, label: 'Profile & Credits' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    Cookies.remove('token');
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0 flex-shrink-0">
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
  );
}

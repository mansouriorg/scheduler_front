'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  DoorOpen,
  GraduationCap,
  Link2,
  MapPin,
  Menu,
  UsersRound,
  X,
} from 'lucide-react';
import { isActivePath } from '@/lib/navigation';

type NavItem = { href: string; label: string; icon: typeof CalendarDays };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  { title: 'Overview', items: [{ href: '/', label: 'Timetable', icon: CalendarDays }] },
  {
    title: 'Static Data',
    items: [
      { href: '/locations', label: 'Locations', icon: MapPin },
      { href: '/classrooms', label: 'Classrooms', icon: DoorOpen },
      { href: '/teachers', label: 'Teachers', icon: GraduationCap },
    ],
  },
  {
    title: 'Academics',
    items: [
      { href: '/terms', label: 'Academic Terms', icon: CalendarRange },
      { href: '/cohorts', label: 'Student Cohorts', icon: UsersRound },
      { href: '/courses', label: 'Course Catalog', icon: BookOpen },
    ],
  },
  { title: 'Execution', items: [{ href: '/offerings', label: 'Course Offerings', icon: Link2 }] },
];

const iconButton =
  'rounded-lg p-2 text-gray-300 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';

// The sidebar on tablets and computers; a top bar with a menu button on phones.
export function AppSidebar() {
  const pathname = usePathname() ?? '/';
  const [isOpen, setIsOpen] = useState(false);

  // The Escape key closes the phone menu.
  useEffect(() => {
    if (isOpen === false) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <>
      <div className="flex items-center justify-between bg-gray-900 px-4 py-3 text-white md:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-controls="main-menu"
          className={iconButton}
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </button>
      </div>

      {isOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close menu"
          onClick={close}
          className="fixed inset-0 z-30 bg-gray-950/50 md:hidden"
        />
      )}

      <nav
        id="main-menu"
        aria-label="Main"
        className={`${isOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden'} w-64 flex-shrink-0 flex-col bg-gray-900 text-white shadow-xl md:static md:z-10 md:flex`}
      >
        <div className="flex items-start justify-between border-b border-gray-800 p-6">
          <Brand />
          <button type="button" onClick={close} className={`-mr-2 -mt-1 md:hidden ${iconButton}`}>
            <X aria-hidden="true" className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-6">
              <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={close}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                          active ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <Icon
                          aria-hidden="true"
                          className={`h-5 w-5 flex-shrink-0 ${active ? 'text-blue-400' : 'text-gray-400'}`}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}

function Brand() {
  return (
    <div>
      <p className="text-xl font-bold tracking-wider text-blue-400">
        CATCHUB<span className="text-white">.EDU</span>
      </p>
      <p className="mt-1 text-xs text-gray-400">Admin Dashboard</p>
    </div>
  );
}

import { ReactNode } from 'react';
import {
  Bell,
  BookOpen,
  ChartLineUp,
  CirclesFour,
  Gear,
  House,
  LockKey,
  Palette,
  SignOut,
  Sparkle,
  Timer,
  Users,
  Wallet,
} from '@phosphor-icons/react';
import { clearSession, getUser, post } from '../client';
import { navigate } from './router';
import type { NavItem } from './model';
const learnerNav: NavItem[] = [
  { href: '/learn', label: 'Overview', icon: 'home' },
  { href: '/learn/courses', label: 'My programs', icon: 'book' },
  { href: '/learn/calendar', label: 'Practice calendar', icon: 'calendar' },
  { href: '/learn/notifications', label: 'Inbox', icon: 'bell' },
  { href: '/learn/report/new', label: 'Report content', icon: 'warning' },
];
const instructorNav: NavItem[] = [
  { href: '/instructor', label: 'Overview', icon: 'home' },
  { href: '/instructor/courses', label: 'Courses', icon: 'book' },
  { href: '/instructor/library', label: 'Lesson library', icon: 'library' },
  { href: '/instructor/assets', label: 'Asset pipeline', icon: 'library' },
  { href: '/instructor/timers', label: 'Timer studio', icon: 'timer' },
  { href: '/instructor/analytics', label: 'Analytics', icon: 'chart' },
  { href: '/instructor/payouts', label: 'Payouts', icon: 'wallet' },
  { href: '/instructor/users', label: 'People', icon: 'users' },
  { href: '/instructor/branding', label: 'Branding', icon: 'palette' },
  { href: '/instructor/domains', label: 'Domains', icon: 'circles' },
  {
    href: '/instructor/theme-revisions',
    label: 'Theme history',
    icon: 'palette',
  },
];
const iconMap: Record<string, any> = {
  home: House,
  book: BookOpen,
  calendar: Timer,
  bell: Bell,
  warning: LockKey,
  library: BookOpen,
  timer: Timer,
  chart: ChartLineUp,
  wallet: Wallet,
  users: Users,
  palette: Palette,
  circles: CirclesFour,
};
export function Shell({
  children,
  section,
  admin = false,
}: {
  children: ReactNode;
  section: string;
  admin?: boolean;
}) {
  const user = getUser();
  const instructor = !!user?.roles.some(
    (role) => role === 'ADMIN' || role === 'INSTRUCTOR',
  );
  const nav = admin
    ? [
        { href: '/admin', label: 'Tenants', icon: 'circles' },
        { href: '/admin/reports', label: 'Moderation', icon: 'warning' },
        { href: '/admin/themes', label: 'Theme library', icon: 'palette' },
      ]
    : instructor
      ? instructorNav
      : learnerNav;
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <button
          className="app-brand"
          onClick={() => navigate(instructor ? '/instructor' : '/learn')}
        >
          <span>
            <Sparkle size={16} weight="fill" />
          </span>
          Northstar <small>COACHING OS</small>
        </button>
        <span className="app-section">{section}</span>
        <div className="app-user">
          <button
            className="shell-quick-link"
            onClick={() =>
              navigate(
                instructor ? '/instructor/analytics' : '/learn/notifications',
              )
            }
          >
            {instructor ? 'Open analytics' : 'Open inbox'}
          </button>
          <span>{user?.email}</span>
          <button
            title="Sign out"
            onClick={() => {
              void post('/auth/logout').finally(() => {
                clearSession();
                navigate('/');
              });
            }}
          >
            <SignOut size={18} />
          </button>
        </div>
      </header>
      <div className="app-body">
        <aside className="app-sidebar">
          <span className="app-sidebar-title">Workspace</span>
          {nav.map((item) => {
            const Icon = iconMap[item.icon] || Gear;
            return (
              <button
                key={item.href}
                className={
                  window.location.pathname === item.href
                    ? 'app-nav-item active'
                    : 'app-nav-item'
                }
                onClick={() => navigate(item.href)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
          <div className="app-sidebar-spacer" />
          <button className="app-nav-item" onClick={() => navigate('/account')}>
            <Gear size={18} />
            Account
          </button>
          <button className="app-nav-item" onClick={() => navigate('/')}>
            <ArrowRightIcon />
            View public site
          </button>
        </aside>
        <main className="app-main">{children}</main>
      </div>
      <footer className="app-footer">
        <span>
          <Sparkle size={14} /> Northstar coaching OS
        </span>
        <small>
          Protected learning, thoughtful practice, measurable progress.
        </small>
        <div>
          <button onClick={() => navigate('/')}>Public site</button>
          <button onClick={() => navigate('/account')}>Account</button>
          <button onClick={() => navigate('/learn/report/new')}>Support</button>
        </div>
      </footer>
    </div>
  );
}
function ArrowRightIcon() {
  return <span className="app-arrow">→</span>;
}

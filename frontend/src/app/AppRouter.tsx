import { useEffect, useState } from 'react';
import { getUser } from '../client';
import { AuthPage } from './auth-normal';
import { AccountSettings } from './account';
import { TenantAdmin } from './admin';
import { CourseCatalog, LibraryStudio } from './instructor';
import { InstructorHome, InstructorAnalytics } from './analytics-pages';
import {
  BrandingStudio,
  DomainStudio,
  PayoutOperations,
  ThemeRevisions,
} from './operations';
import {
  AccountSecurityContract,
  AssetRegistration,
  ContractCourseEditor,
  ContractReport,
  PublicCourse,
  SecureLesson,
  TimerConfiguration,
} from './contract-pages';
import {
  PasswordResetComplete,
  PeopleContract,
  PurchaseCourse,
  ThemeLibraryContract,
} from './advanced-pages';
import { ContractCourseCreate } from './course-create';
import { PreferencesContract } from './preferences-contract';
import {
  LearnerOverview,
  LearnerPrograms,
  LearningCalendar,
  LearnerNotifications,
} from './learner';
import { AssetHub } from './asset-hub';
import { CoursePreview } from './course-preview';
import { PublicSite } from './public-site';
import { navigate, currentPath } from './router';
import './app.css';
const tenantSlug =
  (import.meta.env.VITE_TENANT_SLUG as string | undefined) || 'northstar';
export default function AppRouter() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const update = () => refresh((value) => value + 1);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  const path = currentPath();
  const protectedRoute =
    /^(\/learn|\/account|\/timers|\/instructor|\/admin)/.test(path);
  if (protectedRoute && !getUser()) return <AuthPage />;
  if (path === '/') return <PublicSite tenantSlug={tenantSlug} />;
  if (path === '/login') return <AuthPage mode="login" />;
  if (path === '/register') return <AuthPage mode="register" />;
  if (path === '/register/instructor') return <AuthPage mode="instructor" />;
  if (path === '/password-reset') return <AuthPage mode="reset" />;
  if (path === '/password-reset/reset') return <PasswordResetComplete />;
  if (path === '/learn') return <LearnerOverview />;
  if (path === '/learn/courses') return <LearnerPrograms />;
  if (path === '/learn/calendar') return <LearningCalendar />;
  if (path === '/learn/notifications') return <LearnerNotifications />;
  if (path === '/learn/report/new') return <ContractReport />;
  if (path.startsWith('/learn/courses/'))
    return <PurchaseCourse courseId={path.split('/')[3]} />;
  if (path.startsWith('/learn/lessons/'))
    return <SecureLesson videoId={path.split('/')[3]} />;
  if (path === '/account') return <AccountSettings />;
  if (path === '/account/preferences') return <PreferencesContract />;
  if (path === '/account/security') return <AccountSecurityContract />;
  if (path === '/instructor') return <InstructorHome />;
  if (path === '/instructor/courses') return <CourseCatalog />;
  if (path === '/instructor/courses/new') return <ContractCourseCreate />;
  if (path.startsWith('/instructor/courses/') && path.endsWith('/preview'))
    return <CoursePreview courseId={path.split('/')[3]} />;
  if (path.startsWith('/instructor/courses/'))
    return <ContractCourseEditor courseId={path.split('/')[3]} />;
  if (path === '/instructor/library') return <LibraryStudio />;
  if (path === '/instructor/assets') return <AssetHub />;
  if (path.startsWith('/instructor/lessons/') && path.endsWith('/assets'))
    return <AssetRegistration lessonId={path.split('/')[3]} />;
  if (path === '/instructor/timers') return <TimerConfiguration />;
  if (path === '/instructor/analytics') return <InstructorAnalytics />;
  if (path === '/instructor/payouts') return <PayoutOperations />;
  if (path === '/instructor/users') return <PeopleContract />;
  if (path === '/instructor/branding') return <BrandingStudio />;
  if (path === '/instructor/domains') return <DomainStudio />;
  if (path === '/instructor/theme-revisions') return <ThemeRevisions />;
  if (path === '/admin') return <TenantAdmin />;
  if (path === '/admin/reports') return <TenantAdmin reports />;
  if (path === '/admin/themes') return <ThemeLibraryContract />;
  if (path.startsWith('/public/')) {
    const parts = path.split('/');
    return parts.length > 4 ? (
      <PublicCourse tenantSlug={parts[2]} courseSlug={parts[4]} />
    ) : (
      <PublicSite tenantSlug={parts[2]} />
    );
  }
  return <PublicSite tenantSlug={tenantSlug} />;
}

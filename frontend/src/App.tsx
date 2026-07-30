import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  List,
  Play,
  Sparkle,
  X,
} from '@phosphor-icons/react';
import {
  AccountExportPage,
  AccountPage,
  AdminPage,
  AnalyticsPage,
  AssetPage,
  AuthPage,
  BrandingPage,
  DocumentsPage,
  DomainsPage,
  InstructorCourses,
  InstructorDashboard,
  LearnerDashboard,
  LearningCourse,
  LessonPlayer,
  LibraryPage,
  NotificationsPage,
  PreferencesPage,
  PublicCoursePage,
  ReportPage,
  SecurityPage,
  ThemeAdminPage,
  ThemeRevisionsPage,
  TimerAttachmentPage,
  TimerSessionPage,
  TimersPage,
  UsersPage,
} from './portal';

type Course = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  level?: string | null;
  language?: string | null;
  price?: string | number | null;
  currency?: string | null;
  billingType?: string;
  _count?: { lessons: number };
};

type SiteSettings = {
  brandName?: string | null;
  browserTitle?: string | null;
  logoUrl?: string | null;
  logoLightUrl?: string | null;
  heroImageUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  tertiaryColor?: string | null;
  backgroundColor?: string | null;
  fontHeading?: string | null;
  fontBody?: string | null;
  customCss?: string | null;
  terminologyJson?: Record<string, string> | null;
  pageSectionsJson?: Record<string, boolean> | null;
};

type Site = { name: string; slug: string; settings?: SiteSettings | null };

const demoCourses: Course[] = [
  {
    id: 'demo-foundations',
    title: 'Foundations for lasting progress',
    slug: 'foundations-for-lasting-progress',
    description:
      'A clear, practical path from first principles to confident practice.',
    level: 'All levels',
    language: 'English',
    price: 149,
    currency: 'EUR',
    _count: { lessons: 24 },
  },
  {
    id: 'demo-deep-work',
    title: 'The deep work practice',
    slug: 'the-deep-work-practice',
    description:
      'Build a repeatable rhythm with focused lessons and measurable momentum.',
    level: 'Intermediate',
    language: 'English',
    price: 199,
    currency: 'EUR',
    _count: { lessons: 18 },
  },
  {
    id: 'demo-private',
    title: 'Private coaching intensive',
    slug: 'private-coaching-intensive',
    description:
      'A guided sequence with room to adapt each lesson to your goals.',
    level: 'All levels',
    language: 'English',
    price: 299,
    currency: 'EUR',
    _count: { lessons: 12 },
  },
];

const demoSite: Site = {
  name: 'Northstar Coaching',
  slug: 'northstar',
  settings: {
    browserTitle: 'Northstar Coaching',
    terminologyJson: { program_label: 'Programs', lesson_label: 'Lessons' },
  },
};

const apiBase = (
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:3000' : '')
).replace(/\/$/, '');

function tenantSlug() {
  const configured = import.meta.env.VITE_TENANT_SLUG as string | undefined;
  if (configured) return configured;
  const pathTenant = window.location.pathname.match(/^\/public\/([^/]+)$/)?.[1];
  if (pathTenant) return pathTenant;
  const host = window.location.hostname.split('.')[0];
  return host !== 'localhost' && host !== '127' && host !== 'www'
    ? host
    : 'northstar';
}

function formatPrice(price: Course['price'], currency = 'EUR') {
  if (price === null || price === undefined) return 'Contact for details';
  const amount = typeof price === 'string' ? Number(price) : price;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amount);
}

function HomePage() {
  const [site, setSite] = useState<Site>(demoSite);
  const [courses, setCourses] = useState<Course[]>(demoCourses);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slug = tenantSlug();
    Promise.all([
      fetch(`${apiBase}/public/${encodeURIComponent(slug)}`).then(
        (response) => {
          if (!response.ok) throw new Error('site');
          return response.json() as Promise<Site>;
        },
      ),
      fetch(`${apiBase}/public/${encodeURIComponent(slug)}/courses`).then(
        (response) => {
          if (!response.ok) throw new Error('catalog');
          return response.json() as Promise<Course[]>;
        },
      ),
    ])
      .then(([nextSite, nextCourses]) => {
        setSite(nextSite);
        setCourses(nextCourses);
        document.title = nextSite.settings?.browserTitle || nextSite.name;
      })
      .catch(() =>
        setNotice('Showing a preview while the coaching site connects.'),
      )
      .finally(() => setLoading(false));
  }, []);

  const settings = site.settings;
  const terms = settings?.terminologyJson ?? {};
  const programLabel = terms.program_label || 'Programs';
  const lessonLabel = terms.lesson_label || 'Lessons';
  const sectionConfig = settings?.pageSectionsJson ?? {};
  const style = useMemo(
    () =>
      ({
        '--brand-primary': settings?.primaryColor || 'var(--color-accent)',
        '--brand-secondary':
          settings?.secondaryColor || 'var(--color-accent-2)',
        '--brand-tertiary': settings?.tertiaryColor || 'var(--color-section)',
        '--brand-background': settings?.backgroundColor || 'var(--color-bg)',
        '--brand-heading': settings?.fontHeading || 'var(--font-heading)',
        '--brand-body': settings?.fontBody || 'var(--font-body)',
      }) as React.CSSProperties,
    [settings],
  );

  return (
    <main className="ds-nocturne site-shell" style={style}>
      {settings?.customCss && <style>{settings.customCss}</style>}
      {notice && (
        <div className="preview-notice" role="status">
          <span>{notice}</span>
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => setNotice(null)}
            aria-label="Dismiss preview notice"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <header className="nav site-nav">
        <a
          className="nav-brand brand-lockup"
          href="#top"
          aria-label={`${site.name} home`}
        >
          {settings?.logoUrl || settings?.logoLightUrl ? (
            <img src={settings.logoLightUrl || settings.logoUrl || ''} alt="" />
          ) : (
            <span className="brand-mark">
              <Sparkle size={16} weight="fill" />
            </span>
          )}
          <span>{site.name}</span>
        </a>
        <button
          className="btn btn-icon btn-ghost nav-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={19} /> : <List size={19} />}
        </button>
        <nav
          className={menuOpen ? 'nav-links is-open' : 'nav-links'}
          aria-label="Main navigation"
        >
          <a href="#programs">{programLabel}</a>
          <a href="#method">The method</a>
          <a href="#about">About</a>
          <a className="btn btn-secondary nav-login" href="/login">
            Sign in
          </a>
        </nav>
      </header>

      <section id="top" className="hero content-frame">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-line" />
            Thoughtful coaching, built around you
          </p>
          <h1>
            Make space for your <em>next chapter.</em>
          </h1>
          <p className="hero-lede">
            Structured guidance, practical lessons, and a pace you can sustain.
            Learn with clarity and keep moving with intention.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#programs">
              Explore {programLabel.toLowerCase()} <ArrowRight size={16} />
            </a>
            <a className="btn btn-ghost" href="#method">
              How it works <ArrowRight size={16} />
            </a>
          </div>
          <div className="hero-proof">
            <span className="proof-dots">
              <i />
              <i />
              <i />
            </span>
            <span>Personalised practice for real life</span>
          </div>
        </div>
        <div
          className="hero-art"
          aria-label="A calm abstract coaching workspace"
        >
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-card art-card-top">
            <span className="tag tag-accent">today</span>
            <strong>One clear step</strong>
            <small>is enough to begin.</small>
          </div>
          <div className="art-card art-card-bottom">
            <div className="art-play">
              <Play size={17} weight="fill" />
            </div>
            <div>
              <small>Current lesson</small>
              <strong>Notice what is working</strong>
            </div>
          </div>
          <div className="art-spark">
            <Sparkle size={22} weight="fill" />
          </div>
        </div>
      </section>

      {sectionConfig.stats !== false && (
        <section
          className="stat-band"
          aria-label="Coaching platform highlights"
        >
          <div>
            <strong>01</strong>
            <span>Clear frameworks</span>
          </div>
          <div>
            <strong>02</strong>
            <span>Short, focused {lessonLabel.toLowerCase()}</span>
          </div>
          <div>
            <strong>03</strong>
            <span>Progress you can feel</span>
          </div>
        </section>
      )}

      <section id="programs" className="content-frame section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span className="eyebrow-line" />A place to start
            </p>
            <h2>
              Choose your <em>direction.</em>
            </h2>
          </div>
          <p className="section-intro">
            Each {programLabel.toLowerCase().slice(0, -1)} is designed to meet
            you where you are and leave you with something you can use.
          </p>
        </div>
        {loading && (
          <p className="text-muted loading-copy">
            Loading the latest {programLabel.toLowerCase()}…
          </p>
        )}
        <div className="course-grid">
          {courses.map((course, index) => (
            <article className="card course-card elev-sm" key={course.id}>
              <div className={`course-visual course-visual-${index % 3}`}>
                <span className="course-number">0{index + 1}</span>
                <span className="tag tag-outline">
                  {course.level || 'Guided'}
                </span>
              </div>
              <div className="course-content">
                <p className="card-kicker">
                  {course._count?.lessons || '—'} {lessonLabel.toLowerCase()}
                </p>
                <h3 className="card-title">{course.title}</h3>
                <p className="card-body">
                  {course.description ||
                    'A considered sequence of lessons to help you build momentum.'}
                </p>
                <div className="card-meta course-meta">
                  <span>
                    {formatPrice(course.price, course.currency || 'EUR')}
                  </span>
                  <a
                    className="btn btn-ghost"
                    href={`/public/${site.slug}/courses/${course.slug}`}
                    aria-label={`View ${course.title}`}
                  >
                    View <ArrowRight size={15} />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="method" className="method-section content-frame">
        <div className="method-panel">
          <div>
            <p className="eyebrow">
              <span className="eyebrow-line" />
              The method
            </p>
            <h2>
              Small shifts.
              <br />
              <em>Lasting change.</em>
            </h2>
          </div>
          <div className="method-copy">
            <p>
              Good coaching gives you more than information. It gives you a way
              to notice, practice, and return to what matters.
            </p>
            <ul>
              <li>
                <Check size={17} />
                Learn at a pace that respects your life
              </li>
              <li>
                <Check size={17} />
                Use practical tools between sessions
              </li>
              <li>
                <Check size={17} />
                See your progress without losing the bigger picture
              </li>
            </ul>
            <a className="btn btn-secondary" href="#programs">
              Find your starting point <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {sectionConfig.testimonials !== false && (
        <section id="about" className="quote-section content-frame">
          <p className="quote-mark">“</p>
          <blockquote>
            The right structure does not make you smaller. It gives your
            attention somewhere meaningful to land.
          </blockquote>
          <p className="quote-byline">— {site.name}</p>
        </section>
      )}

      <footer className="site-footer content-frame">
        <a className="nav-brand brand-lockup" href="#top">
          <span className="brand-mark">
            <Sparkle size={15} weight="fill" />
          </span>
          <span>{site.name}</span>
        </a>
        <p>Coaching for the work that matters.</p>
        <div className="footer-links">
          <a href="#programs">{programLabel}</a>
          <a href="#method">The method</a>
          <a href="/login">Sign in</a>
        </div>
        <small>
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </small>
      </footer>
    </main>
  );
}

function RouteApp() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  const clean = path.replace(/\/$/, '') || '/';
  if (clean === '/login') return <AuthPage mode="login" />;
  if (clean === '/register') return <AuthPage mode="register" />;
  if (clean === '/register/instructor') return <AuthPage mode="instructor" />;
  if (clean === '/bootstrap') return <AuthPage mode="bootstrap" />;
  if (clean === '/password-reset') return <AuthPage mode="reset" />;
  if (clean === '/learn') return <LearnerDashboard />;
  if (clean === '/learn/notifications') return <NotificationsPage />;
  if (clean === '/learn/account') return <AccountPage />;
  if (clean === '/account/preferences') return <PreferencesPage />;
  if (clean === '/account/security') return <SecurityPage />;
  if (clean === '/account/export') return <AccountExportPage />;
  if (clean.startsWith('/learn/report/'))
    return <ReportPage entityId={clean.split('/')[3]} />;
  if (clean.startsWith('/learn/documents/'))
    return <DocumentsPage fileId={clean.split('/')[3]} />;
  if (clean.startsWith('/timers/') && clean.endsWith('/sessions'))
    return <TimerSessionPage timerId={clean.split('/')[2]} />;
  if (clean.startsWith('/learn/courses/'))
    return <LearningCourse courseId={clean.split('/')[3]} />;
  if (clean.startsWith('/learn/lessons/'))
    return <LessonPlayer lessonId={clean.split('/')[3]} />;
  if (clean === '/instructor') return <InstructorDashboard />;
  if (clean === '/instructor/courses' || clean === '/instructor/courses/new')
    return <InstructorCourses />;
  if (clean.startsWith('/instructor/courses/'))
    return <InstructorCourses courseId={clean.split('/')[3]} />;
  if (clean === '/instructor/library') return <LibraryPage />;
  if (clean === '/instructor/timers') return <TimersPage />;
  if (clean === '/instructor/timers/attach') return <TimerAttachmentPage />;
  if (clean === '/instructor/analytics') return <AnalyticsPage />;
  if (clean === '/instructor/branding') return <BrandingPage />;
  if (clean === '/instructor/domains') return <DomainsPage />;
  if (clean === '/instructor/branding/revisions') return <ThemeRevisionsPage />;
  if (clean === '/instructor/users') return <UsersPage />;
  if (clean.startsWith('/instructor/lessons/') && clean.endsWith('/assets'))
    return <AssetPage lessonId={clean.split('/')[3]} />;
  if (clean === '/admin') return <AdminPage />;
  if (clean === '/admin/reports') return <AdminPage reports />;
  if (clean === '/admin/themes') return <ThemeAdminPage />;
  const publicCourseMatch = clean.match(
    /^\/public\/([^/]+)\/courses\/([^/]+)$/,
  );
  if (publicCourseMatch)
    return (
      <PublicCoursePage
        tenantSlug={publicCourseMatch[1]}
        courseSlug={publicCourseMatch[2]}
      />
    );
  if (clean.match(/^\/public\/[^/]+$/)) return <HomePage />;
  return <HomePage />;
}

export default RouteApp;

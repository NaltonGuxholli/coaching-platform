import { FormEvent, ReactNode, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CircleNotch,
  Clock,
  Gear,
  House,
  LockKey,
  MagnifyingGlass,
  Play,
  Plus,
  SignOut,
  Sparkle,
  Timer,
  Users,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  clearSession,
  del,
  get,
  getUser,
  patch,
  post,
  saveSession,
  SessionUser,
} from './api';

export function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  name,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  name?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="input"
        name={name}
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Notice({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  return error || success ? (
    <div className={error ? 'portal-alert portal-alert-error' : 'portal-alert'}>
      {error || success}
    </div>
  ) : null;
}

export function PortalLayout({
  children,
  section = 'Workspace',
}: {
  children: ReactNode;
  section?: string;
}) {
  const user = getUser();
  const instructor =
    user?.roles.includes('INSTRUCTOR') || user?.roles.includes('ADMIN');
  const admin = user?.isPlatformAdmin;
  return (
    <main className="ds-nocturne portal-shell">
      <header className="portal-topbar">
        <a href="/" className="nav-brand brand-lockup">
          <span className="brand-mark">
            <Sparkle size={15} weight="fill" />
          </span>
          <span>Coaching platform</span>
        </a>
        <span className="portal-section">{section}</span>
        <div className="portal-account">
          <span>{user?.email || 'Guest'}</span>
          <button
            className="btn btn-icon btn-ghost"
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
      <div className="portal-body">
        <aside className="portal-sidebar">
          <a href={instructor ? '/instructor' : '/learn'}>
            <House size={17} />
            Overview
          </a>
          {instructor && (
            <>
              <a href="/instructor/courses">
                <BookOpen size={17} />
                Courses
              </a>
              <a href="/instructor/library">
                <Sparkle size={17} />
                Lesson library
              </a>
              <a href="/instructor/timers">
                <Timer size={17} />
                Timers
              </a>
              <a href="/instructor/analytics">
                <Clock size={17} />
                Analytics
              </a>
              <a href="/instructor/branding">
                <Gear size={17} />
                Branding
              </a>
              <a href="/instructor/branding/revisions">
                <Clock size={17} />
                Revisions
              </a>
              <a href="/instructor/domains">
                <Gear size={17} />
                Domains
              </a>
              <a href="/instructor/users">
                <Users size={17} />
                People
              </a>
            </>
          )}
          {!instructor && (
            <>
              <a href="/learn/notifications">
                <Bell size={17} />
                Notifications
              </a>
              <a href="/learn/account">
                <Gear size={17} />
                Account
              </a>
              <a href="/account/preferences">
                <Bell size={17} />
                Preferences
              </a>
              <a href="/account/security">
                <LockKey size={17} />
                Security
              </a>
            </>
          )}
          {admin && (
            <>
              <div className="sidebar-label">Platform</div>
              <a href="/admin">
                <Users size={17} />
                Tenants
              </a>
              <a href="/admin/reports">
                <WarningCircle size={17} />
                Reports
              </a>
              <a href="/admin/themes">
                <Sparkle size={17} />
                Theme library
              </a>
            </>
          )}
        </aside>
        <section className="portal-content">{children}</section>
      </div>
    </main>
  );
}

export function AuthPage({
  mode,
}: {
  mode: 'login' | 'register' | 'instructor' | 'bootstrap' | 'reset';
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key: string) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const titles = {
    login: 'Welcome back',
    register: 'Create your learner account',
    instructor: 'Create your coaching site',
    bootstrap: 'Set up your platform',
    reset: 'Reset your password',
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const paths = {
        login: '/auth/login',
        register: '/auth/register',
        instructor: '/auth/register/instructor',
        bootstrap: '/auth/bootstrap',
        reset: '/auth/password-reset/reset',
      };
      const body =
        mode === 'reset'
          ? values
          : {
              ...values,
              ...(mode === 'register' || mode === 'login'
                ? { tenantSlug: values.tenantSlug || undefined }
                : {}),
            };
      const result = await post<{ accessToken: string; user: SessionUser }>(
        paths[mode],
        body,
        { auth: false },
      );
      if (result.accessToken) {
        saveSession(result);
        navigate(
          mode === 'login'
            ? result.user.roles.includes('INSTRUCTOR') ||
              result.user.roles.includes('ADMIN')
              ? '/instructor'
              : '/learn'
            : '/instructor',
        );
      } else setSuccess('If the account exists, the next step has been sent.');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to complete this request',
      );
    } finally {
      setBusy(false);
    }
  };
  const common = (
    <>
      <Field
        label="Email"
        value={values.email || ''}
        onChange={set('email')}
        type="email"
        required
      />
      <Field
        label="Password"
        value={values.password || ''}
        onChange={set('password')}
        type="password"
        required
      />
    </>
  );
  return (
    <main className="ds-nocturne auth-shell">
      <a href="/" className="nav-brand brand-lockup auth-brand">
        <span className="brand-mark">
          <Sparkle size={15} weight="fill" />
        </span>
        <span>Coaching platform</span>
      </a>
      <section className="auth-card elev-md">
        <p className="eyebrow">
          <span className="eyebrow-line" />
          {mode === 'instructor' ? 'Creator setup' : 'Secure access'}
        </p>
        <h1>{titles[mode]}</h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Continue your learning or coaching workspace.'
            : mode === 'bootstrap'
              ? 'The first account becomes the platform administrator.'
              : 'Your details stay with your tenant and are never shared across sites.'}
        </p>
        <Notice error={error} success={success} />
        <form onSubmit={submit}>
          {mode === 'login' && (
            <Field
              label="Tenant slug"
              value={values.tenantSlug || ''}
              onChange={set('tenantSlug')}
              placeholder="your-brand"
              required
            />
          )}
          {(mode === 'register' ||
            mode === 'instructor' ||
            mode === 'bootstrap') && (
            <>
              <Field
                label="First name"
                value={values.firstName || ''}
                onChange={set('firstName')}
                required
              />
              <Field
                label="Last name"
                value={values.lastName || ''}
                onChange={set('lastName')}
                required
              />
            </>
          )}
          {(mode === 'instructor' || mode === 'bootstrap') && (
            <>
              <Field
                label="Business name"
                value={values.tenantName || ''}
                onChange={set('tenantName')}
                required
              />
              <Field
                label="Tenant slug"
                value={values.tenantSlug || ''}
                onChange={set('tenantSlug')}
                placeholder="your-brand"
                required
              />
              <Field
                label="Subdomain"
                value={values.subdomain || ''}
                onChange={set('subdomain')}
                placeholder="your-brand"
                required
              />
            </>
          )}
          {mode !== 'reset' && common}
          {mode === 'reset' && (
            <>
              <Field
                label="Reset token"
                value={values.token || ''}
                onChange={set('token')}
                required
              />
              {common}
            </>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? (
              <CircleNotch className="spin" />
            ) : mode === 'login' ? (
              'Sign in'
            ) : (
              'Continue'
            )}{' '}
            <ArrowRight size={16} />
          </Button>
        </form>
        <div className="auth-links">
          {mode === 'login' ? (
            <>
              <a href="/register">Create learner account</a>
              <a href="/register/instructor">Create coaching site</a>
              <a href="/password-reset">Forgot password?</a>
            </>
          ) : (
            <a href="/login">Back to sign in</a>
          )}
        </div>
      </section>
    </main>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && (
          <p className="eyebrow">
            <span className="eyebrow-line" />
            {eyebrow}
          </p>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="portal-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Loading() {
  return (
    <div className="loading-panel">
      <CircleNotch className="spin" size={24} />
      Loading workspace…
    </div>
  );
}

export function LearnerDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    get<any[]>('/learning/my-courses')
      .then(setCourses)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <PortalLayout section="Learning">
      <PageHeader
        eyebrow="Your workspace"
        title="Keep your momentum."
        description="Pick up where you left off, or make space for a new direction."
        action={
          <a className="btn btn-primary" href="/">
            Browse programs <ArrowRight size={16} />
          </a>
        }
      />
      <Notice error={error} />
      <div className="portal-stats">
        <Stat label="Active programs" value={courses.length} />
        <Stat
          label="Lessons completed"
          value={courses.reduce(
            (sum, course) =>
              sum +
              (course.completedLessons ||
                course.progress?.completedLessons ||
                0),
            0,
          )}
        />
        <Stat label="Current rhythm" value="On track" />
      </div>
      <section className="portal-section-block">
        <div className="section-title-row">
          <h2>My programs</h2>
          <a href="/">
            Explore catalog <ArrowRight size={15} />
          </a>
        </div>
        {!courses.length && !error ? (
          <Loading />
        ) : (
          <div className="portal-card-grid">
            {courses.map((course) => (
              <a
                className="portal-card course-row"
                href={`/learn/courses/${course.courseId || course.id}`}
                key={course.courseId || course.id}
              >
                <div className="course-icon">
                  <BookOpen size={22} />
                </div>
                <div>
                  <span className="card-kicker">
                    {course.percentage ?? course.progress?.percentage ?? 0}%
                    complete
                  </span>
                  <h3>
                    {course.course?.title || course.title || 'Untitled program'}
                  </h3>
                  <p>
                    {course.lastLesson?.libraryItem?.title ||
                      'Continue your next lesson'}
                  </p>
                </div>
                <ArrowRight className="row-arrow" size={18} />
              </a>
            ))}
          </div>
        )}
      </section>
    </PortalLayout>
  );
}

export function LearningCourse({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    get<any>(`/learning/courses/${courseId}`)
      .then(setCourse)
      .catch((e) => setError(e.message));
  }, [courseId]);
  if (error)
    return (
      <PortalLayout>
        <Notice error={error} />
      </PortalLayout>
    );
  if (!course)
    return (
      <PortalLayout>
        <Loading />
      </PortalLayout>
    );
  const lessons = [
    ...(course.modules || []).flatMap((module: any) => module.lessons || []),
    ...(course.lessons || []),
  ];
  return (
    <PortalLayout section="Course">
      <a className="back-link" href="/learn">
        <ArrowLeft size={15} />
        Back to learning
      </a>
      <PageHeader
        eyebrow="Purchased program"
        title={course.title}
        description={
          course.description || 'Your full learning path, ready when you are.'
        }
      />
      <div className="progress-panel">
        <div>
          <span>Overall progress</span>
          <strong>
            {course.progress?.percentage ?? course.percentage ?? 0}%
          </strong>
        </div>
        <div className="progress-track">
          <i
            style={{
              width: `${course.progress?.percentage ?? course.percentage ?? 0}%`,
            }}
          />
        </div>
      </div>
      <div className="lesson-list">
        {(course.modules || []).map((module: any) => (
          <div className="module-block" key={module.id}>
            <div className="module-heading">
              <span className="tag tag-accent">
                {module.scheduleLabel || 'Module'}
              </span>
              <h2>{module.title}</h2>
            </div>
            {(module.lessons || []).map((lesson: any) => (
              <LessonRow lesson={lesson} key={lesson.id} />
            ))}
          </div>
        ))}
        {(course.lessons || []).map((lesson: any) => (
          <LessonRow lesson={lesson} key={lesson.id} />
        ))}
      </div>
      {!lessons.length && (
        <div className="empty-panel">This program has no lessons yet.</div>
      )}
    </PortalLayout>
  );
}
function LessonRow({ lesson }: { lesson: any }) {
  const done = lesson.progress?.completed || lesson.completed;
  return (
    <a className="lesson-row" href={`/learn/lessons/${lesson.id}`}>
      <span className={done ? 'lesson-status is-done' : 'lesson-status'}>
        {done ? <Check size={15} /> : <Play size={13} weight="fill" />}
      </span>
      <span>
        <strong>{lesson.libraryItem?.title || lesson.title || 'Lesson'}</strong>
        <small>
          {lesson.libraryItem?.duration
            ? `${lesson.libraryItem.duration} min`
            : 'Video lesson'}
          {lesson.isFreePreview ? ' · Preview' : ''}
        </small>
      </span>
      <ArrowRight size={16} />
    </a>
  );
}

export function LessonPlayer({ lessonId }: { lessonId: string }) {
  const [access, setAccess] = useState<any>(null);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    get<any>(`/learning/courses/${lessonId}`).catch(() => undefined);
  }, [lessonId]);
  const start = async () => {
    try {
      const result = await post<any>(`/learning/videos/${lessonId}/access`);
      setAccess(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to create playback session',
      );
    }
  };
  const mark = async () => {
    try {
      await patch(`/learning/lessons/${lessonId}/progress`, {
        watchedSeconds: 1,
        completed: true,
      });
      setCompleted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save progress');
    }
  };
  return (
    <PortalLayout section="Lesson">
      <a className="back-link" href="/learn">
        <ArrowLeft size={15} />
        Back to learning
      </a>
      <PageHeader
        eyebrow="Focused practice"
        title="Your lesson"
        description="Streaming playback is session-bound and watermarked to your account."
      />
      <Notice
        error={error}
        success={completed ? 'Lesson marked complete.' : null}
      />
      <div className="player-surface">
        {access ? (
          <video
            controls
            controlsList="nodownload"
            src={`${(import.meta.env.VITE_API_URL as string | undefined) || (import.meta.env.DEV ? 'http://localhost:3000' : '')}/learning/videos/${lessonId}/playback?token=${encodeURIComponent(access.token)}`}
            onContextMenu={(event) => event.preventDefault()}
          />
        ) : (
          <button className="player-gate" onClick={start}>
            <span className="art-play">
              <Play size={20} weight="fill" />
            </span>
            <strong>Start protected playback</strong>
            <small>
              Your identity watermark will be applied to this session.
            </small>
          </button>
        )}
      </div>
      <div className="player-actions">
        <Button variant="secondary" onClick={mark}>
          <Check size={16} />
          Mark complete
        </Button>
        <a className="btn btn-ghost" href={`/learn/report/${lessonId}`}>
          Report content <WarningCircle size={16} />
        </a>
      </div>
    </PortalLayout>
  );
}

export function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    get<any[]>('/learning/notifications')
      .then(setItems)
      .catch(() => undefined);
  }, []);
  return (
    <PortalLayout section="Notifications">
      <PageHeader
        title="Notifications"
        description="Updates from the programs you are part of."
      />
      <div className="notification-list">
        {items.map((item) => (
          <div
            className={item.isRead ? 'notification is-read' : 'notification'}
            key={item.id}
          >
            <Bell size={18} />
            <div>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
              <small>
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString()
                  : ''}
              </small>
            </div>
            {!item.isRead && (
              <Button
                variant="ghost"
                onClick={() =>
                  patch(`/learning/notifications/${item.id}/read`).then(() =>
                    setItems(
                      items.map((entry) =>
                        entry.id === item.id
                          ? { ...entry, isRead: true }
                          : entry,
                      ),
                    ),
                  )
                }
              >
                Mark read
              </Button>
            )}
          </div>
        ))}
        {!items.length && (
          <div className="empty-panel">You are all caught up.</div>
        )}
      </div>
    </PortalLayout>
  );
}

export function AccountPage() {
  const [user, setUser] = useState<any>(getUser());
  const [sessions, setSessions] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    get<any[]>('/account/sessions')
      .then(setSessions)
      .catch(() => undefined);
  }, []);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const next = await patch<any>('/account', Object.fromEntries(form));
      setUser(next);
      setMessage('Profile saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save profile');
    }
  };
  return (
    <PortalLayout section="Account">
      <PageHeader
        title="Account settings"
        description="Manage your profile, devices, preferences, and data."
      />
      <Notice error={error} success={message} />
      <form className="settings-form" onSubmit={save}>
        <Field
          name="firstName"
          label="First name"
          value={user?.firstName || ''}
          onChange={(value) => setUser({ ...user, firstName: value })}
        />
        <Field
          name="lastName"
          label="Last name"
          value={user?.lastName || ''}
          onChange={(value) => setUser({ ...user, lastName: value })}
        />
        <Field
          name="email"
          label="Email"
          value={user?.email || ''}
          onChange={(value) => setUser({ ...user, email: value })}
          type="email"
        />
        <Button type="submit">Save profile</Button>
      </form>
      <section className="portal-section-block">
        <h2>Active devices</h2>
        {sessions.map((session) => (
          <div className="session-row" key={session.id}>
            <div>
              <strong>{session.deviceName || 'Browser session'}</strong>
              <small>{session.userAgent || 'Unknown device'}</small>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                del(`/account/sessions/${session.id}`).then(() =>
                  setSessions(
                    sessions.filter((item) => item.id !== session.id),
                  ),
                )
              }
            >
              Revoke
            </Button>
          </div>
        ))}
        <a className="btn btn-ghost" href="/account/export">
          Export my data <ArrowRight size={15} />
        </a>
      </section>
    </PortalLayout>
  );
}

export function AccountExportPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    get<any>('/account/export')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <PortalLayout section="Data export">
      <PageHeader
        title="Your data export"
        description="A copy of your profile, enrollments, progress, sessions, and notifications."
        action={
          data && (
            <Button
              onClick={() =>
                window.open(
                  `data:application/json,${encodeURIComponent(JSON.stringify(data))}`,
                  '_blank',
                )
              }
            >
              Download JSON
            </Button>
          )
        }
      />
      <Notice error={error} />
      {data ? (
        <pre className="analytics-json">{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <Loading />
      )}
    </PortalLayout>
  );
}

export function InstructorDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  useEffect(() => {
    get<any[]>('/instructor/courses')
      .then(setCourses)
      .catch(() => undefined);
    get<any>('/instructor/analytics')
      .then(setAnalytics)
      .catch(() => undefined);
  }, []);
  return (
    <PortalLayout section="Instructor workspace">
      <PageHeader
        eyebrow="Creator workspace"
        title="Build work people can use."
        description="Manage your programs, reusable lessons, timers, and learner engagement."
        action={
          <a className="btn btn-primary" href="/instructor/courses/new">
            <Plus size={16} />
            New course
          </a>
        }
      />
      <div className="portal-stats">
        <Stat
          label="Published courses"
          value={
            courses.filter((course) => course.status === 'PUBLISHED').length
          }
        />
        <Stat
          label="Total enrollments"
          value={analytics?.enrollments ?? analytics?.totalEnrollments ?? '—'}
        />
        <Stat
          label="Average completion"
          value={
            analytics?.completionRate ? `${analytics.completionRate}%` : '—'
          }
        />
      </div>
      <section className="portal-section-block">
        <div className="section-title-row">
          <h2>Recent programs</h2>
          <a href="/instructor/courses">
            View all <ArrowRight size={15} />
          </a>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Status</th>
                <th>Lessons</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td>
                    <a href={`/instructor/courses/${course.id}`}>
                      {course.title}
                    </a>
                  </td>
                  <td>
                    <span
                      className={
                        course.status === 'PUBLISHED'
                          ? 'tag tag-accent'
                          : 'tag tag-neutral'
                      }
                    >
                      {course.status}
                    </span>
                  </td>
                  <td>{course._count?.lessons ?? 0}</td>
                  <td>
                    {course.updatedAt
                      ? new Date(course.updatedAt).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PortalLayout>
  );
}

export function InstructorCourses({ courseId }: { courseId?: string }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [builder, setBuilder] = useState<any>(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    priceCents: '0',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (courseId)
      get<any>(`/instructor/courses/${courseId}/builder`)
        .then(setBuilder)
        .catch((e) => setError(e.message));
    else
      get<any[]>('/instructor/courses')
        .then(setCourses)
        .catch((e) => setError(e.message));
  }, [courseId]);
  const create = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const course = await post<any>('/instructor/courses', {
        ...form,
        priceCents: Number(form.priceCents),
      });
      navigate(`/instructor/courses/${course.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create course');
    }
  };
  const action = async (path: string) => {
    try {
      await post(path);
      setMessage('Course updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };
  if (courseId)
    return (
      <PortalLayout section="Course builder">
        <a className="back-link" href="/instructor/courses">
          <ArrowLeft size={15} />
          All courses
        </a>
        {builder ? (
          <>
            <PageHeader
              eyebrow="Course builder"
              title={builder.title}
              description="Assemble reusable lessons into modules, preview the learner experience, and publish when ready."
              action={
                <div className="button-row">
                  <Button
                    onClick={() =>
                      action(`/instructor/courses/${courseId}/publish`)
                    }
                  >
                    Publish <ArrowRight size={15} />
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      action(`/instructor/courses/${courseId}/duplicate`)
                    }
                  >
                    Duplicate
                  </Button>
                </div>
              }
            />
            <div className="builder-tree">
              {(builder.modules || []).map((module: any) => (
                <div className="builder-module" key={module.id}>
                  <div>
                    <span className="tag tag-accent">
                      {module.scheduleLabel || 'Module'}
                    </span>
                    <h2>{module.title}</h2>
                  </div>
                  {(module.lessons || []).map((lesson: any) => (
                    <div className="builder-lesson" key={lesson.id}>
                      <BookOpen size={16} />
                      {lesson.libraryItem?.title || 'Lesson'}
                      <span>{lesson.isFreePreview ? 'Free preview' : ''}</span>
                    </div>
                  ))}
                </div>
              ))}
              {!(builder.modules || []).length && (
                <div className="empty-panel">
                  Start by adding a module from the builder.
                </div>
              )}
            </div>
          </>
        ) : (
          <Loading />
        )}
      </PortalLayout>
    );
  return (
    <PortalLayout section="Courses">
      <PageHeader
        title="Courses"
        description="Create, structure, publish, and reuse your teaching programs."
        action={
          <a className="btn btn-primary" href="/instructor/courses/new">
            <Plus size={16} />
            New course
          </a>
        }
      />
      <Notice error={error} success={message} />
      {window.location.pathname.endsWith('/new') ? (
        <form className="portal-form" onSubmit={create}>
          <Field
            label="Title"
            value={form.title}
            onChange={(value) => setForm({ ...form, title: value })}
            required
          />
          <Field
            label="Slug"
            value={form.slug}
            onChange={(value) => setForm({ ...form, slug: value })}
            required
          />
          <Field
            label="Description"
            value={form.description}
            onChange={(value) => setForm({ ...form, description: value })}
          />
          <Field
            label="Price in cents"
            value={form.priceCents}
            onChange={(value) => setForm({ ...form, priceCents: value })}
            type="number"
          />
          <Button type="submit">
            Create draft <ArrowRight size={16} />
          </Button>
        </form>
      ) : (
        <div className="portal-card-grid">
          {courses.map((course) => (
            <a
              className="portal-card"
              href={`/instructor/courses/${course.id}`}
              key={course.id}
            >
              <span className="card-kicker">{course.status}</span>
              <h3>{course.title}</h3>
              <p>{course.description || 'No description yet.'}</p>
              <span className="card-meta">
                {course._count?.lessons || 0} lessons ·{' '}
                {course._count?.enrollments || 0} learners
              </span>
            </a>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}

export function LibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const load = () =>
    get<any[]>(`/instructor/library?search=${encodeURIComponent(search)}`)
      .then(setItems)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  const create = async () => {
    const title = window.prompt('Lesson title');
    if (!title) return;
    try {
      await post('/instructor/library', { title, type: 'lesson', tags: [] });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create lesson');
    }
  };
  return (
    <PortalLayout section="Lesson library">
      <PageHeader
        title="Lesson library"
        description="Create reusable lessons once and assemble them into any number of courses."
        action={
          <Button onClick={create}>
            <Plus size={16} />
            New lesson
          </Button>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <MagnifyingGlass size={17} />
          <input
            className="input"
            placeholder="Search lessons"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>
        <Button variant="secondary" onClick={load}>
          Search
        </Button>
      </div>
      <Notice error={error} />
      <div className="portal-card-grid library-grid">
        {items.map((item) => (
          <article className="portal-card" key={item.id}>
            <span className="card-kicker">
              {item.type} · {item.duration || '—'} min
            </span>
            <h3>{item.title}</h3>
            <p>{item.description || 'Reusable lesson content.'}</p>
            <div className="tag-list">
              {(item.tagsJson || []).map((tag: string) => (
                <span className="tag tag-neutral" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </PortalLayout>
  );
}

export function TimersPage() {
  const [type, setType] = useState('COUNTDOWN');
  const [duration, setDuration] = useState('60');
  const [message, setMessage] = useState('');
  const create = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await post('/instructor/timers', { type, duration: Number(duration) });
      setMessage(
        'Timer configuration created. Attach it from a course builder.',
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to create timer');
    }
  };
  return (
    <PortalLayout section="Timers">
      <PageHeader
        title="Session timers"
        description="Configure countdown, interval, AMRAP, and circuit patterns for any lesson."
      />
      <Notice
        success={message}
        error={message.includes('Unable') ? message : undefined}
      />
      <form className="portal-form" onSubmit={create}>
        <label className="field">
          <span>Timer mode</span>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option>COUNTDOWN</option>
            <option>STOPWATCH</option>
            <option>INTERVAL</option>
            <option>AMRAP</option>
            <option>CIRCUIT</option>
          </select>
        </label>
        <Field
          label="Duration (seconds)"
          value={duration}
          onChange={setDuration}
          type="number"
        />
        <Button type="submit">
          Create timer <Timer size={16} />
        </Button>
      </form>
      <div className="feature-grid">
        <div className="portal-card">
          <Timer size={22} />
          <h3>Persistent sessions</h3>
          <p>
            Learners can pause, resume, finish, and log rounds without losing
            their state.
          </p>
        </div>
        <div className="portal-card">
          <Bell size={22} />
          <h3>Audio and vibration cues</h3>
          <p>
            Use the configuration to define attention cues across mobile and
            desktop.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}

export function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [report, setReport] = useState<any[]>([]);
  useEffect(() => {
    get<any>('/instructor/analytics')
      .then(setData)
      .catch(() => undefined);
    get<any[]>('/instructor/reports/enrollments')
      .then(setReport)
      .catch(() => undefined);
  }, []);
  return (
    <PortalLayout section="Analytics">
      <PageHeader
        title="Analytics"
        description="See sales, enrollment, watch time, completion, and lesson engagement."
        action={
          <Button
            variant="secondary"
            onClick={() =>
              window.open(
                'data:text/json;charset=utf-8,' +
                  encodeURIComponent(JSON.stringify(report)),
                '_blank',
              )
            }
          >
            Export enrollment report
          </Button>
        }
      />
      <div className="portal-stats">
        <Stat
          label="Enrollments"
          value={data?.enrollments ?? data?.totalEnrollments ?? '—'}
        />
        <Stat label="Watch time" value={data?.watchTime ?? '—'} />
        <Stat
          label="Completion"
          value={data?.completionRate ? `${data.completionRate}%` : '—'}
        />
      </div>
      <pre className="analytics-json">
        {data ? JSON.stringify(data, null, 2) : 'Loading analytics…'}
      </pre>
    </PortalLayout>
  );
}

export function BrandingPage() {
  const [settings, setSettings] = useState<any>({});
  const [themes, setThemes] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    get<any>('/tenant/settings')
      .then((value) => setSettings(value || {}))
      .catch(() => undefined);
    get<any[]>('/tenant/themes')
      .then(setThemes)
      .catch(() => undefined);
  }, []);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await patch('/tenant/settings', settings);
      setMessage('Branding draft saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save branding');
    }
  };
  return (
    <PortalLayout section="Branding">
      <PageHeader
        title="Branding studio"
        description="Layer your brand over a base theme, preview it, then publish a versioned revision."
      />
      <Notice error={error} success={message} />
      <form className="portal-form branding-form" onSubmit={save}>
        <Field
          label="Brand name"
          value={settings.brandName || ''}
          onChange={(value) => setSettings({ ...settings, brandName: value })}
        />
        <Field
          label="Browser title"
          value={settings.browserTitle || ''}
          onChange={(value) =>
            setSettings({ ...settings, browserTitle: value })
          }
        />
        <Field
          label="Primary color"
          value={settings.primaryColor || ''}
          onChange={(value) =>
            setSettings({ ...settings, primaryColor: value })
          }
          placeholder="Use a CSS color"
        />
        <Field
          label="Logo URL"
          value={settings.logoUrl || ''}
          onChange={(value) => setSettings({ ...settings, logoUrl: value })}
        />
        <label className="field">
          <span>Base theme</span>
          <select
            className="input"
            value={settings.baseThemeId || ''}
            onChange={(e) =>
              setSettings({ ...settings, baseThemeId: e.target.value })
            }
          >
            <option value="">Default theme</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">
          Save draft <Check size={16} />
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await post('/tenant/settings/publish');
              setMessage('Branding published.');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Unable to publish');
            }
          }}
        >
          Publish changes
        </Button>
      </form>
      <section className="portal-section-block">
        <h2>Theme library</h2>
        <div className="theme-grid">
          {themes.map((theme) => (
            <div className="portal-card" key={theme.id}>
              <span className="card-kicker">Theme</span>
              <h3>{theme.name}</h3>
              <p>{theme.description}</p>
            </div>
          ))}
        </div>
      </section>
    </PortalLayout>
  );
}

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    get<any[]>('/users')
      .then(setUsers)
      .catch(() => undefined);
  }, []);
  return (
    <PortalLayout section="People">
      <PageHeader
        title="People"
        description="Manage learners and collaborators in this tenant."
      />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.firstName} {user.lastName}
                </td>
                <td>{user.email}</td>
                <td>
                  {user.userRoles
                    ?.map((role: any) => role.role?.name)
                    .join(', ')}
                </td>
                <td>{user.status}</td>
                <td>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      patch(`/users/${user.id}`, { status: 'SUSPENDED' }).then(
                        () => undefined,
                      )
                    }
                  >
                    Suspend
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalLayout>
  );
}

export function PublicCoursePage({
  tenantSlug,
  courseSlug,
}: {
  tenantSlug: string;
  courseSlug: string;
}) {
  const [course, setCourse] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    get<any>(
      `/public/${encodeURIComponent(tenantSlug)}/courses/${encodeURIComponent(courseSlug)}`,
      { auth: false },
    )
      .then(setCourse)
      .catch((e) => setError(e.message));
  }, [tenantSlug, courseSlug]);
  if (error)
    return (
      <PortalLayout>
        <Notice error={error} />
      </PortalLayout>
    );
  if (!course)
    return (
      <PortalLayout>
        <Loading />
      </PortalLayout>
    );
  const preview = [
    ...(course.modules || []).flatMap((module: any) => module.lessons || []),
    ...(course.lessons || []),
  ];
  return (
    <main className="ds-nocturne public-course">
      <header className="site-nav nav">
        <a className="nav-brand brand-lockup" href={`/public/${tenantSlug}`}>
          <span className="brand-mark">
            <Sparkle size={15} weight="fill" />
          </span>
          <span>{course.tenant?.name || 'Coaching site'}</span>
        </a>
        <a className="btn btn-secondary" href="/login">
          Sign in
        </a>
      </header>
      <section className="content-frame public-course-hero">
        <p className="eyebrow">
          <span className="eyebrow-line" />
          Course overview
        </p>
        <h1>{course.title}</h1>
        <p>
          {course.description ||
            'A structured, practical path with focused lessons.'}
        </p>
        <div className="course-purchase">
          <strong>
            {course.price
              ? `${course.currency || 'EUR'} ${course.price}`
              : 'Available now'}
          </strong>
          <Button
            variant="secondary"
            onClick={() =>
              window.alert(
                'POK checkout will be connected when the merchant API is available.',
              )
            }
          >
            Purchase with POK <ArrowRight size={16} />
          </Button>
        </div>
      </section>
      <section className="content-frame preview-section">
        <div className="section-title-row">
          <h2>Preview lessons</h2>
          <span className="text-muted">{preview.length} available</span>
        </div>
        {preview.map((lesson: any) => (
          <div className="lesson-row" key={lesson.id}>
            <span className="lesson-status">
              <Play size={13} weight="fill" />
            </span>
            <span>
              <strong>{lesson.libraryItem?.title || 'Preview lesson'}</strong>
              <small>
                {lesson.libraryItem?.description ||
                  'Try this free preview before you decide.'}
              </small>
            </span>
            <a
              className="btn btn-ghost"
              href={`/public/${tenantSlug}/preview/${lesson.id}`}
            >
              Preview <ArrowRight size={15} />
            </a>
          </div>
        ))}
      </section>
    </main>
  );
}

export function ReportPage({ entityId }: { entityId: string }) {
  const [form, setForm] = useState({
    entityType: 'COURSE_LESSON',
    entityId,
    reason: '',
  });
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await post('/learning/reports', form);
      setMessage('Thank you. Your report has been submitted for review.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to submit report');
    }
  };
  return (
    <PortalLayout section="Report content">
      <PageHeader
        title="Report content"
        description="Tell the instructor or platform team what needs attention."
      />
      <Notice
        success={message}
        error={message.includes('Unable') ? message : undefined}
      />
      <form className="portal-form" onSubmit={submit}>
        <Field
          label="Content ID"
          value={form.entityId}
          onChange={(value) => setForm({ ...form, entityId: value })}
          required
        />
        <Field
          label="Reason"
          value={form.reason}
          onChange={(value) => setForm({ ...form, reason: value })}
          required
        />
        <Button type="submit">
          Submit report <ArrowRight size={16} />
        </Button>
      </form>
    </PortalLayout>
  );
}

export function TimerSessionPage({ timerId }: { timerId: string }) {
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState('');
  const start = async () => {
    try {
      setSession(await post(`/timers/${timerId}/sessions`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start timer');
    }
  };
  const action = async (name: 'pause' | 'resume' | 'finish') => {
    if (!session) return;
    try {
      setSession(await post(`/timers/sessions/${session.id}/${name}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Timer action failed');
    }
  };
  return (
    <PortalLayout section="Timer">
      <PageHeader
        eyebrow="Focused session"
        title="Your timer"
        description="Timer state is persisted so you can leave and return without losing your place."
      />
      <Notice error={error} />
      <div className="timer-surface">
        <span className="timer-label">{session?.status || 'READY'}</span>
        <strong>{session?.remainingSeconds ?? '00:00'}</strong>
        {session ? (
          <div className="button-row">
            <Button onClick={() => action('pause')}>Pause</Button>
            <Button variant="secondary" onClick={() => action('resume')}>
              Resume
            </Button>
            <Button variant="ghost" onClick={() => action('finish')}>
              Finish
            </Button>
          </div>
        ) : (
          <Button onClick={start}>
            <Timer size={18} />
            Start timer
          </Button>
        )}
      </div>
      {session && (
        <form
          className="portal-form timer-round-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await post(`/timers/sessions/${session.id}/rounds`, {
              roundNumber: Number(form.get('roundNumber')),
              value: String(form.get('value')),
            });
          }}
        >
          <Field
            label="Round number"
            value="1"
            onChange={() => undefined}
            type="number"
          />
          <Field label="Round note" value="" onChange={() => undefined} />
          <Button type="submit">Log round</Button>
        </form>
      )}
    </PortalLayout>
  );
}

export function SecurityPage() {
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<any>(null);
  const begin = async () => {
    try {
      setSetup(await post('/auth/mfa/setup'));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to start MFA setup');
    }
  };
  const confirm = async () => {
    try {
      await post('/auth/mfa/confirm', { code });
      setMessage('MFA enabled.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Invalid MFA code');
    }
  };
  return (
    <PortalLayout section="Security">
      <PageHeader
        title="Security"
        description="Protect your coaching or learning account with MFA and password controls."
      />
      <Notice
        success={message}
        error={message && !message.includes('enabled') ? message : undefined}
      />
      <div className="security-card portal-card">
        <LockKey size={24} />
        <h2>Multi-factor authentication</h2>
        <p>Add a time-based code to protect sign-ins.</p>
        {setup ? (
          <>
            <code className="secret-code">{setup.secret}</code>
            <Field label="Six-digit code" value={code} onChange={setCode} />
            <Button onClick={confirm}>Confirm MFA</Button>
          </>
        ) : (
          <Button variant="secondary" onClick={begin}>
            Set up MFA
          </Button>
        )}
      </div>
      <PasswordChange />
    </PortalLayout>
  );
}
function PasswordChange() {
  const [values, setValues] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [message, setMessage] = useState('');
  return (
    <form
      className="portal-form"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await patch('/account/password', values);
          setMessage('Password changed.');
        } catch (e) {
          setMessage(
            e instanceof Error ? e.message : 'Unable to change password',
          );
        }
      }}
    >
      <h2>Change password</h2>
      <Field
        label="Current password"
        value={values.currentPassword}
        onChange={(value) => setValues({ ...values, currentPassword: value })}
        type="password"
        required
      />
      <Field
        label="New password"
        value={values.newPassword}
        onChange={(value) => setValues({ ...values, newPassword: value })}
        type="password"
        required
      />
      <Button type="submit">Update password</Button>
      <small>{message}</small>
    </form>
  );
}

export function AssetPage({ lessonId }: { lessonId: string }) {
  const [message, setMessage] = useState('');
  const [video, setVideo] = useState({
    fileName: '',
    videoUrl: '',
    streamingFormat: 'HLS',
  });
  const [file, setFile] = useState({
    name: '',
    url: '',
    type: 'handout',
    size: '1',
  });
  return (
    <PortalLayout section="Lesson assets">
      <PageHeader
        title="Lesson assets"
        description="Register streaming video and protected documents with this lesson."
      />
      <Notice success={message} />
      <form
        className="portal-form"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await post(`/instructor/lessons/${lessonId}/videos`, {
              ...video,
              duration: 1,
            });
            setMessage('Video asset registered.');
          } catch (e) {
            setMessage(
              e instanceof Error ? e.message : 'Unable to register video',
            );
          }
        }}
      >
        <h2>Streaming video</h2>
        <Field
          label="File name"
          value={video.fileName}
          onChange={(value) => setVideo({ ...video, fileName: value })}
          required
        />
        <Field
          label="HLS/DASH URL"
          value={video.videoUrl}
          onChange={(value) => setVideo({ ...video, videoUrl: value })}
          required
        />
        <Button type="submit">
          Register video <Play size={16} />
        </Button>
      </form>
      <form
        className="portal-form"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await post(`/instructor/lessons/${lessonId}/files`, {
              ...file,
              size: Number(file.size),
            });
            setMessage('Protected document registered.');
          } catch (e) {
            setMessage(
              e instanceof Error ? e.message : 'Unable to register document',
            );
          }
        }}
      >
        <h2>Protected document</h2>
        <Field
          label="Name"
          value={file.name}
          onChange={(value) => setFile({ ...file, name: value })}
          required
        />
        <Field
          label="Storage URL"
          value={file.url}
          onChange={(value) => setFile({ ...file, url: value })}
          required
        />
        <Field
          label="Size in bytes"
          value={file.size}
          onChange={(value) => setFile({ ...file, size: value })}
          type="number"
          required
        />
        <Button type="submit">Add view-only document</Button>
      </form>
    </PortalLayout>
  );
}

export function DomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [domain, setDomain] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    get<any[]>('/tenant/domains')
      .then(setDomains)
      .catch(() => undefined);
  }, []);
  const add = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const created = await post<any>('/tenant/domains', { domain });
      setDomains([created, ...domains]);
      setDomain('');
      setMessage('Domain added and awaiting verification.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to add domain');
    }
  };
  return (
    <PortalLayout section="Domains">
      <PageHeader
        title="Domains"
        description="Connect a branded subdomain or verified custom domain to this coaching site."
      />
      <Notice
        success={message}
        error={message.includes('Unable') ? message : undefined}
      />
      <form className="toolbar" onSubmit={add}>
        <Field
          label="Custom domain"
          value={domain}
          onChange={setDomain}
          placeholder="coach.example.com"
          required
        />
        <Button type="submit">
          Add domain <Plus size={16} />
        </Button>
      </form>
      <div className="portal-card-grid">
        {domains.map((item) => (
          <div className="portal-card" key={item.id}>
            <h3>{item.domain}</h3>
            <span className="tag tag-neutral">SSL {item.sslStatus}</span>
            <p>{item.verified ? 'Verified' : 'Verification required'}</p>
          </div>
        ))}
      </div>
    </PortalLayout>
  );
}

export function ThemeRevisionsPage() {
  const [revisions, setRevisions] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  useEffect(() => {
    get<any[]>('/tenant/theme-revisions')
      .then(setRevisions)
      .catch(() => undefined);
  }, []);
  return (
    <PortalLayout section="Brand revisions">
      <PageHeader
        title="Theme revisions"
        description="Review published branding versions and roll back safely."
      />
      <Notice success={message} />
      <div className="portal-card-grid">
        {revisions.map((revision) => (
          <div className="portal-card" key={revision.id}>
            <span className="card-kicker">Version {revision.version}</span>
            <h3>
              {revision.createdAt
                ? new Date(revision.createdAt).toLocaleDateString()
                : 'Published revision'}
            </h3>
            <Button
              variant="secondary"
              onClick={() =>
                post(`/tenant/theme-revisions/${revision.id}/rollback`)
                  .then(() => setMessage('Revision restored.'))
                  .catch((e) => setMessage(e.message))
              }
            >
              Restore revision
            </Button>
          </div>
        ))}
      </div>
    </PortalLayout>
  );
}

export function PreferencesPage() {
  const [preferences, setPreferences] = useState<any>({});
  const [message, setMessage] = useState('');
  useEffect(() => {
    get<any>('/account/notification-preferences')
      .then(setPreferences)
      .catch(() => undefined);
  }, []);
  const save = async () => {
    try {
      await patch('/account/notification-preferences', preferences);
      setMessage('Notification preferences saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to save preferences');
    }
  };
  return (
    <PortalLayout section="Preferences">
      <PageHeader
        title="Notification preferences"
        description="Choose how reminders and new content updates reach you."
      />
      <Notice success={message} />
      <div className="portal-form">
        <label className="radio">
          <input
            type="checkbox"
            checked={preferences.remindersEnabled ?? true}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                remindersEnabled: e.target.checked,
              })
            }
          />
          <span className="dot" />
          Continue learning reminders
        </label>
        <label className="radio">
          <input
            type="checkbox"
            checked={preferences.contentPublished ?? true}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                contentPublished: e.target.checked,
              })
            }
          />
          <span className="dot" />
          New content announcements
        </label>
        <Button onClick={save}>
          Save preferences <Check size={16} />
        </Button>
      </div>
    </PortalLayout>
  );
}

export function DocumentsPage({ fileId }: { fileId: string }) {
  const [viewer, setViewer] = useState<any>(null);
  const [error, setError] = useState('');
  const open = async () => {
    try {
      const access = await post<any>(`/learning/documents/${fileId}/access`);
      setViewer(
        await get<any>(
          `/learning/documents/${fileId}/viewer?token=${encodeURIComponent(access.token)}`,
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to open protected document',
      );
    }
  };
  return (
    <PortalLayout section="Protected document">
      <PageHeader
        title="View-only document"
        description="This document is served through a short-lived, watermarked session. Downloading is not available."
      />
      <Notice error={error} />
      {viewer ? (
        <div className="document-viewer">
          <div className="document-watermark">{viewer.watermarkText}</div>
          <iframe title={viewer.name} src={viewer.url} />
        </div>
      ) : (
        <Button onClick={open}>
          <LockKey size={16} />
          Open protected viewer
        </Button>
      )}
    </PortalLayout>
  );
}

export function TimerAttachmentPage() {
  const [form, setForm] = useState({
    scope: 'course',
    targetId: '',
    timerId: '',
  });
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const targets = {
      lesson: `/instructor/lessons/${form.targetId}/timers/${form.timerId}`,
      module: `/instructor/modules/${form.targetId}/timers/${form.timerId}`,
      course: `/instructor/courses/${form.targetId}/timers/${form.timerId}`,
    };
    try {
      await post(targets[form.scope as keyof typeof targets]);
      setMessage('Timer attached.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to attach timer');
    }
  };
  return (
    <PortalLayout section="Timer attachment">
      <PageHeader
        title="Attach a timer"
        description="Attach a configured timer to a lesson, module, or whole course."
      />
      <Notice
        success={message}
        error={message.includes('Unable') ? message : undefined}
      />
      <form className="portal-form" onSubmit={submit}>
        <label className="field">
          <span>Attach to</span>
          <select
            className="input"
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value })}
          >
            <option value="lesson">Lesson</option>
            <option value="module">Module</option>
            <option value="course">Course</option>
          </select>
        </label>
        <Field
          label="Target ID"
          value={form.targetId}
          onChange={(value) => setForm({ ...form, targetId: value })}
          required
        />
        <Field
          label="Timer ID"
          value={form.timerId}
          onChange={(value) => setForm({ ...form, timerId: value })}
          required
        />
        <Button type="submit">
          Attach timer <Timer size={16} />
        </Button>
      </form>
    </PortalLayout>
  );
}

export function ThemeAdminPage() {
  const [themes, setThemes] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    tokenJson: '{"colors":{}}',
  });
  useEffect(() => {
    get<any[]>('/tenant/themes')
      .then(setThemes)
      .catch(() => undefined);
  }, []);
  const create = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const theme = await post<any>('/tenant/themes', {
        ...form,
        tokenJson: JSON.parse(form.tokenJson),
      });
      setThemes([...themes, theme]);
      setMessage('Theme created.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to create theme');
    }
  };
  return (
    <PortalLayout section="Theme library">
      <PageHeader
        title="Platform theme library"
        description="Publish reusable base themes without overwriting tenant overrides."
      />
      <Notice
        success={message}
        error={message.includes('Unable') ? message : undefined}
      />
      <form className="portal-form" onSubmit={create}>
        <Field
          label="Theme name"
          value={form.name}
          onChange={(value) => setForm({ ...form, name: value })}
          required
        />
        <Field
          label="Description"
          value={form.description}
          onChange={(value) => setForm({ ...form, description: value })}
        />
        <label className="field">
          <span>Token JSON</span>
          <textarea
            className="input"
            value={form.tokenJson}
            onChange={(e) => setForm({ ...form, tokenJson: e.target.value })}
          />
        </label>
        <Button type="submit">
          Publish theme <Plus size={16} />
        </Button>
      </form>
      <div className="theme-grid">
        {themes.map((theme) => (
          <div className="portal-card" key={theme.id}>
            <span className="card-kicker">Base theme</span>
            <h3>{theme.name}</h3>
            <p>{theme.description}</p>
          </div>
        ))}
      </div>
    </PortalLayout>
  );
}

export function AdminPage({ reports = false }: { reports?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    get<any[]>(reports ? '/admin/reports' : '/admin/tenants')
      .then(setItems)
      .catch(() => undefined);
  }, [reports]);
  return (
    <PortalLayout section="Platform administration">
      <PageHeader
        title={reports ? 'Content reports' : 'Tenant accounts'}
        description={
          reports
            ? 'Review and resolve moderation reports.'
            : 'Manage instructor sites and access.'
        }
      />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {reports ? (
                <>
                  <th>Entity</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th />
                </>
              ) : (
                <>
                  <th>Tenant</th>
                  <th>Status</th>
                  <th>Users</th>
                  <th>Courses</th>
                  <th />
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) =>
              reports ? (
                <tr key={item.id}>
                  <td>
                    {item.entityType} · {item.entityId}
                  </td>
                  <td>{item.reason}</td>
                  <td>{item.status}</td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        patch(`/admin/reports/${item.id}`, {
                          status: 'RESOLVED',
                          resolutionNote: 'Reviewed in platform console.',
                        }).then(() => undefined)
                      }
                    >
                      Resolve
                    </Button>
                  </td>
                </tr>
              ) : (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.status}</td>
                  <td>{item._count?.users ?? 0}</td>
                  <td>{item._count?.courses ?? 0}</td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        patch(`/admin/tenants/${item.id}/status`, {
                          status:
                            item.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                        }).then(() => undefined)
                      }
                    >
                      Change status
                    </Button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </PortalLayout>
  );
}

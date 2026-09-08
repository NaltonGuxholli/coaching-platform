import { useState } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  Clock,
  Play,
  Timer,
  WarningCircle,
} from '@phosphor-icons/react';
import { get, patch, post } from '../client';
import { useData, formatDate } from './data';
import { Shell } from './shell';
import {
  Button,
  DataTable,
  Empty,
  ErrorState,
  Loading,
  Notice,
  PageHeader,
  Panel,
  SearchBox,
  Stat,
} from './components';
import { navigate } from './router';
import type { Course, RecordValue } from './model';
export function LearnerOverview() {
  const resource = useData<RecordValue[]>('/learning/my-courses');
  const courses = resource.data || [];
  const lessons = courses.reduce(
    (sum, item) =>
      sum +
      Number(
        item.course?.progressRecords?.filter(
          (row: RecordValue) => row.completed,
        ).length || 0,
      ),
    0,
  );
  return (
    <Shell section="Learning overview">
      <PageHeader
        kicker="Your learning space"
        title="Keep your momentum."
        description="A clear view of what you are learning, what is next, and the habits that keep progress moving."
        actions={
          <Button onClick={() => navigate('/learn/courses')}>
            Browse programs <ArrowRight size={16} />
          </Button>
        }
      />
      <div className="app-stat-grid">
        <Stat
          label="Active programs"
          value={courses.length}
          detail="In your library"
          accent
        />
        <Stat
          label="Lessons completed"
          value={lessons}
          detail="Across all programs"
        />
        <Stat
          label="Focus this week"
          value="3h 20m"
          detail="Based on sessions"
        />
        <Stat
          label="Next milestone"
          value={courses.length ? 'Ready' : 'Start'}
          detail="Your next useful action"
        />
      </div>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState message={resource.error} />
      ) : (
        <div className="learner-course-grid">
          {courses.map((enrollment) => (
            <article className="learner-course" key={enrollment.course?.id}>
              <div className="learner-course-art">
                <span>
                  {enrollment.course?.title?.slice(0, 2).toUpperCase()}
                </span>
                <Play size={20} weight="fill" />
              </div>
              <div className="learner-course-body">
                <span className="app-kicker">
                  {enrollment.status || 'Active program'}
                </span>
                <h2>{enrollment.course?.title}</h2>
                <p>
                  {enrollment.course?.description ||
                    'A structured path for meaningful progress.'}
                </p>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${enrollment.course?.progress?.percentage || 0}%`,
                    }}
                  />
                </div>
                <small>
                  {Math.round(enrollment.course?.progress?.percentage || 0)}%
                  complete
                </small>
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate(`/learn/courses/${enrollment.course?.id}`)
                  }
                >
                  Continue <ArrowRight size={16} />
                </Button>
              </div>
            </article>
          ))}
          {!courses.length && (
            <Empty
              title="Your library is waiting"
              description="Enrol in a program to make your first lesson visible."
            />
          )}
        </div>
      )}
    </Shell>
  );
}
export function LearnerPrograms() {
  const resource = useData<RecordValue[]>('/learning/my-courses');
  const [query, setQuery] = useState('');
  const items = (resource.data || []).filter(
    (item) =>
      !query || item.course?.title?.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Shell section="My programs">
      <PageHeader
        kicker="Learning library"
        title="Your programs."
        description="Return to a course, follow the path, and keep your next lesson close."
        actions={
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Find a program"
          />
        }
      />
      {resource.loading ? (
        <Loading />
      ) : (
        <DataTable
          columns={['Program', 'Status', 'Progress', 'Last opened', '']}
          rows={items.map((item) => [
            <strong key="title">{item.course?.title}</strong>,
            item.status || 'Active',
            `${Math.round(item.course?.progress?.percentage || 0)}%`,
            formatDate(item.updatedAt),
            <button
              className="app-row-action"
              key="open"
              onClick={() => navigate(`/learn/courses/${item.course?.id}`)}
            >
              <ArrowRight size={16} />
            </button>,
          ])}
        />
      )}
    </Shell>
  );
}
export function LearningCalendar() {
  return (
    <Shell section="Calendar">
      <PageHeader
        kicker="Practice rhythm"
        title="Make room for the work."
        description="A lightweight rhythm for lessons, timers, and reflection."
        actions={
          <Button
            onClick={() => navigate('/instructor/timers')}
            variant="secondary"
          >
            <Timer size={16} /> Explore timers
          </Button>
        }
      />
      <div className="calendar-layout">
        <Panel>
          <div className="calendar-heading">
            <button>←</button>
            <strong>September 2026</strong>
            <button>→</button>
          </div>
          <div className="calendar-grid">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day) => (
              <span className="calendar-day" key={day}>
                {day}
              </span>
            ))}
            {Array.from({ length: 30 }, (_, index) => (
              <button
                className={
                  index === 7 || index === 16
                    ? 'calendar-date has-event'
                    : 'calendar-date'
                }
                key={index}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </Panel>
        <Panel>
          <span className="app-kicker">Today</span>
          <h2>Your next session</h2>
          <div className="calendar-event">
            <Clock size={20} />
            <span>
              <strong>Focused practice</strong>
              <small>25 minutes · Ready when you are</small>
            </span>
            <ArrowRight size={16} />
          </div>
          <div className="calendar-event">
            <BookOpen size={20} />
            <span>
              <strong>Continue a lesson</strong>
              <small>Pick up where you left off</small>
            </span>
            <ArrowRight size={16} />
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
export function LearnerNotifications() {
  const resource = useData<RecordValue[]>('/learning/notifications');
  return (
    <Shell section="Inbox">
      <PageHeader
        kicker="Stay close"
        title="Notifications."
        description="The moments that need your attention."
      />
      {resource.loading ? (
        <Loading />
      ) : (
        <div className="notification-stack">
          {(resource.data || []).map((item) => (
            <button
              className="notification-row"
              key={item.id}
              onClick={() =>
                patch(`/learning/notifications/${item.id}/read`).then(
                  resource.reload,
                )
              }
            >
              <Bell size={20} />
              <span>
                <strong>{item.title}</strong>
                <small>{item.message}</small>
              </span>
              <ArrowRight size={16} />
            </button>
          ))}
          {!resource.data?.length && (
            <Empty
              title="All clear"
              description="New updates will appear here."
            />
          )}
        </div>
      )}
    </Shell>
  );
}
export function LearnerReport() {
  const [entityId, setEntityId] = useState('');
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <Shell section="Trust and safety">
      <PageHeader
        kicker="Trust and safety"
        title="Report content."
        description="Help keep the learning environment useful and respectful."
      />
      <Panel className="narrow-panel">
        <div className="app-form-stack">
          <label className="app-field">
            <span>Entity ID</span>
            <input
              value={entityId}
              onChange={(event) => setEntityId(event.target.value)}
            />
          </label>
          <label className="app-field">
            <span>What should we know?</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={6}
            />
          </label>
          <Button
            onClick={() =>
              post('/learning/reports', { entityId, reason }).then(() =>
                setSent(true),
              )
            }
          >
            Submit report <ArrowRight size={16} />
          </Button>
          {sent && <Notice>Report submitted to the moderation queue.</Notice>}
        </div>
      </Panel>
    </Shell>
  );
}
export function LearningCoursePage({ courseId }: { courseId: string }) {
  const resource = useData<Course>(`/learning/courses/${courseId}`);
  const lessons =
    resource.data?.lessons ||
    resource.data?.modules?.flatMap(
      (module: RecordValue) => module.lessons || [],
    ) ||
    [];
  const [notice, setNotice] = useState('');
  return (
    <Shell section="Course path">
      <PageHeader
        kicker="Learning path"
        title={resource.data?.title || 'Course'}
        description={resource.data?.description}
        actions={
          <Button
            onClick={async () => {
              const order = await post<any>('/payments/orders', { courseId });
              await post('/payments/pok/checkout', { orderId: order.id });
              setNotice('Checkout started.');
            }}
          >
            Purchase access
          </Button>
        }
      />
      {notice && <Notice>{notice}</Notice>}
      {resource.loading ? (
        <Loading />
      ) : (
        <Panel>
          <div className="lesson-list">
            {lessons.map((lesson: RecordValue, index: number) => (
              <button
                key={lesson.id}
                onClick={() => navigate(`/learn/lessons/${lesson.id}`)}
              >
                <span className="lesson-count">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>
                  <strong>
                    {lesson.libraryItem?.title || lesson.title || 'Lesson'}
                  </strong>
                  <small>{lesson.libraryItem?.duration || 0} minutes</small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        </Panel>
      )}
    </Shell>
  );
}
export function LessonPage({ lessonId }: { lessonId: string }) {
  const [video, setVideo] = useState<RecordValue | null>(null);
  const [error, setError] = useState('');
  return (
    <Shell section="Lesson">
      <PageHeader
        kicker="Focused practice"
        title="One useful next step."
        description="Stay with the lesson, then mark the progress you made."
      />
      <Panel className="lesson-player">
        <div className="lesson-video">
          {video ? (
            <video
              controls
              autoPlay
              src={`/api/learning/videos/${lessonId}/playback?token=${encodeURIComponent(video.token)}`}
            />
          ) : (
            <button
              onClick={async () => {
                try {
                  setVideo(
                    await post<RecordValue>(
                      `/learning/videos/${lessonId}/access`,
                    ),
                  );
                } catch (reason) {
                  setError(
                    reason instanceof Error
                      ? reason.message
                      : 'Playback unavailable',
                  );
                }
              }}
            >
              <Play size={30} weight="fill" />
              <strong>Start protected playback</strong>
            </button>
          )}
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="app-actions">
          <Button
            variant="secondary"
            onClick={() =>
              patch(`/learning/lessons/${lessonId}/progress`, {
                watchedSeconds: 1,
                completed: true,
              })
            }
          >
            <Check size={16} /> Mark complete
          </Button>
          <Button variant="ghost" onClick={() => navigate('/learn')}>
            Back to learning
          </Button>
        </div>
      </Panel>
    </Shell>
  );
}

import { FormEvent, useState } from 'react';
import {
  ArrowRight,
  ChartLineUp,
  Check,
  CloudArrowUp,
  DownloadSimple,
  Play,
  Plus,
  Timer,
  Users,
  Wallet,
} from '@phosphor-icons/react';
import { del, patch, post } from '../client';
import { downloadText } from '../downloads';
import { useData, formatDate, formatMoney } from './data';
import { Shell } from './shell';
import {
  Button,
  DataTable,
  Empty,
  ErrorState,
  Input,
  Loading,
  Notice,
  PageHeader,
  Panel,
  SearchBox,
  Stat,
} from './components';
import { navigate } from './router';
import type { Course, RecordValue } from './model';
export function InstructorOverview() {
  const courses = useData<Course[]>('/instructor/courses');
  const analytics = useData<RecordValue>('/instructor/analytics');
  const payouts = useData<RecordValue[]>('/instructor/payouts');
  return (
    <Shell section="Instructor overview">
      <PageHeader
        kicker="Instructor workspace"
        title="Build what matters."
        description="Your coaching business at a glance."
        actions={
          <Button onClick={() => navigate('/instructor/courses/new')}>
            <Plus size={16} /> New course
          </Button>
        }
      />
      <div className="app-stat-grid">
        <Stat
          label="Published courses"
          value={
            courses.data?.filter((course) => course.status === 'PUBLISHED')
              .length || 0
          }
          detail="Ready for learners"
          accent
        />
        <Stat
          label="Active learners"
          value={analytics.data?.enrollments || 0}
          detail="Across your programs"
        />
        <Stat
          label="Payout records"
          value={payouts.data?.length || 0}
          detail="Scheduled movement"
        />
        <Stat
          label="Completion rate"
          value={`${Math.round(analytics.data?.completionRate || 0)}%`}
          detail="Course average"
        />
      </div>
      <div className="split-panels">
        <Panel>
          <div className="panel-heading">
            <span className="app-kicker">Your catalog</span>
            <button
              className="link-button"
              onClick={() => navigate('/instructor/courses')}
            >
              View all <ArrowRight size={15} />
            </button>
          </div>
          {courses.loading ? (
            <Loading />
          ) : (
            <DataTable
              columns={['Course', 'Status', 'Learners', '']}
              rows={(courses.data || []).slice(0, 6).map((course) => [
                <strong key="title">{course.title}</strong>,
                <span className="status-pill">{course.status}</span>,
                course._count?.enrollments || 0,
                <button
                  className="app-row-action"
                  key="open"
                  onClick={() => navigate(`/instructor/courses/${course.id}`)}
                >
                  <ArrowRight size={16} />
                </button>,
              ])}
            />
          )}
        </Panel>
        <Panel className="accent-panel">
          <span className="app-kicker">Operating rhythm</span>
          <h2>Small systems. Durable progress.</h2>
          <p>
            Keep lessons clear, feedback close, and the next action visible.
          </p>
          <Button
            variant="secondary"
            onClick={() => navigate('/instructor/analytics')}
          >
            Read the signal <ChartLineUp size={16} />
          </Button>
        </Panel>
      </div>
    </Shell>
  );
}
export function CourseCatalog({ create = false }: { create?: boolean }) {
  const resource = useData<Course[]>('/instructor/courses');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notice, setNotice] = useState('');
  const createCourse = async (event: FormEvent) => {
    event.preventDefault();
    const course = await post<Course>('/instructor/courses', {
      title,
      description,
    });
    setNotice('Draft created.');
    navigate(`/instructor/courses/${course.id}`);
  };
  return (
    <Shell section="Courses">
      <PageHeader
        kicker="Content studio"
        title="Your course catalog."
        description="Shape programs from idea to published experience."
        actions={
          <Button onClick={() => navigate('/instructor/courses/new')}>
            <Plus size={16} /> Create course
          </Button>
        }
      />
      {(create || notice) && (
        <Panel className="create-panel">
          <span className="app-kicker">Start a draft</span>
          <h2>New course</h2>
          {notice && <Notice>{notice}</Notice>}
          <form className="app-form-stack" onSubmit={createCourse}>
            <Input label="Course title" value={title} onChange={setTitle} />
            <Input
              label="Description"
              value={description}
              onChange={setDescription}
            />
            <Button type="submit">
              Create draft <ArrowRight size={16} />
            </Button>
          </form>
        </Panel>
      )}
      {resource.loading ? (
        <Loading />
      ) : (
        <DataTable
          columns={['Title', 'Status', 'Price', 'Updated', '']}
          rows={(resource.data || []).map((course) => [
            <strong key="title">{course.title}</strong>,
            <span className="status-pill">{course.status}</span>,
            formatMoney(course.price, course.currency),
            formatDate(course.updatedAt),
            <button
              className="app-row-action"
              key="open"
              onClick={() => navigate(`/instructor/courses/${course.id}`)}
            >
              <ArrowRight size={16} />
            </button>,
          ])}
        />
      )}
    </Shell>
  );
}
export function CourseEditor({ courseId }: { courseId: string }) {
  const resource = useData<RecordValue>(
    `/instructor/courses/${courseId}/builder`,
  );
  const course = resource.data;
  const [moduleTitle, setModuleTitle] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [notice, setNotice] = useState('');
  const action = async (name: string, body?: RecordValue) => {
    await post(`/instructor/courses/${courseId}/${name}`, body);
    setNotice('Course updated.');
    resource.reload();
  };
  return (
    <Shell section="Course builder">
      <PageHeader
        kicker="Content studio"
        title={course?.title || 'Course builder'}
        description="Build structure, reusable lessons, assets, and publishing state."
        actions={
          <>
            <Button variant="secondary" onClick={() => action('duplicate')}>
              Duplicate
            </Button>
            <Button
              onClick={() =>
                action(course?.status === 'PUBLISHED' ? 'unpublish' : 'publish')
              }
            >
              {course?.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
            </Button>
          </>
        }
      />
      {notice && <Notice>{notice}</Notice>}
      {resource.loading ? (
        <Loading />
      ) : (
        <div className="split-panels">
          <Panel>
            <span className="app-kicker">Curriculum</span>
            <h2>{course?.modules?.length || 0} modules</h2>
            <form
              className="inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void action('modules', { title: moduleTitle });
                setModuleTitle('');
              }}
            >
              <Input
                label="Module title"
                value={moduleTitle}
                onChange={setModuleTitle}
              />
              <Button type="submit">
                <Plus size={16} /> Add
              </Button>
            </form>
            {(course?.modules || []).map((module: RecordValue) => (
              <div className="module-row" key={module.id}>
                <span>
                  <strong>{module.title}</strong>
                  <small>{module.lessons?.length || 0} lessons</small>
                </span>
                <ArrowRight size={16} />
              </div>
            ))}
          </Panel>
          <Panel>
            <span className="app-kicker">Tools</span>
            <div className="tool-list">
              <button
                onClick={() =>
                  navigate(`/instructor/courses/${courseId}/preview`)
                }
              >
                <Play size={18} /> Preview course <ArrowRight size={15} />
              </button>
              <button onClick={() => navigate('/instructor/library')}>
                <CloudArrowUp size={18} /> Manage library{' '}
                <ArrowRight size={15} />
              </button>
              <button onClick={() => navigate('/instructor/timers')}>
                <Timer size={18} /> Attach a timer <ArrowRight size={15} />
              </button>
            </div>
            <div className="app-form-stack">
              <Input
                label="Reusable lesson ID"
                value={lessonId}
                onChange={setLessonId}
              />
              <Button
                variant="secondary"
                onClick={() => action('lessons', { libraryItemId: lessonId })}
              >
                Add lesson
              </Button>
            </div>
          </Panel>
        </div>
      )}
    </Shell>
  );
}
export function LibraryStudio() {
  const resource = useData<RecordValue[]>('/instructor/library');
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('VIDEO');
  const [duration, setDuration] = useState('');
  return (
    <Shell section="Lesson library">
      <PageHeader
        kicker="Reusable content"
        title="Library studio."
        description="Create once, improve centrally, use everywhere."
        actions={
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search lessons"
          />
        }
      />
      <Panel>
        <form
          className="app-form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            await post('/instructor/library', {
              title,
              type,
              duration: Number(duration) || 0,
            });
            setTitle('');
            resource.reload();
          }}
        >
          <Input label="Title" value={title} onChange={setTitle} />
          <Input label="Type" value={type} onChange={setType} />
          <Input
            label="Duration in minutes"
            value={duration}
            onChange={setDuration}
            type="number"
          />
          <Button type="submit">
            <Plus size={16} /> Add lesson
          </Button>
        </form>
      </Panel>
      <div className="spacer-18" />
      {resource.loading ? (
        <Loading />
      ) : (
        <DataTable
          columns={['Title', 'Type', 'Duration', 'Updated']}
          rows={(resource.data || [])
            .filter(
              (item) =>
                !search ||
                item.title?.toLowerCase().includes(search.toLowerCase()),
            )
            .map((item) => [
              <strong key="title">{item.title}</strong>,
              item.type,
              `${item.duration || 0} min`,
              formatDate(item.updatedAt),
            ])}
        />
      )}
    </Shell>
  );
}
export function TimerStudio() {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('300');
  const [type, setType] = useState('FOCUS');
  const [notice, setNotice] = useState('');
  return (
    <Shell section="Timer studio">
      <PageHeader
        kicker="Session design"
        title="Design the rhythm."
        description="Create focused practice sessions and attach them to your curriculum."
      />
      <Panel className="narrow-panel">
        <form
          className="app-form-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            await post('/instructor/timers', {
              name,
              durationSeconds: Number(duration),
              type,
            });
            setNotice('Timer created.');
            setName('');
          }}
        >
          <Input label="Timer name" value={name} onChange={setName} />
          <Input label="Type" value={type} onChange={setType} />
          <Input
            label="Duration in seconds"
            value={duration}
            onChange={setDuration}
            type="number"
          />
          <Button type="submit">
            <Plus size={16} /> Create timer
          </Button>
          {notice && <Notice>{notice}</Notice>}
        </form>
      </Panel>
    </Shell>
  );
}
export function AnalyticsStudio() {
  const resource = useData<RecordValue>('/instructor/analytics');
  const report = useData<RecordValue[]>('/instructor/reports/enrollments');
  return (
    <Shell section="Analytics">
      <PageHeader
        kicker="Business intelligence"
        title="Read the signal."
        description="Understand where learners move, pause, and finish."
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              downloadText(
                '/instructor/reports/enrollments',
                'enrollments.json',
              )
            }
          >
            <DownloadSimple size={16} /> Export report
          </Button>
        }
      />
      <div className="app-stat-grid">
        <Stat
          label="Enrollments"
          value={resource.data?.enrollments || 0}
          detail="Active learners"
          accent
        />
        <Stat
          label="Completion rate"
          value={`${Math.round(resource.data?.completionRate || 0)}%`}
          detail="Across courses"
        />
        <Stat
          label="Watch time"
          value={`${Math.round(resource.data?.averageWatchTime || 0)}s`}
          detail="Average lesson"
        />
        <Stat
          label="Active courses"
          value={resource.data?.courses || 0}
          detail="With recent activity"
        />
      </div>
      <Panel>
        <span className="app-kicker">Engagement trend</span>
        <div className="analytics-bars">
          {Array.from({ length: 12 }, (_, index) => (
            <i key={index} style={{ height: `${25 + ((index * 19) % 68)}%` }} />
          ))}
        </div>
      </Panel>
      <div className="spacer-18" />
      {!report.loading && (
        <DataTable
          columns={['Learner', 'Course', 'Progress']}
          rows={(report.data || [])
            .slice(0, 20)
            .map((item) => [
              item.user?.email || item.email || 'Learner',
              item.course?.title || item.courseTitle || 'Course',
              `${item.progress || 0}%`,
            ])}
        />
      )}
    </Shell>
  );
}

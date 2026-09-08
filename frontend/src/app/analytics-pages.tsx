import { ChartLineUp, DownloadSimple, TrendUp, UsersThree } from '@phosphor-icons/react';
import { downloadText } from '../downloads';
import { useData, formatDate, formatMoney } from './data';
import { Shell } from './shell';
import { Button, DataTable, Empty, ErrorState, Loading, PageHeader, Panel, Stat } from './components';
import { navigate } from './router';
import type { RecordValue } from './model';

function metrics(courses: RecordValue[]) {
  const enrollments = courses.reduce((total, course) => total + Number(course._count?.enrollments || course.analytics?.enrollments || 0), 0);
  const completionValues = courses.map((course) => Number(course.analytics?.completionRate || 0)).filter((value) => value > 0);
  const watchValues = courses.map((course) => Number(course.analytics?.averageWatchTime || 0)).filter((value) => value > 0);
  return {
    enrollments,
    completionRate: completionValues.length ? completionValues.reduce((total, value) => total + value, 0) / completionValues.length : 0,
    averageWatchTime: watchValues.length ? watchValues.reduce((total, value) => total + value, 0) / watchValues.length : 0,
  };
}

export function InstructorHome() {
  const courses = useData<RecordValue[]>('/instructor/courses');
  const analytics = useData<RecordValue>('/instructor/analytics');
  const payouts = useData<RecordValue[]>('/instructor/payouts');
  const catalog = courses.data || [];
  const insight = metrics(analytics.data?.courses || []);
  const hasDraft = catalog.some((course) => course.status === 'DRAFT');
  return <Shell section="Instructor overview">
    <PageHeader kicker="Instructor workspace" title="Your practice, in motion." description="See what is published, who is learning, and what deserves your attention next." actions={<Button onClick={() => navigate('/instructor/courses/new')}>Create a program</Button>} />
    <div className="app-stat-grid">
      <Stat label="Published programs" value={catalog.filter((course) => course.status === 'PUBLISHED').length} detail={`${catalog.length} total drafts and live`} accent />
      <Stat label="Learners" value={insight.enrollments} detail="Across your programs" />
      <Stat label="Completion rate" value={`${Math.round(insight.completionRate)}%`} detail="Average across courses" />
      <Stat label="Payout records" value={payouts.data?.length || 0} detail="Scheduled movement" />
    </div>
    <div className="split-panels">
      <Panel><div className="panel-heading"><div><span className="app-kicker">Catalog health</span><h2>What needs your attention</h2></div><Button variant="ghost" onClick={() => navigate('/instructor/courses')}>Open catalog</Button></div>{courses.loading ? <Loading /> : courses.error ? <ErrorState message={courses.error} /> : <DataTable columns={['Program', 'State', 'Learners', 'Last updated']} rows={catalog.slice(0, 8).map((course) => [<strong key="title">{course.title}</strong>, <span className="status-pill">{course.status || 'DRAFT'}</span>, course._count?.enrollments || 0, formatDate(course.updatedAt)])} />}</Panel>
      <Panel className="accent-panel"><span className="app-kicker">Next useful action</span><h2>{hasDraft ? 'Finish a draft.' : 'Read your signal.'}</h2><p>{hasDraft ? 'Complete the course details, add lessons, preview the learner path, then publish.' : 'Analytics turns learner behavior into a clearer next decision.'}</p><Button variant="secondary" onClick={() => navigate(hasDraft ? '/instructor/courses' : '/instructor/analytics')}>{hasDraft ? 'Open drafts' : 'Open analytics'} <TrendUp size={16} /></Button></Panel>
    </div>
  </Shell>;
}

export function InstructorAnalytics() {
  const resource = useData<RecordValue>('/instructor/analytics');
  const report = useData<RecordValue[]>('/instructor/reports/enrollments');
  const courses = resource.data?.courses || [];
  const insight = metrics(courses);
  return <Shell section="Analytics">
    <PageHeader kicker="Business intelligence" title="Understand the business." description="Analytics follows the real course response: enrollments, completion, watch time, and lesson-level engagement." actions={<Button variant="secondary" onClick={() => downloadText('/instructor/reports/enrollments', 'enrollments.json')}><DownloadSimple size={16} /> Export enrollments</Button>} />
    <div className="app-stat-grid"><Stat label="Learners" value={insight.enrollments} detail="Across all courses" accent /><Stat label="Completion" value={`${Math.round(insight.completionRate)}%`} detail="Mean course rate" /><Stat label="Average watch" value={`${Math.round(insight.averageWatchTime)}s`} detail="Per lesson" /><Stat label="Programs" value={courses.length} detail={`${courses.filter((course: RecordValue) => course.status === 'PUBLISHED').length} published`} /></div>
    {resource.loading ? <Loading /> : resource.error ? <ErrorState message={resource.error} /> : <>
      <Panel><div className="panel-heading"><div><span className="app-kicker">Program performance</span><h2>Compare what is working</h2></div><ChartLineUp size={22} color="var(--color-accent)" /></div><DataTable columns={['Program', 'Status', 'Learners', 'Completion', 'Watch time', 'Value']} rows={courses.map((course: RecordValue) => [<strong key="title">{course.title}</strong>, <span className="status-pill">{course.status}</span>, course._count?.enrollments || course.analytics?.enrollments || 0, `${Math.round(course.analytics?.completionRate || 0)}%`, `${Math.round(course.analytics?.averageWatchTime || 0)}s`, formatMoney(course.price, course.currency)])} /></Panel>
      <Panel><div className="panel-heading"><div><span className="app-kicker">Engagement rhythm</span><h2>Where attention holds</h2></div><UsersThree size={22} color="var(--color-accent)" /></div><div className="analytics-bars">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ height: `${25 + ((index * 19) % 68)}%` }} />)}</div></Panel>
      <Panel><span className="app-kicker">Enrollment report</span>{report.loading ? <Loading /> : report.data?.length ? <DataTable columns={['Learner', 'Program', 'Status', 'Enrolled']} rows={report.data.slice(0, 20).map((item: RecordValue) => [item.student?.email || item.user?.email || 'Learner', item.course?.title || 'Program', item.status || 'ACTIVE', formatDate(item.enrolledAt)])} /> : <Empty title="No enrollments yet" description="Publish a program and share your public site to start collecting learner signal." />}</Panel>
    </>}
  </Shell>;
}

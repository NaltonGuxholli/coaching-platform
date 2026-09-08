import { ArrowLeft, Check, Play, ShieldCheck } from '@phosphor-icons/react';
import { get } from '../client';
import { useData } from './data';
import { Shell } from './shell';
import { Button, Loading, Notice, PageHeader, Panel } from './components';
import { navigate } from './router';
import type { RecordValue } from './model';
export function CoursePreview({ courseId }: { courseId: string }) {
  const resource = useData<RecordValue>(
    `/instructor/courses/${courseId}/preview`,
  );
  const course = resource.data;
  return (
    <Shell section="Student preview">
      <PageHeader
        kicker="Before you publish"
        title={course?.title || 'Course preview'}
        description="See the learner-facing structure before this program goes live."
        actions={
          <Button
            variant="secondary"
            onClick={() => navigate(`/instructor/courses/${courseId}`)}
          >
            <ArrowLeft size={16} /> Back to builder
          </Button>
        }
      />
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <Notice tone="error">{resource.error}</Notice>
      ) : (
        <div className="preview-layout">
          <Panel className="preview-summary">
            <span className="preview-symbol">
              <Play size={22} weight="fill" />
            </span>
            <span className="app-kicker">Learner view</span>
            <h2>{course?.title}</h2>
            <p>{course?.description || 'No description has been added yet.'}</p>
            <div className="preview-facts">
              <span>
                <strong>{course?.modules?.length || 0}</strong> modules
              </span>
              <span>
                <strong>{course?.lessons?.length || 0}</strong> lessons
              </span>
              <span>
                <ShieldCheck size={16} /> Protected
              </span>
            </div>
          </Panel>
          <Panel>
            <div className="preview-list-heading">
              <span className="app-kicker">Curriculum</span>
              <span>{course?.status || 'DRAFT'}</span>
            </div>
            <div className="preview-modules">
              {(course?.modules || []).map(
                (module: RecordValue, index: number) => (
                  <div className="preview-module" key={module.id}>
                    <span className="preview-module-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <strong>{module.title}</strong>
                      <small>
                        {module.lessons?.length || 0} lessons ·{' '}
                        {module.isRestDay ? 'Rest day' : 'Practice day'}
                      </small>
                    </div>
                    <Check size={16} />
                  </div>
                ),
              )}
            </div>
          </Panel>
        </div>
      )}
    </Shell>
  );
}

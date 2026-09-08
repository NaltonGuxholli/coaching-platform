import { useState } from 'react';
import { ArrowRight, CloudArrowUp } from '@phosphor-icons/react';
import { navigate } from './router';
import { Shell } from './shell';
import { Button, Input, PageHeader, Panel } from './components';
export function AssetHub() {
  const [lessonId, setLessonId] = useState('');
  return (
    <Shell section="Asset pipeline">
      <PageHeader
        kicker="Content infrastructure"
        title="Bring a lesson to life."
        description="Register a streaming video, captions, transcript, and protected handouts for any lesson in your library."
      />
      <Panel className="narrow-panel">
        <div className="app-form-stack">
          <Input
            label="Course lesson ID"
            value={lessonId}
            onChange={setLessonId}
            placeholder="Paste the lesson ID from the course builder"
          />
          <Button
            disabled={!lessonId}
            onClick={() => navigate(`/instructor/lessons/${lessonId}/assets`)}
          >
            <CloudArrowUp size={16} /> Open asset workspace{' '}
            <ArrowRight size={16} />
          </Button>
        </div>
      </Panel>
      <div className="asset-hub-notes">
        <span>
          <strong>Video</strong>
          <small>HLS or DASH provider URL, optional DRM and captions.</small>
        </span>
        <span>
          <strong>Documents</strong>
          <small>
            Protected view-only files registered against the same lesson.
          </small>
        </span>
        <span>
          <strong>Quality</strong>
          <small>
            Transcripts and metadata stay connected to the learner experience.
          </small>
        </span>
      </div>
    </Shell>
  );
}

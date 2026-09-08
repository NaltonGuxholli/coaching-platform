import { useEffect, useState } from 'react';
import { patch } from '../client';
import { useData } from './data';
import { Shell } from './shell';
import { Button, Input, Notice, PageHeader, Panel } from './components';
import type { RecordValue } from './model';
export function PreferencesContract() {
  const resource = useData<RecordValue>('/account/notification-preferences');
  const [contentPublished, setContentPublished] = useState('true');
  const [remindersEnabled, setRemindersEnabled] = useState('true');
  const [emailEnabled, setEmailEnabled] = useState('true');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (resource.data) {
      setContentPublished(String(resource.data.contentPublished ?? true));
      setRemindersEnabled(String(resource.data.remindersEnabled ?? true));
      setEmailEnabled(String(resource.data.emailEnabled ?? true));
    }
  }, [resource.data]);
  return (
    <Shell section="Preferences">
      <PageHeader
        kicker="Personal settings"
        title="Notification preferences."
        description="These controls map directly to content, reminder, and email delivery settings."
      />
      <Panel className="narrow-panel">
        <div className="app-form-stack">
          <Input
            label="Content published"
            value={contentPublished}
            onChange={setContentPublished}
          />
          <Input
            label="Reminders enabled"
            value={remindersEnabled}
            onChange={setRemindersEnabled}
          />
          <Input
            label="Email enabled"
            value={emailEnabled}
            onChange={setEmailEnabled}
          />
          <Button
            onClick={() =>
              patch('/account/notification-preferences', {
                contentPublished: contentPublished === 'true',
                remindersEnabled: remindersEnabled === 'true',
                emailEnabled: emailEnabled === 'true',
              }).then(() => setNotice('Preferences saved.'))
            }
          >
            Save preferences
          </Button>
          {notice && <Notice>{notice}</Notice>}
        </div>
      </Panel>
    </Shell>
  );
}

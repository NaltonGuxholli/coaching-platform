import { FormEvent, useState } from 'react';
import {
  Check,
  DownloadSimple,
  Plus,
  Timer,
  ArrowRight,
} from '@phosphor-icons/react';
import { patch, post } from '../client';
import { downloadText } from '../downloads';
import { useData, formatDate, formatMoney } from './data';
import { Shell } from './shell';
import {
  Button,
  DataTable,
  Input,
  Notice,
  PageHeader,
  Panel,
} from './components';
import { navigate } from './router';
import type { RecordValue } from './model';
export function PayoutOperations() {
  const resource = useData<RecordValue[]>('/instructor/payouts');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [notice, setNotice] = useState('');
  return (
    <Shell section="Payouts">
      <PageHeader
        kicker="Money movement"
        title="Payout operations."
        description="Review settled records and schedule the next transfer."
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              downloadText('/instructor/payouts/export', 'payouts.csv')
            }
          >
            <DownloadSimple size={16} /> Export CSV
          </Button>
        }
      />
      <Panel>
        <form
          className="app-form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            await post('/instructor/payouts/schedule', {
              amountCents: Number(amount),
              currency,
            });
            setNotice('Payout scheduled.');
            setAmount('');
            resource.reload();
          }}
        >
          <Input
            label="Amount in cents"
            value={amount}
            onChange={setAmount}
            type="number"
          />
          <Input label="Currency" value={currency} onChange={setCurrency} />
          <Button type="submit">Schedule payout</Button>
        </form>
        {notice && <Notice>{notice}</Notice>}
      </Panel>
      <div className="spacer-18" />
      <DataTable
        columns={['Amount', 'Currency', 'Status', 'Created']}
        rows={(resource.data || []).map((item) => [
          formatMoney(item.amount, item.currency),
          item.currency,
          item.status,
          formatDate(item.createdAt),
        ])}
      />
    </Shell>
  );
}
export function BrandingStudio() {
  const resource = useData<RecordValue>('/tenant/settings');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('#bba7ff');
  return (
    <Shell section="Branding">
      <PageHeader
        kicker="Tenant identity"
        title="Make the space yours."
        description="Shape the public coaching experience."
      />
      <Panel className="narrow-panel">
        <div className="app-form-stack">
          <Input
            label="Brand name"
            value={brand || resource.data?.brandName || ''}
            onChange={setBrand}
          />
          <Input
            label="Primary color"
            value={color || resource.data?.primaryColor || ''}
            onChange={setColor}
          />
          <div className="app-actions">
            <Button
              onClick={() =>
                patch('/tenant/settings', {
                  brandName: brand,
                  primaryColor: color,
                }).then(resource.reload)
              }
            >
              Save changes
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                post('/tenant/settings/publish').then(resource.reload)
              }
            >
              Publish settings
            </Button>
          </div>
        </div>
      </Panel>
      <Button variant="ghost" onClick={() => navigate('/instructor/domains')}>
        Manage domains <ArrowRight size={16} />
      </Button>
    </Shell>
  );
}
export function DomainStudio() {
  const resource = useData<RecordValue[]>('/tenant/domains');
  const [domain, setDomain] = useState('');
  return (
    <Shell section="Domains">
      <PageHeader
        kicker="Public presence"
        title="Custom domains."
        description="Give your catalog a home learners recognize."
      />
      <Panel>
        <form
          className="app-form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            await post('/tenant/domains', { domain });
            setDomain('');
            resource.reload();
          }}
        >
          <Input
            label="Domain"
            value={domain}
            onChange={setDomain}
            placeholder="learn.example.com"
          />
          <Button type="submit">
            <Plus size={16} /> Add domain
          </Button>
        </form>
      </Panel>
      <div className="spacer-18" />
      <DataTable
        columns={['Domain', 'Verification', 'SSL', '']}
        rows={(resource.data || []).map((item) => [
          <strong key="domain">{item.domain}</strong>,
          item.verified ? 'Verified' : 'Pending',
          item.sslStatus || 'Pending',
          <button
            className="app-row-action"
            key="verify"
            onClick={() =>
              patch(`/tenant/domains/${item.id}`, { verified: true }).then(
                resource.reload,
              )
            }
          >
            <Check size={16} />
          </button>,
        ])}
      />
    </Shell>
  );
}
export function TimerSession({ timerId }: { timerId: string }) {
  const [session, setSession] = useState<RecordValue | null>(null);
  const [error, setError] = useState('');
  const action = async (name: string, body?: RecordValue) => {
    try {
      setSession(
        await post<RecordValue>(
          session
            ? `/timers/sessions/${session.id}/${name}`
            : `/timers/${timerId}/sessions`,
          body,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Timer action failed',
      );
    }
  };
  return (
    <Shell section="Timer session">
      <PageHeader
        kicker="Practice ritual"
        title="Stay with the round."
        description="Your timer state is saved between sessions."
      />
      {error && <Notice tone="error">{error}</Notice>}
      <Panel className="timer-focus-new">
        <span>{session?.stateJson?.status || 'READY'}</span>
        <strong>{session?.remainingSeconds ?? '00:00'}</strong>
        <div className="app-actions">
          {session ? (
            <>
              <Button onClick={() => action('pause')}>Pause</Button>
              <Button variant="secondary" onClick={() => action('resume')}>
                Resume
              </Button>
              <Button
                variant="ghost"
                onClick={() => action('rounds', { completed: true })}
              >
                Record round
              </Button>
              <Button variant="danger" onClick={() => action('finish')}>
                Finish
              </Button>
            </>
          ) : (
            <Button onClick={() => action('start')}>
              <Timer size={18} /> Start timer
            </Button>
          )}
        </div>
      </Panel>
    </Shell>
  );
}
export function ThemeRevisions() {
  const resource = useData<RecordValue[]>('/tenant/theme-revisions');
  return (
    <Shell section="Theme history">
      <PageHeader
        kicker="Brand history"
        title="Theme revisions."
        description="Review and restore previous visual settings."
      />
      <DataTable
        columns={['Revision', 'Created', 'Status', '']}
        rows={(resource.data || []).map((item) => [
          item.id,
          formatDate(item.createdAt),
          item.status || 'Saved',
          <button
            className="app-row-action"
            key="rollback"
            onClick={() =>
              post(`/tenant/theme-revisions/${item.id}/rollback`).then(
                resource.reload,
              )
            }
          >
            <ArrowRight size={16} />
          </button>,
        ])}
      />
    </Shell>
  );
}

import { useState } from 'react';
import {
  Check,
  DownloadSimple,
  Plus,
  WarningCircle,
} from '@phosphor-icons/react';
import { patch, post } from '../client';
import { useData, formatDate } from './data';
import { Shell } from './shell';
import {
  Button,
  DataTable,
  Input,
  Loading,
  Notice,
  PageHeader,
  Panel,
} from './components';
import type { RecordValue } from './model';
export function PeopleAdmin() {
  const resource = useData<RecordValue[]>('/users');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STUDENT');
  return (
    <Shell section="People">
      <PageHeader
        kicker="Tenant operations"
        title="People directory."
        description="Invite, update, and deactivate the people in your workspace."
      />
      <Panel>
        <form
          className="app-form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            await post('/auth/users', {
              email,
              role,
              firstName: email.split('@')[0],
            });
            setEmail('');
            resource.reload();
          }}
        >
          <Input label="Email" value={email} onChange={setEmail} type="email" />
          <Input label="Role" value={role} onChange={setRole} />
          <Button type="submit">
            <Plus size={16} /> Invite person
          </Button>
        </form>
      </Panel>
      <div className="spacer-18" />
      <DataTable
        columns={['Name', 'Email', 'Status', 'Actions']}
        rows={(resource.data || []).map((person) => [
          <strong key="name">
            {person.firstName} {person.lastName}
          </strong>,
          person.email,
          person.status,
          <button
            className="app-row-action"
            key="status"
            onClick={() =>
              patch(`/users/${person.id}`, {
                status: person.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
              }).then(resource.reload)
            }
          >
            <Check size={16} />
          </button>,
        ])}
      />
    </Shell>
  );
}
export function TenantAdmin({ reports = false }: { reports?: boolean }) {
  const resource = useData<RecordValue[]>(
    reports ? '/admin/reports' : '/admin/tenants',
  );
  return (
    <Shell section={reports ? 'Moderation' : 'Platform control'} admin>
      <PageHeader
        kicker="Platform administration"
        title={reports ? 'Moderation queue.' : 'Tenant control room.'}
        description="Review the health of the platform and resolve operational work."
      />
      {resource.loading ? (
        <Loading />
      ) : (
        <DataTable
          columns={
            reports
              ? ['Content', 'Reason', 'Status', '']
              : ['Tenant', 'Status', 'Created', '']
          }
          rows={(resource.data || []).map((item) =>
            reports
              ? [
                  item.entityId,
                  item.reason,
                  item.status,
                  <button
                    className="app-row-action"
                    key="resolve"
                    onClick={() =>
                      patch(`/admin/reports/${item.id}`, {
                        status: 'RESOLVED',
                      }).then(resource.reload)
                    }
                  >
                    <Check size={16} />
                  </button>,
                ]
              : [
                  <strong key="name">{item.name}</strong>,
                  item.status,
                  formatDate(item.createdAt),
                  <button
                    className="app-row-action"
                    key="suspend"
                    onClick={() =>
                      patch(`/admin/tenants/${item.id}/status`, {
                        status:
                          item.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                      }).then(resource.reload)
                    }
                  >
                    <WarningCircle size={16} />
                  </button>,
                ],
          )}
        />
      )}
    </Shell>
  );
}
export function ThemeLibrary() {
  const resource = useData<RecordValue[]>('/tenant/themes');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  return (
    <Shell section="Themes" admin>
      <PageHeader
        kicker="Design system"
        title="Theme library."
        description="Manage the visual foundations available to tenants."
      />
      <Panel>
        <form
          className="app-form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            await post('/tenant/themes', { name, description });
            setName('');
            setDescription('');
            resource.reload();
          }}
        >
          <Input label="Theme name" value={name} onChange={setName} />
          <Input
            label="Description"
            value={description}
            onChange={setDescription}
          />
          <Button type="submit">
            <Plus size={16} /> Create theme
          </Button>
        </form>
      </Panel>
      <div className="spacer-18" />
      <DataTable
        columns={['Theme', 'Description', 'Status']}
        rows={(resource.data || []).map((item) => [
          <strong key="name">{item.name}</strong>,
          item.description,
          item.isActive ? 'Active' : 'Archived',
        ])}
      />
    </Shell>
  );
}

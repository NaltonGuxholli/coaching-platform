import { FormEvent, useState } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import { post } from '../client';
import { Button, Input, Notice, PageHeader, Panel } from './components';
import { Shell } from './shell';
import { navigate } from './router';
export function ContractCourseCreate() {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [priceCents, setPriceCents] = useState('0');
  const [currency, setCurrency] = useState('EUR');
  const [billingType, setBillingType] = useState('ONE_TIME');
  const [error, setError] = useState('');
  return (
    <Shell section="New course">
      <PageHeader
        kicker="Content studio"
        title="Create a course."
        description="The course is created as a draft with pricing and billing metadata ready for POK checkout."
      />
      <Panel className="narrow-panel">
        <form
          className="app-form-stack"
          onSubmit={async (event: FormEvent) => {
            event.preventDefault();
            setError('');
            try {
              const course = await post<any>('/instructor/courses', {
                title,
                slug,
                description,
                priceCents: Number(priceCents),
                currency,
                billingType,
              });
              navigate(`/instructor/courses/${course.id}`);
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : 'Unable to create course',
              );
            }
          }}
        >
          <Input label="Title" value={title} onChange={setTitle} />
          <Input
            label="URL slug"
            value={slug}
            onChange={setSlug}
            placeholder="six-week-foundations"
          />
          <Input
            label="Description"
            value={description}
            onChange={setDescription}
          />
          <Input
            label="Price in cents"
            value={priceCents}
            onChange={setPriceCents}
            type="number"
          />
          <Input label="Currency" value={currency} onChange={setCurrency} />
          <Input
            label="Billing type"
            value={billingType}
            onChange={setBillingType}
          />
          <Button type="submit">
            Create draft <ArrowRight size={16} />
          </Button>
          {error && <Notice tone="error">{error}</Notice>}
        </form>
      </Panel>
    </Shell>
  );
}

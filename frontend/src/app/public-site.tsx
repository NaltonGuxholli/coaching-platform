import {
  ArrowRight,
  Check,
  Play,
  Sparkle,
  Star,
  UsersThree,
} from '@phosphor-icons/react';
import { navigate } from './router';
import { useData } from './data';
import { Button, Loading, Notice } from './components';
import type { RecordValue } from './model';
import './public-site.css';

export function PublicSite({ tenantSlug }: { tenantSlug: string }) {
  const site = useData<RecordValue>(`/public/${tenantSlug}`);
  const courses = useData<RecordValue[]>(`/public/${tenantSlug}/courses`);
  const settings = site.data?.settings || {};
  return (
    <main className="public-site">
      <header className="public-header">
        <button className="public-brand" onClick={() => navigate('/')}>
          <span>
            <Sparkle size={17} weight="fill" />
          </span>
          <strong>{site.data?.name || tenantSlug}</strong>
        </button>
        <nav>
          <a href="#programs">Programs</a>
          <a href="#method">Approach</a>
          <a href="#proof">Outcomes</a>
        </nav>
        <div className="public-header-actions">
          <button
            className="public-text-link"
            onClick={() => navigate('/login')}
          >
            Sign in
          </button>
          <Button onClick={() => navigate('/register')}>
            Get started <ArrowRight size={15} />
          </Button>
        </div>
      </header>
      {site.error && (
        <Notice tone="error">This public workspace could not be loaded.</Notice>
      )}
      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="public-eyebrow">
            {settings.browserTitle ||
              'Independent teaching, thoughtfully delivered'}
          </span>
          <h1>
            {site.data?.name || 'A better place to learn.'}
            <em> built around you.</em>
          </h1>
          <p>
            {settings.heroCopy ||
              'Short lessons, useful practice, and a clear path from curiosity to capability.'}
          </p>
          <div className="public-hero-actions">
            <Button
              onClick={() =>
                document
                  .getElementById('programs')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Explore programs <ArrowRight size={16} />
            </Button>
            <button
              className="public-play-link"
              onClick={() =>
                document
                  .getElementById('method')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              <span>
                <Play size={14} weight="fill" />
              </span>{' '}
              See how it works
            </button>
          </div>
          <div className="public-proof-line">
            <span>
              <Check size={15} /> Guided learning
            </span>
            <span>
              <Check size={15} /> Protected content
            </span>
            <span>
              <Check size={15} /> Learn at your pace
            </span>
          </div>
        </div>
        <div className="public-hero-art">
          <div className="public-art-ring ring-one" />
          <div className="public-art-ring ring-two" />
          <div className="public-art-core">
            <span>01</span>
            <strong>
              Make the next
              <br />
              step visible.
            </strong>
            <small>Practice / reflect / return</small>
          </div>
          <div className="public-art-note art-note-a">
            <Star size={14} /> Built for real progress
          </div>
          <div className="public-art-note art-note-b">
            <UsersThree size={14} /> {courses.data?.length || 0} programs to
            explore
          </div>
        </div>
      </section>
      <section id="proof" className="public-stats">
        <div>
          <strong>01</strong>
          <span>One clear path</span>
          <small>From first lesson to lasting practice.</small>
        </div>
        <div>
          <strong>24/7</strong>
          <span>Learn on your time</span>
          <small>Your progress stays with you.</small>
        </div>
        <div>
          <strong>100%</strong>
          <span>Your own pace</span>
          <small>Structured without being rigid.</small>
        </div>
      </section>
      <section id="programs" className="public-section public-programs">
        <div className="public-section-heading">
          <span className="public-eyebrow">The catalog</span>
          <h2>
            Choose a program
            <br />
            <em>that moves you.</em>
          </h2>
          <p>
            Focused programs made from short, reusable lessons. Start with one
            useful next step.
          </p>
        </div>
        {courses.loading ? (
          <Loading />
        ) : (
          <div className="public-program-grid">
            {(courses.data || []).map((course, index) => (
              <button
                className="public-program-card"
                key={course.id}
                onClick={() =>
                  navigate(`/public/${tenantSlug}/courses/${course.slug}`)
                }
              >
                <span className="public-card-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="public-card-glyph">
                  {course.title?.slice(0, 2).toUpperCase()}
                </div>
                <span className="public-eyebrow">Program</span>
                <h3>{course.title}</h3>
                <p>
                  {course.description ||
                    'A considered learning path for your next chapter.'}
                </p>
                <span className="public-card-footer">
                  Explore program <ArrowRight size={15} />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      <section id="method" className="public-method">
        <div>
          <span className="public-eyebrow">The approach</span>
          <h2>
            Small systems.
            <br />
            <em>Durable progress.</em>
          </h2>
        </div>
        <div className="public-method-copy">
          <p>
            Good learning is not a flood of information. It is the right idea,
            at the right pace, returned to often enough to become yours.
          </p>
          <div className="public-method-points">
            <span>
              <b>01</b> Learn in focused chapters
            </span>
            <span>
              <b>02</b> Practice with useful structure
            </span>
            <span>
              <b>03</b> See your momentum clearly
            </span>
          </div>
        </div>
      </section>
      <footer className="public-footer">
        <div>
          <button className="public-brand" onClick={() => navigate('/')}>
            <span>
              <Sparkle size={15} weight="fill" />
            </span>
            <strong>{site.data?.name || tenantSlug}</strong>
          </button>
          <p>A considered place for meaningful progress.</p>
        </div>
        <div className="public-footer-links">
          <span>Explore</span>
          <a href="#programs">Programs</a>
          <a href="#method">Approach</a>
          <button onClick={() => navigate('/login')}>Sign in</button>
        </div>
        <div className="public-footer-links">
          <span>Start here</span>
          <button onClick={() => navigate('/register')}>Create account</button>
          <button onClick={() => navigate('/register/instructor')}>
            Teach with us
          </button>
        </div>
        <small className="public-footer-bottom">
          © {new Date().getFullYear()} {site.data?.name || tenantSlug}. Built
          for the work that matters.
        </small>
      </footer>
    </main>
  );
}

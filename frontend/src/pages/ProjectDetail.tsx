import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { profile, site } from '../data/profile'
import { projectNumber, projects } from '../data/projects'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-lg leading-relaxed text-ink/85 marker:text-accent">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  )
}

export default function ProjectDetail() {
  const { slug = '' } = useParams()
  const index = projects.findIndex((p) => p.slug === slug)
  const p = projects[index]

  useEffect(() => {
    document.title = p ? `${p.name} — ${profile.name}` : profile.name
  }, [p])

  if (!p)
    return (
      <div className="mx-auto max-w-2xl px-4 pt-24 text-center">
        <h1 className="font-serif text-3xl font-semibold">Project not found</h1>
        <Link to="/projects" className="mt-4 inline-block text-accent hover:underline">← Back to selected projects</Link>
      </div>
    )

  const links = (p.links ?? []).filter((l) => site.showPosts || !l.href.startsWith('/posts'))
  const prev = projects[index - 1]
  const next = projects[index + 1]

  return (
    <article className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
      <Link to="/projects" className="text-sm font-medium text-accent hover:underline">← Selected projects</Link>
      <p className="mt-6 text-sm font-medium text-muted">
        <span className="text-accent">Project {projectNumber(index)}</span>
        {p.org && <> · {p.org}</>}
      </p>
      <h1 className="mt-2 font-serif text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">{p.name}</h1>
      <p className="mt-4 text-xl leading-relaxed text-muted">{p.tagline}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {p.stack.map((t) => (
          <span key={t} className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">{t}</span>
        ))}
      </div>

      <figure className="mt-10">
        <img src={p.image} alt={p.tagline} className="w-full rounded-xl border border-line" />
        {p.imageCredit && <figcaption className="mt-2 text-xs text-muted">Image: {p.imageCredit}</figcaption>}
      </figure>

      {p.problem && (
        <Section title="The problem">
          <p className="text-lg leading-relaxed text-ink/85">{p.problem}</p>
        </Section>
      )}
      <Section title={p.problem ? 'The product' : 'Overview'}>
        <p className="text-lg leading-relaxed text-ink/85">{p.summary}</p>
        <div className="mt-4">
          <List items={p.highlights} />
        </div>
      </Section>
      {p.question && (
        <blockquote className="mt-10 rounded-r-lg border-l-4 border-accent bg-accent-soft px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Ask it something like</p>
          <p className="mt-2 font-serif text-xl leading-snug">“{p.question}”</p>
        </blockquote>
      )}
      {p.contributions && (
        <Section title="What I did">
          <List items={p.contributions} />
        </Section>
      )}
      {p.objective && (
        <Section title="Objective">
          <p className="text-lg leading-relaxed text-ink/85">{p.objective}</p>
        </Section>
      )}
      {p.impact && (
        <Section title="Impact">
          <p className="rounded-xl border border-line bg-white px-5 py-4 text-lg leading-relaxed font-medium">{p.impact}</p>
        </Section>
      )}
      {links.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-5">
          {links.map((l) =>
            l.href.startsWith('/') ? (
              <Link key={l.href} to={l.href} className="font-medium text-accent hover:underline">
                {l.label} →
              </Link>
            ) : (
              <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
                {l.label} →
              </a>
            ),
          )}
        </div>
      )}

      <nav className="mt-16 grid gap-4 border-t border-line pt-8 sm:grid-cols-2">
        {prev ? (
          <Link to={`/projects/${prev.slug}`} className="group rounded-xl border border-line p-5 hover:border-accent">
            <span className="text-sm text-muted">← Previous · {projectNumber(index - 1)}</span>
            <span className="mt-1 block font-serif text-lg leading-snug font-semibold group-hover:text-accent">{prev.name}</span>
          </Link>
        ) : <span />}
        {next && (
          <Link to={`/projects/${next.slug}`} className="group rounded-xl border border-line p-5 text-right hover:border-accent">
            <span className="text-sm text-muted">Next · {projectNumber(index + 1)} →</span>
            <span className="mt-1 block font-serif text-lg leading-snug font-semibold group-hover:text-accent">{next.name}</span>
          </Link>
        )}
      </nav>
    </article>
  )
}

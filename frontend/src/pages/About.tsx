import { Link } from 'react-router-dom'
import { awards, certifications, education, experience, profile, skills } from '../data/profile'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-12">
      <h2 className="mb-8 font-serif text-3xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
      <header className="pb-12">
        <div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">About me</h1>
          <p className="mt-2 text-lg text-muted">{profile.title} · {profile.location}</p>
        </div>
      </header>

      <div className="space-y-5 text-lg leading-relaxed text-ink/85">
        <p>
          I'm a data scientist who works like an AI engineer. For 8+ years I've turned data into
          decisions and models into working systems across financial services, manufacturing and research, usually
          sitting right next to the people who use them.
        </p>
        <p>
          The data scientist in me starts with the numbers. I studied mathematics and statistics at the University of
          Limpopo, then completed a Master's and a PhD in Electrical Engineering at the University of Johannesburg,
          specialising in computer vision and machine learning while working as a researcher at the CSIR. I care about
          whether a model is actually right: careful evaluation, honest uncertainty, and experiments that hold up.
        </p>
        <p>
          The AI engineer in me cares about whether it gets used. I work embedded with engineering,
          operations and business teams, learn how their work really runs, and own the whole path from discovery to a
          deployed system: data pipelines, models, APIs and apps, CI/CD and Azure cloud. At Sasol that meant
          forecasting and predictive maintenance tools for planners and engineers. At Hulamin it means ML and
          generative AI applications built with and for the engineering and operations teams.
        </p>
        <p>
          I also love mentoring, helping analysts and engineers grow in statistics, ML and good software practice.
        </p>
        <p>
          Questions? <Link to="/avatar" className="font-medium text-accent hover:underline">Ask my digital twin</Link> or email{' '}
          <a href={`mailto:${profile.email}`} className="font-medium text-accent hover:underline">{profile.email}</a>.
        </p>
      </div>

      <Section title="Experience">
        <ol className="relative space-y-10 border-l-2 border-line pl-8">
          {experience.map((e) => (
            <li key={e.role + e.org} className="relative">
              <span className="absolute top-1.5 -left-[2.4rem] h-3.5 w-3.5 rounded-full border-2 border-accent bg-paper" />
              <p className="text-sm font-medium text-accent">{e.period}</p>
              <h3 className="mt-1 text-xl font-semibold">{e.role}</h3>
              <p className="text-muted">{e.org} · {e.place}</p>
              <p className="mt-3 leading-relaxed text-ink/80">{e.summary}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Skills">
        <div className="grid gap-6 sm:grid-cols-2">
          {skills.map((s) => (
            <div key={s.group}>
              <h3 className="mb-3 font-semibold">{s.group}</h3>
              <div className="flex flex-wrap gap-2">
                {s.items.map((i) => (
                  <span key={i} className="rounded-full bg-accent-soft px-3 py-1 text-sm text-accent">{i}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Education">
        <ul className="space-y-5">
          {education.map((e) => (
            <li key={e.degree} className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-6">
              <span className="text-sm font-medium text-muted sm:pt-0.5">{e.year}</span>
              <div>
                <p className="font-semibold">{e.degree}</p>
                <p className="text-muted">{e.school}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Certifications">
        <ul className="space-y-5">
          {certifications.map((c) => (
            <li key={c.name} className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-6">
              <span className="text-sm font-medium text-muted sm:pt-0.5">
                {c.year ?? (
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">In progress</span>
                )}
              </span>
              <div>
                <p className="font-semibold">{c.name}</p>
                {c.issuer && <p className="text-muted">{c.issuer}</p>}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Awards & recognition">
        <ul className="space-y-3 text-ink/85">
          {awards.map((a) => (
            <li key={a} className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {a}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { projectNumber, projects } from '../data/projects'

export default function Projects() {
  return (
    <section className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 sm:pt-16">
      <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Selected projects</h1>
      <p className="mt-3 mb-12 max-w-2xl text-lg text-muted">
        Systems I've designed and built, from data pipelines and models to the apps people use every day.
      </p>

      <ol className="grid gap-x-10 gap-y-14 md:grid-cols-2">
        {projects.map((p, i) => (
          <li key={p.slug} className="row-span-3 grid grid-rows-subgrid gap-y-0">
            <Link to={`/projects/${p.slug}`} className="group row-span-3 grid grid-rows-subgrid gap-y-0">
              <div className="mb-4 flex items-end gap-4">
                <span className="font-serif text-3xl font-semibold text-accent">{projectNumber(i)}</span>
                <div>
                  {p.org && <p className="text-sm font-medium text-muted">{p.org}</p>}
                  <h2 className="font-serif text-2xl leading-snug font-semibold group-hover:text-accent">{p.name}</h2>
                </div>
              </div>
              <div className="aspect-[16/10] overflow-hidden rounded-xl border border-line">
                <img
                  src={p.image}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div>
                <p className="mt-4 text-[15px] leading-relaxed text-muted">{p.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.stack.slice(0, 4).map((t) => (
                    <span key={t} className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">{t}</span>
                  ))}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

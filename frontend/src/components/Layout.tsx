import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { profile } from '../data/profile'

const nav = [
  { to: '/avatar', label: 'Avatar' },
  { to: '/about', label: 'About' },
  { to: '/posts', label: 'Posts' },
]

function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-[15px] font-medium ${isActive ? 'text-accent' : 'text-ink hover:text-accent'}`

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="font-serif text-xl font-semibold tracking-tight">{profile.name}</span>
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="rounded-md p-2 sm:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-4 border-t border-line px-4 py-4 sm:hidden">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}

function Footer() {
  const [user, domain] = profile.email.split('@')
  return (
    <footer className="mt-24 border-t border-line bg-white">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Navigation</h4>
          <ul className="space-y-2">
            {nav.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="hover:text-accent">{n.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Get in touch</h4>
          <p>
            {user} [at] {domain.replace('.', ' [dot] ')}
          </p>
          <p className="mt-1 text-muted">{profile.location}</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Follow me</h4>
          <ul className="space-y-2">
            {profile.social.map((s) => (
              <li key={s.label}>
                <a href={s.href} className="hover:text-accent" target="_blank" rel="noreferrer">{s.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="pb-8 text-center text-sm text-muted">© {new Date().getFullYear()} {profile.name}</p>
    </footer>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  // Braces matter: newer browsers make scrollTo() return a Promise, and an effect must return nothing
  // (or a clean-up function). Returning the Promise crashes React with "destroy is not a function".
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

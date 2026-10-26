import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import ChatBubble from '../components/ChatBubble'
import { useInterval } from '../hooks/useInterval'
import { HttpError, inboxList, inboxMe, inboxReply, inboxSetMode, inboxThread, mergeMessages, timeAgo } from '../lib/api'
import type { ChatMessage, InboxConversation, Mode } from '../types'

type Auth = 'checking' | 'ok' | 'denied'

function SignIn() {
  return (
    <div className="mx-auto max-w-md px-4 pt-24 text-center">
      <h1 className="font-serif text-3xl font-semibold">Inbox</h1>
      <p className="mt-3 text-muted">This page is only for you. Sign in with your Django admin account to see live conversations.</p>
      <a
        href={`/admin/login/?next=${encodeURIComponent(`/inbox${window.location.search}`)}`}
        className="mt-6 inline-block rounded-xl bg-accent px-5 py-3 font-medium text-white hover:bg-accent/90"
      >
        Sign in
      </a>
    </div>
  )
}

function ConversationList({
  items,
  selected,
  onSelect,
}: {
  items: InboxConversation[] | null
  selected: number | null
  onSelect: (id: number) => void
}) {
  if (!items) return <p className="p-4 text-sm text-muted">Loading conversations…</p>
  if (items.length === 0)
    return (
      <p className="p-6 text-sm leading-relaxed text-muted">
        No conversations in the last 7 days. When someone chats with your twin, they'll appear here.
      </p>
    )
  return (
    <ul className="divide-y divide-line">
      {items.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => onSelect(c.id)}
            className={`w-full px-4 py-3 text-left hover:bg-paper ${selected === c.id ? 'bg-accent-soft/60' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`truncate ${c.unread ? 'font-semibold' : 'font-medium'}`}>{c.name}</span>
              <span className="shrink-0 text-xs text-muted">{timeAgo(c.last_activity)}</span>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted">
              {c.last_role === 'operator' ? 'You: ' : c.last_role === 'assistant' ? 'Twin: ' : ''}
              {c.last_message}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {c.needs_human && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Wants you</span>
              )}
              {c.mode === 'human' && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">You're live</span>
              )}
              {c.unread > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">{c.unread} new</span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Thread({ id, onBack, onChanged }: { id: number; onBack: () => void; onChanged: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [name, setName] = useState('')
  const [mode, setMode] = useState<Mode>('bot')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const lastId = messages.length ? messages[messages.length - 1].id : 0

  useEffect(() => {
    setMessages([])
    setDraft('')
    setError('')
  }, [id])

  const load = useCallback(async () => {
    const t = await inboxThread(id, lastId)
    if (t.conversation.id !== id) return
    setName(t.conversation.name)
    setMode(t.conversation.mode)
    setMessages((m) => mergeMessages(m, t.messages))
  }, [id, lastId])
  useInterval(load, 2000)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  async function changeMode(next: Mode) {
    setError('')
    try {
      const r = await inboxSetMode(id, next)
      setMode(r.mode)
      await load()
      onChanged()
    } catch {
      setError("Couldn't change who's answering. Check you're still signed in and try again.")
    }
  }

  async function send(e?: FormEvent) {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError('')
    try {
      await inboxReply(id, text)
      setDraft('')
      setMode('human')
      await load()
      onChanged()
    } catch {
      setError("Your reply didn't send. Check you're still signed in and try again.")
    } finally {
      setSending(false)
    }
  }

  const live = mode === 'human'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <button onClick={onBack} className="text-sm font-medium text-accent md:hidden">← All</button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-sans text-base font-semibold">{name || 'Loading…'}</h2>
          <p className="text-xs text-muted">{live ? 'You are answering. The twin is paused.' : 'Your digital twin is answering.'}</p>
        </div>
        {live ? (
          <button
            onClick={() => changeMode('bot')}
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-accent hover:text-accent"
          >
            Hand back to twin
          </button>
        ) : (
          <button
            onClick={() => changeMode('human')}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            Take over chat
          </button>
        )}
      </div>

      <div ref={logRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-paper p-4">
        {messages.map((m) => (
          <ChatBubble key={m.id} m={m} view="operator" visitorName={name} />
        ))}
      </div>

      {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line bg-white p-3">
        <textarea
          id="inbox-reply"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={2}
          maxLength={4000}
          placeholder={live ? 'Reply as yourself…' : 'Type a reply to take over from the twin…'}
          aria-label="Your reply"
          className="max-h-40 flex-1 resize-none rounded-xl border border-line bg-paper px-4 py-3 text-[15px] outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-xl bg-accent px-5 py-3 font-medium text-white hover:bg-accent/90 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}

export default function Inbox() {
  const [auth, setAuth] = useState<Auth>('checking')
  const [items, setItems] = useState<InboxConversation[] | null>(null)
  const [params, setParams] = useSearchParams()
  const selected = params.get('c') ? Number(params.get('c')) : null
  const notified = useRef<Set<number>>(new Set())
  const [alerts, setAlerts] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied')

  useEffect(() => {
    inboxMe()
      .then(() => setAuth('ok'))
      .catch((e) => setAuth(e instanceof HttpError && (e.status === 401 || e.status === 403) ? 'denied' : 'ok'))
  }, [])

  const refresh = useCallback(async () => {
    try {
      const list = await inboxList()
      setItems(list)
      // Desktop alert the first time a visitor asks for you
      for (const c of list) {
        if (c.needs_human && !notified.current.has(c.id)) {
          notified.current.add(c.id)
          if (items !== null && alerts === 'granted') new Notification(`${c.name} wants to chat with you`, { body: c.last_message })
        }
      }
    } catch (e) {
      if (e instanceof HttpError && (e.status === 401 || e.status === 403)) setAuth('denied')
    }
  }, [items, alerts])
  useInterval(refresh, auth === 'ok' ? 4000 : null)

  const waiting = items?.filter((c) => c.needs_human || c.unread > 0).length ?? 0
  useEffect(() => {
    document.title = waiting ? `(${waiting}) Inbox` : 'Inbox'
    return () => {
      document.title = 'Matsilele Mabaso'
    }
  }, [waiting])

  if (auth === 'checking') return <p className="px-4 pt-24 text-center text-muted">Checking your sign-in…</p>
  if (auth === 'denied') return <SignIn />

  const select = (id: number | null) => setParams(id ? { c: String(id) } : {})

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Inbox</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Visitors see you as online while this page is open.
          </p>
        </div>
        {alerts === 'default' && (
          <button
            onClick={() => Notification.requestPermission().then(setAlerts)}
            className="rounded-lg border border-line px-3 py-2 text-sm hover:border-accent hover:text-accent"
          >
            Turn on desktop alerts
          </button>
        )}
      </div>

      <div className="grid h-[calc(100vh-14rem)] min-h-[30rem] overflow-hidden rounded-2xl border border-line bg-white md:grid-cols-[20rem_1fr]">
        <aside className={`min-h-0 overflow-y-auto border-line md:block md:border-r ${selected ? 'hidden' : ''}`}>
          <ConversationList items={items} selected={selected} onSelect={select} />
        </aside>
        <div className={`min-h-0 ${selected ? '' : 'hidden md:block'}`}>
          {selected ? (
            <Thread id={selected} onBack={() => select(null)} onChanged={refresh} />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-muted">
              Pick a conversation to read it, take over, or reply.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

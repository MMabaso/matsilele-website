import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import ChatBubble from '../components/ChatBubble'
import { profile } from '../data/profile'
import { useInterval } from '../hooks/useInterval'
import { mergeMessages, pollChat, resetSession, sendChat } from '../lib/api'
import type { ActivityStep, ChatMessage, Mode } from '../types'

const suggestions = [
  'What do you work on?',
  'How do you deploy ML models to production?',
  "I'd like to talk to you about a role",
]

// Same rule as the backend (core/twin.py FAQ_SHORTCUT): "Q2", "q 2?" -> instant FAQ answer.
const isFaqShortcut = (text: string) => /^\s*q\s*\d{1,3}\s*[?.!]?\s*$/i.test(text)

const mobileQuery = '(max-width: 640px)'

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(mobileQuery).matches)
  useEffect(() => {
    const mq = window.matchMedia(mobileQuery)
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded border border-line bg-white px-1.5 py-px font-mono text-[11px] text-ink/70">{children}</kbd>
}

export default function Avatar() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState<string | null>(null) // visitor message on its way
  const [status, setStatus] = useState('') // activity line shown while the twin works
  const [steps, setSteps] = useState<Record<number, ActivityStep[]>>({}) // what the twin did, per reply
  const [mode, setMode] = useState<Mode>('bot')
  const [online, setOnline] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const statusTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const lastId = messages.length ? messages[messages.length - 1].id : 0
  // Bumped by "Clear chat" so replies to the old conversation that are still in flight get ignored.
  const generation = useRef(0)
  const mobile = useIsMobile()
  const [params, setParams] = useSearchParams()
  const autoSent = useRef(false)

  // Pick up the conversation where the visitor left off, then keep checking for live replies.
  const poll = useCallback(async () => {
    const gen = generation.current
    const s = await pollChat(lastId)
    if (gen !== generation.current) return
    setMessages((m) => mergeMessages(m, s.messages))
    setMode(s.mode)
    setOnline(s.operator_online)
  }, [lastId])

  function clearChat() {
    generation.current += 1
    resetSession()
    setMessages([])
    setSteps({})
    setMode('bot')
    setInput('')
    setError('')
    inputRef.current?.focus()
  }
  useInterval(poll, pending === null ? 3000 : null)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, pending])

  // Grow the textarea with its content.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [input])

  // Focus on desktop only, so the keyboard doesn't jump up on phones.
  useEffect(() => {
    if (!window.matchMedia(mobileQuery).matches) inputRef.current?.focus()
  }, [])

  async function send(text: string) {
    const message = text.trim()
    if (!message || pending !== null) return
    setInput('')
    setError('')
    setPending(message)
    clearTimeout(statusTimer.current)
    if (isFaqShortcut(message)) {
      setStatus('Looking up the FAQ…')
    } else {
      setStatus('Searching knowledge base…')
      statusTimer.current = setTimeout(() => setStatus(`${profile.shortName}'s twin is typing…`), 1200)
    }
    const gen = generation.current
    try {
      const s = await sendChat(message, lastId)
      if (gen !== generation.current) return
      setMessages((m) => mergeMessages(m, s.messages))
      const activity = s.activity
      if (activity) setSteps((st) => ({ ...st, [activity.message_id]: activity.steps }))
      setMode(s.mode)
      setOnline(s.operator_online)
    } catch (e) {
      setInput(message)
      setError(
        (e as { status?: number }).status === 429
          ? "You've sent a lot of messages. Please wait a little and try again."
          : "Your message didn't send. Check your connection and try again.",
      )
    } finally {
      clearTimeout(statusTimer.current)
      setPending(null)
      inputRef.current?.focus()
    }
  }

  // Deep links: /avatar?q=2 asks FAQ Q2, /avatar?m=Hello sends "Hello". The params are then removed.
  useEffect(() => {
    if (autoSent.current) return
    autoSent.current = true
    const q = params.get('q')?.replace(/^q/i, '') ?? ''
    const m = params.get('m')?.trim() ?? ''
    if (!/^\d{1,3}$/.test(q) && !m) return
    setParams({}, { replace: true })
    queueMicrotask(() => send(/^\d{1,3}$/.test(q) ? `Q${q}` : m)) // after this render, not inside the effect
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on arrival
  }, [])

  useEffect(() => {
    return () => clearTimeout(statusTimer.current)
  }, [])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(input)
  }

  const live = mode === 'human'
  const showIntro = messages.length === 0 && pending === null
  const twinWorking = pending !== null && !live
  const placeholder = live
    ? `Message ${profile.shortName}…`
    : mobile
      ? `Message ${profile.shortName}'s twin…`
      : `Message ${profile.shortName}'s twin…  (type "Q2" for an instant answer)`

  return (
    <section className="mx-auto flex h-[calc(100dvh-65px)] max-w-3xl flex-col px-0 sm:px-6">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-sm sm:px-0">
        {live ? (
          <span className="flex items-center gap-2 font-medium text-accent">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> You're chatting with {profile.shortName} live
          </span>
        ) : (
          <span className="flex items-center gap-2 text-muted">
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span>
              <span className="font-medium text-ink">{profile.shortName}</span> · digital twin
              <span className="hidden sm:inline"> · {online ? `${profile.shortName} is online` : `${profile.shortName} is away`}</span>
            </span>
          </span>
        )}
        <button
          type="button"
          onClick={clearChat}
          disabled={showIntro}
          title="Start a new conversation"
          className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-muted hover:bg-white hover:text-accent disabled:pointer-events-none disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Clear chat
        </button>
      </div>

      <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-0" aria-live="polite">
        {showIntro ? (
          <div className="flex flex-col items-center gap-4 pt-2 text-center sm:pt-6">
            <div className="twin-ring relative h-20 w-20 sm:h-24 sm:w-24">
              <img
                src={profile.twinPhoto}
                alt={`${profile.name}'s digital twin`}
                className="relative z-10 h-full w-full rounded-full border-4 border-paper object-cover"
              />
              <span
                className={`absolute top-0.5 right-0.5 z-20 h-4 w-4 rounded-full ring-4 ring-paper ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
                title={online ? `${profile.shortName} is online` : `${profile.shortName} is away`}
              />
            </div>
            <h1 className="max-w-xl font-serif text-2xl leading-snug font-semibold tracking-tight sm:text-4xl">
              Meet my <em className="text-accent">digital twin</em>
            </h1>
            <p className="max-w-lg text-base text-muted sm:text-lg">
              An AI version of me, trained on my career, projects and posts.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((m) => (
              <ChatBubble key={m.id} m={m} view="visitor" steps={steps[m.id]} />
            ))}
            {pending !== null && <ChatBubble m={{ id: -1, role: 'user', content: pending, created_at: '' }} view="visitor" />}
            {twinWorking && (
              <div className="flex items-center gap-2.5 pl-1 text-sm text-muted">
                <span className="flex gap-1">
                  {[0, 0.2, 0.4].map((d) => (
                    <span key={d} className="typing-dot h-1.5 w-1.5 rounded-full bg-accent" style={{ animationDelay: `${d}s` }} />
                  ))}
                </span>
                {status}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-0">
        {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <form onSubmit={onSubmit} className="flex items-end gap-2 rounded-2xl border border-line bg-white p-2 focus-within:border-accent">
          <textarea
            id="twin-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={placeholder}
            aria-label="Your message"
            className="max-h-40 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none"
          />
          <button
            type="submit"
            disabled={pending !== null || !input.trim()}
            title="Send (Enter)"
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white hover:bg-accent/90 disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
            </svg>
          </button>
        </form>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted sm:justify-start">
          <span className="hidden sm:inline">
            <Kbd>Enter</Kbd> to send
          </span>
          <span className="hidden sm:inline">
            <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> for a new line
          </span>
          <span>
            Type <strong className="text-accent">Qn</strong> for an instant FAQ answer
          </span>
          <span className="sm:ml-auto">AI twin, can make mistakes</span>
        </p>
      </div>
    </section>
  )
}

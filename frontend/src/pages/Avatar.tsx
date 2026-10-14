import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import ChatBubble from '../components/ChatBubble'
import { profile } from '../data/profile'
import { useInterval } from '../hooks/useInterval'
import { mergeMessages, pollChat, sendChat } from '../lib/api'
import type { ChatMessage, Mode } from '../types'

const suggestions = [
  'What do you work on at Hulamin?',
  'How do you deploy ML models to production?',
  'Tell me about your PhD research',
  "I'd like to talk to you about a role",
]

const greeting: ChatMessage = {
  id: 0,
  role: 'assistant',
  content: `Hi, I'm ${profile.shortName}'s digital twin 👋 Ask me anything about my experience, projects or skills.`,
  created_at: new Date().toISOString(),
}

export default function Avatar() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState<string | null>(null) // visitor message on its way
  const [mode, setMode] = useState<Mode>('bot')
  const [online, setOnline] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastId = messages.length ? messages[messages.length - 1].id : 0

  // Pick up the conversation where the visitor left off, then keep checking for live replies.
  const poll = useCallback(async () => {
    const s = await pollChat(lastId)
    setMessages((m) => mergeMessages(m, s.messages))
    setMode(s.mode)
    setOnline(s.operator_online)
  }, [lastId])
  useInterval(poll, pending === null ? 3000 : null)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, pending])

  async function send(text: string) {
    const message = text.trim()
    if (!message || pending !== null) return
    setInput('')
    setError('')
    setPending(message)
    try {
      const s = await sendChat(message, lastId)
      setMessages((m) => mergeMessages(m, s.messages))
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
      setPending(null)
      inputRef.current?.focus()
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(input)
  }

  const live = mode === 'human'
  const shown = [greeting, ...messages]
  const twinThinking = pending !== null && !live

  return (
    <section className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
      <div className="text-center">
        <div className="twin-ring relative mx-auto h-32 w-32">
          <img
            src={profile.twinPhoto}
            alt={`${profile.name}'s digital twin`}
            className="relative z-10 h-32 w-32 rounded-full border-4 border-paper object-cover"
          />
          <span className="absolute -bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-ink px-2.5 whitespace-nowrap py-0.5 text-[11px] font-semibold tracking-wider text-cyan-200 uppercase shadow">
            AI twin
          </span>
          <span
            className={`absolute top-1 right-1 z-20 h-5 w-5 rounded-full ring-4 ring-paper ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
            title={online ? `${profile.shortName} is online` : `${profile.shortName} is away`}
          />
        </div>
        <h1 className="mt-8 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Meet my Digital Twin</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          An AI version of me, trained on my career history. Ask about my experience, projects or skills, or ask to
          speak to me directly.
        </p>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-sm sm:px-6">
          {live ? (
            <span className="flex items-center gap-2 font-medium text-accent">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> You're chatting with {profile.shortName} live
            </span>
          ) : (
            <span className="text-muted">Chatting with {profile.shortName}'s digital twin</span>
          )}
          <span className="flex items-center gap-1.5 text-muted">
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            {online ? `${profile.shortName} is online` : `${profile.shortName} is away`}
          </span>
        </div>

        <div ref={logRef} className="h-[28rem] space-y-5 overflow-y-auto p-4 sm:p-6" aria-live="polite">
          {shown.map((m) => (
            <ChatBubble key={m.id} m={m} view="visitor" />
          ))}
          {pending !== null && <ChatBubble m={{ id: -1, role: 'user', content: pending, created_at: '' }} view="visitor" />}
          {twinThinking && (
            <div className="flex items-center">
              <div className="flex gap-1 rounded-2xl bg-accent-soft px-4 py-4">
                {[0, 0.2, 0.4].map((d) => (
                  <span key={d} className="typing-dot h-2 w-2 rounded-full bg-accent" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {messages.length === 0 && pending === null && (
          <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3 sm:px-6">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && <p className="border-t border-line bg-red-50 px-4 py-2 text-sm text-red-700 sm:px-6">{error}</p>}

        <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-line p-3 sm:p-4">
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
            placeholder={live ? `Message ${profile.shortName}…` : 'Ask me anything…'}
            aria-label="Your message"
            className="max-h-32 flex-1 resize-none rounded-xl border border-line bg-paper px-4 py-3 text-[15px] outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={pending !== null || !input.trim()}
            className="rounded-xl bg-accent px-5 py-3 font-medium text-white hover:bg-accent/90 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        My twin is an AI and can make mistakes. For anything important, email me at {profile.email}.
      </p>
    </section>
  )
}

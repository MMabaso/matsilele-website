import Markdown from 'react-markdown'
import type { ReactNode } from 'react'
import { profile } from '../data/profile'
import { formatTime } from '../lib/api'
import type { ActivityStep, ChatMessage } from '../types'

type View = 'visitor' | 'operator'

function SystemNote({ m }: { m: ChatMessage }) {
  return (
    <div className="flex items-center gap-3 py-1 text-xs text-muted">
      <span className="h-px flex-1 bg-line" />
      <span className="text-center">{m.content}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

const md = 'prose prose-sm max-w-none text-[15px] text-ink prose-p:my-1 prose-ul:my-1 prose-ol:my-1'

const toolLabels: Record<string, string> = {
  record_contact_request: `Passed your details to ${profile.shortName}`,
  request_live_chat: `Asked ${profile.shortName} to join live`,
  record_unanswered_question: `Noted your question for ${profile.shortName}`,
}

function stepLabel(s: ActivityStep): string | null {
  if (s.type === 'search') return s.count ? `Searched my knowledge base · ${s.count} passages` : 'Checked my profile'
  if (s.type === 'tool') return toolLabels[s.name] ?? s.name
  return null // instant answers get a tag next to the time instead
}

const check = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

function Meta({ name, time, children }: { name?: string; time: string; children?: ReactNode }) {
  return (
    <p className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
      {name && <span className="font-semibold text-ink/70">{name}</span>}
      {children}
      {time && <span>{formatTime(time)}</span>}
    </p>
  )
}

/**
 * visitor view: visitor on the right; twin and Matsilele on the left.
 * operator view (inbox): visitor on the left; twin and you on the right.
 */
export default function ChatBubble({
  m,
  view,
  visitorName,
  steps,
}: {
  m: ChatMessage
  view: View
  visitorName?: string
  steps?: ActivityStep[]
}) {
  if (m.role === 'system') return <SystemNote m={m} />

  const mine = view === 'visitor' ? m.role === 'user' : m.role !== 'user'

  if (view === 'visitor' && m.role === 'user') {
    return (
      <div className="flex items-start justify-end gap-2.5">
        <div className="flex max-w-[85%] min-w-0 flex-col items-end">
          <Meta time={m.created_at} />
          <div className="rounded-2xl rounded-tr-sm bg-ink px-4 py-3 text-[15px] break-words whitespace-pre-wrap text-white">
            {m.content}
          </div>
        </div>
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-line text-[11px] font-semibold text-muted">
          You
        </span>
      </div>
    )
  }

  if (view === 'visitor') {
    const live = m.role === 'operator'
    const instant = steps?.find((s) => s.type === 'instant')
    const done = (steps ?? []).map(stepLabel).filter((l): l is string => l !== null)
    return (
      <div className="flex items-start gap-2.5">
        <img
          src={live ? profile.photo : profile.twinPhoto}
          alt=""
          className={`mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover ${live ? 'ring-2 ring-accent' : ''}`}
        />
        <div className="max-w-[85%] min-w-0">
          {live ? (
            <Meta time={m.created_at}>
              <span className="flex items-center gap-1.5 font-semibold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {profile.shortName} · live
              </span>
            </Meta>
          ) : (
            <Meta name="Digital twin" time={m.created_at}>
              {instant && (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[11px] text-accent">
                  instant · Q{instant.faq}
                </span>
              )}
            </Meta>
          )}
          {done.map((label) => (
            <p key={label} className="mb-1 flex items-center gap-1.5 text-xs text-muted">
              <span className="text-accent">{check}</span> {label}
            </p>
          ))}
          <div
            className={`rounded-2xl rounded-tl-sm px-4 py-3 break-words ${
              live ? 'border-2 border-accent bg-white' : 'bg-accent-soft'
            } ${md}`}
          >
            <Markdown>{m.content}</Markdown>
          </div>
        </div>
      </div>
    )
  }

  // operator (inbox) view
  const label = m.role === 'user' ? visitorName ?? 'Visitor' : m.role === 'operator' ? 'You' : 'Digital twin'
  const tone =
    m.role === 'user'
      ? 'bg-white border border-line rounded-tl-sm'
      : m.role === 'operator'
        ? 'bg-accent text-white rounded-tr-sm prose-invert'
        : 'bg-accent-soft rounded-tr-sm'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%] min-w-0">
        <p className={`mb-1 text-xs text-muted ${mine ? 'text-right' : ''}`}>
          <span className="font-semibold text-ink/70">{label}</span> · {formatTime(m.created_at)}
        </p>
        <div className={`rounded-2xl px-4 py-2.5 break-words ${tone} ${md} ${m.role === 'operator' ? '!text-white' : ''}`}>
          <Markdown>{m.content}</Markdown>
        </div>
      </div>
    </div>
  )
}

import Markdown from 'react-markdown'
import { profile } from '../data/profile'
import { formatTime } from '../lib/api'
import type { ChatMessage } from '../types'

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

/**
 * visitor view: visitor on the right; twin and Matsilele on the left.
 * operator view (inbox): visitor on the left; twin and you on the right.
 */
export default function ChatBubble({ m, view, visitorName }: { m: ChatMessage; view: View; visitorName?: string }) {
  if (m.role === 'system') return <SystemNote m={m} />

  const mine = view === 'visitor' ? m.role === 'user' : m.role !== 'user'

  if (view === 'visitor' && m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-ink px-4 py-3 text-[15px] break-words whitespace-pre-wrap text-white">
          {m.content}
        </div>
      </div>
    )
  }

  if (view === 'visitor') {
    const live = m.role === 'operator'
    return (
      <div className="flex items-start">
        <div className="max-w-[85%] min-w-0">
          {live && (
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {profile.shortName} · live
            </p>
          )}
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

import type { ChatState, InboxConversation, InboxThread, Mode, Post, PostSummary } from '../types'

// Empty in dev (Vite proxy); set VITE_API_URL=https://api.yourdomain.com in production if hosted separately.
export const API = import.meta.env.VITE_API_URL ?? ''

export class HttpError extends Error {
  status: number
  constructor(status: number) {
    super(`Request failed: ${status}`)
    this.status = status
  }
}

function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1] ?? ''
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.method && init.method !== 'GET' ? { 'X-CSRFToken': csrfToken() } : {}),
      ...init.headers,
    },
  })
  if (!res.ok && res.status !== 503) throw new HttpError(res.status)
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------- posts
export const fetchPosts = (limit?: number) =>
  request<PostSummary[]>(`/api/posts/${limit ? `?limit=${limit}` : ''}`)

export const fetchPost = (slug: string) => request<Post>(`/api/posts/${slug}/`)

// ---------------------------------------------------------------- visitor chat
let memorySession = ''
export function sessionId(): string {
  try {
    let id = localStorage.getItem('twin-session')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('twin-session', id)
    }
    return id
  } catch {
    return (memorySession ||= crypto.randomUUID())
  }
}

/** "Clear chat": start a fresh conversation. The old one stays on the server (you still see it in /inbox). */
export function resetSession(): void {
  const id = crypto.randomUUID()
  memorySession = id
  try {
    localStorage.setItem('twin-session', id)
  } catch {
    /* private mode: the in-memory id is used */
  }
}

export const sendChat = (message: string, after: number) =>
  request<ChatState>('/api/chat/', {
    method: 'POST',
    body: JSON.stringify({ message, after, session_id: sessionId() }),
  })

export const pollChat = (after: number) => request<ChatState>(`/api/chat/${sessionId()}/?after=${after}`)

// ---------------------------------------------------------------- inbox (staff)
export const inboxMe = () => request<{ username: string }>('/api/inbox/me/')
export const inboxList = () => request<InboxConversation[]>('/api/inbox/conversations/')
export const inboxThread = (id: number, after = 0) =>
  request<InboxThread>(`/api/inbox/conversations/${id}/messages/?after=${after}`)
export const inboxReply = (id: number, content: string) =>
  request(`/api/inbox/conversations/${id}/messages/`, { method: 'POST', body: JSON.stringify({ content }) })
export const inboxSetMode = (id: number, mode: Mode) =>
  request<{ mode: Mode }>(`/api/inbox/conversations/${id}/mode/`, { method: 'POST', body: JSON.stringify({ mode }) })

// ---------------------------------------------------------------- misc
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export function mergeMessages<T extends { id: number }>(current: T[], incoming: T[]): T[] {
  if (incoming.length === 0) return current
  const seen = new Set(current.map((m) => m.id))
  const fresh = incoming.filter((m) => !seen.has(m.id))
  return fresh.length ? [...current, ...fresh].sort((a, b) => a.id - b.id) : current
}

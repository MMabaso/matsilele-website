export interface PostSummary {
  title: string
  slug: string
  excerpt: string
  cover_image: string | null
  tags: string[]
  published_at: string
}

export interface Post extends PostSummary {
  body: string
  updated_at: string
}

export type Role = 'user' | 'assistant' | 'operator' | 'system'
export type Mode = 'bot' | 'human'

export interface ChatMessage {
  id: number
  role: Role
  content: string
  created_at: string
}

/** What the twin did to produce a reply, shown as small status lines above it. */
export type ActivityStep =
  | { type: 'search'; count: number }
  | { type: 'tool'; name: string }
  | { type: 'instant'; faq: number }

export interface ChatState {
  messages: ChatMessage[]
  mode: Mode
  operator_online: boolean
  activity?: { message_id: number; steps: ActivityStep[] } // only on POST /api/chat/ when the twin replied
}

export interface FaqItem {
  number: number
  question: string
}

export interface InboxConversation {
  id: number
  name: string
  mode: Mode
  needs_human: boolean
  unread: number
  last_activity: string
  last_message: string
  last_role: Role | null
}

export interface InboxThread {
  conversation: { id: number; name: string; mode: Mode; needs_human: boolean }
  messages: ChatMessage[]
}

import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import { Link, useParams } from 'react-router-dom'
import { profile } from '../data/profile'
import { fetchPost, formatDate } from '../lib/api'
import type { Post } from '../types'

export default function PostDetail() {
  const { slug = '' } = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    setPost(null)
    setMissing(false)
    fetchPost(slug).then(setPost).catch(() => setMissing(true))
  }, [slug])

  useEffect(() => {
    document.title = post ? `${post.title} — ${profile.name}` : profile.name
  }, [post])

  if (missing)
    return (
      <div className="mx-auto max-w-2xl px-4 pt-24 text-center">
        <h1 className="font-serif text-3xl font-semibold">Post not found</h1>
        <Link to="/posts" className="mt-4 inline-block text-accent hover:underline">← Back to posts</Link>
      </div>
    )

  if (!post) return <div className="mx-auto max-w-2xl animate-pulse px-4 pt-24"><div className="h-10 w-3/4 rounded bg-line" /></div>

  return (
    <article className="mx-auto max-w-2xl px-4 pt-12 sm:px-6 sm:pt-16">
      <Link to="/posts" className="text-sm font-medium text-accent hover:underline">← All posts</Link>
      <h1 className="mt-6 font-serif text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">{post.title}</h1>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span className="font-medium text-ink">{profile.name}</span>
        <span>·</span>
        <time>{formatDate(post.published_at)}</time>
      </div>
      {post.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span key={t} className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">{t}</span>
          ))}
        </div>
      )}
      {post.cover_image && <img src={post.cover_image} alt="" className="mt-8 w-full rounded-xl" />}
      <div className="prose prose-lg mt-10 max-w-none prose-headings:font-serif prose-headings:font-semibold prose-a:text-accent">
        <Markdown>{post.body}</Markdown>
      </div>
    </article>
  )
}

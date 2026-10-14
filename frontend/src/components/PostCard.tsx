import { Link } from 'react-router-dom'
import { formatDate } from '../lib/api'
import type { PostSummary } from '../types'

const gradients = [
  'from-emerald-700 via-teal-600 to-cyan-500',
  'from-slate-800 via-indigo-700 to-sky-500',
  'from-amber-600 via-orange-500 to-rose-500',
  'from-teal-900 via-emerald-700 to-lime-500',
]

function Cover({ post, index }: { post: PostSummary; index: number }) {
  if (post.cover_image) {
    return <img src={post.cover_image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
  }
  return (
    <div className={`flex h-full w-full items-end bg-gradient-to-br p-5 ${gradients[index % gradients.length]}`}>
      <span className="font-serif text-2xl leading-tight font-semibold text-white/95">
        {post.tags[0] ?? 'Notes'}
      </span>
    </div>
  )
}

export default function PostCard({ post, index = 0 }: { post: PostSummary; index?: number }) {
  return (
    <Link to={`/posts/${post.slug}`} className="group block">
      <div className="aspect-[16/10] overflow-hidden rounded-xl">
        <Cover post={post} index={index} />
      </div>
      <time className="mt-4 block text-sm text-muted">{formatDate(post.published_at)}</time>
      <h3 className="mt-1 font-serif text-xl leading-snug font-semibold group-hover:text-accent">{post.title}</h3>
      <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-muted">{post.excerpt}</p>
    </Link>
  )
}

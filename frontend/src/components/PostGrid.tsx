import type { PostSummary } from '../types'
import PostCard from './PostCard'

export default function PostGrid({ posts, error }: { posts: PostSummary[] | null; error: boolean }) {
  if (error) return <p className="text-muted">Posts couldn't be loaded right now.</p>
  if (!posts)
    return (
      <div className="grid gap-10 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[16/10] rounded-xl bg-line" />
            <div className="mt-4 h-4 w-24 rounded bg-line" />
            <div className="mt-2 h-6 w-3/4 rounded bg-line" />
          </div>
        ))}
      </div>
    )
  if (posts.length === 0) return <p className="text-muted">No posts yet — check back soon.</p>
  return (
    <div className="grid gap-x-10 gap-y-14 sm:grid-cols-2">
      {posts.map((p, i) => (
        <PostCard key={p.slug} post={p} index={i} />
      ))}
    </div>
  )
}

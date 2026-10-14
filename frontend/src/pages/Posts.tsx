import PostGrid from '../components/PostGrid'
import { usePosts } from '../hooks/usePosts'

export default function Posts() {
  const { posts, error } = usePosts()
  return (
    <section className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 sm:pt-16">
      <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Posts</h1>
      <p className="mt-3 mb-12 max-w-2xl text-lg text-muted">
        Notes on production ML, MLOps, generative AI and lessons from the journey from research to industry.
      </p>
      <PostGrid posts={posts} error={error} />
    </section>
  )
}

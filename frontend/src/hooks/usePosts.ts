import { useEffect, useState } from 'react'
import { fetchPosts } from '../lib/api'
import type { PostSummary } from '../types'

export function usePosts(limit?: number) {
  const [posts, setPosts] = useState<PostSummary[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    fetchPosts(limit)
      .then((p) => alive && setPosts(p))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [limit])

  return { posts, error }
}

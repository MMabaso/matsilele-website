import { Link } from 'react-router-dom'
import PostGrid from '../components/PostGrid'
import { profile, site } from '../data/profile'
import { usePosts } from '../hooks/usePosts'

function LatestPosts() {
  const { posts, error } = usePosts(4)
  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6">
      <div className="mb-8 flex items-baseline justify-between border-t border-line pt-10">
        <h2 className="font-serif text-3xl font-semibold">Latest posts</h2>
        <Link to="/posts" className="text-sm font-medium text-accent hover:underline">All posts →</Link>
      </div>
      <PostGrid posts={posts} error={error} />
    </section>
  )
}

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-5xl px-4 pt-10 pb-12 sm:px-6 sm:pt-14">
        <div className="max-w-3xl">
          <img
            src={profile.photo}
            alt={profile.name}
            className="mb-8 h-32 w-32 rounded-full object-cover shadow-xl ring-4 ring-white sm:h-40 sm:w-40 sm:ring-8"
          />
          <div>
            <h1 className="font-serif text-5xl font-semibold tracking-tight sm:text-4xl">Hello, I’m Matsilele.</h1>
            <p className="mt-4 text-sm font-semibold tracking-wider text-accent uppercase">Data Scientist | AI Engineer</p>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-ink/85">
              <p>
                I'm {profile.shortName}. I work where the problem is: alongside the engineers, operators and business
                teams who live with it every day. I learn how their work really runs, then build and ship the AI that
                fixes it, in production.
              </p>
              <p>
                That means owning the whole path myself: discovery with stakeholders, data pipelines, models, the
                APIs and apps people actually use, and the CI/CD and cloud setup that keeps it all running. A working
                system in someone's hands beats a perfect model in a notebook.
              </p>
              <p>
                Right now I do this as a Senior Data Scientist at <strong className="font-semibold">Hulamin</strong>,
                embedded with engineering and operations teams and shipping ML apps on Azure. Before that I did the same
                at <strong className="font-semibold">Sasol</strong> and in credit risk at Consumer Profile Bureau, after
                a PhD in Electrical Engineering and computer vision research at the{' '}
                <strong className="font-semibold">CSIR</strong>.
              </p>
              <p>
                For more about me and my work, please{' '}
                <Link to="/avatar" className="font-medium text-accent underline decoration-2 underline-offset-4 hover:decoration-accent/40">
                  chat with my Digital Twin here
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {site.showPosts && <LatestPosts />}
    </>
  )
}

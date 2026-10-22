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
            <p className="mt-4 text-xl text-ink/85">
              I’m a <strong className="font-semibold text-accent">data scientist</strong> who works as a{' '}
              <strong className="font-semibold text-accent">AI engineer</strong>.
            </p>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-ink/85">
              <p>
                I like taking machine learning out of the notebook and putting it where the work actually happens: the
                plant floor, the control room, the operations meeting. Hopefully you’re here because you like that too.
                Outside work you’ll find me hiking (slowly, but always to the top) or ice skating, where I’ve mastered
                the art of falling gracefully and getting straight back up. Surprisingly good practice for production
                ML.
              </p>
              <p>
                I’m a Senior Data Scientist at <strong className="font-semibold">Hulamin</strong>, where I sit with
                engineering and operations teams and ship ML and generative AI apps into production on Azure. Before
                that I built forecasting and predictive maintenance tools at <strong className="font-semibold">Sasol</strong>,
                credit risk models at Consumer Profile Bureau, and spent eight years doing computer vision research at
                the <strong className="font-semibold">CSIR</strong> while earning a PhD in Electrical Engineering from
                the University of Johannesburg.
              </p>
              <p>
                Somewhere along the way I realised the hardest part of AI isn’t the model. It’s getting a real person to
                use it on a Tuesday morning. That’s what I care about now. If
                you’d rather just ask me,{' '}
                <Link to="/avatar" className="font-medium text-accent underline decoration-2 underline-offset-4 hover:decoration-accent/40">
                  my digital twin
                </Link>{' '}
                is awake 24/7 and, unlike me, never needs coffee first.
              </p>
            </div>
          </div>
        </div>
      </section>

      {site.showPosts && <LatestPosts />}
    </>
  )
}

import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import About from './pages/About'
import Avatar from './pages/Avatar'
import Home from './pages/Home'
import Inbox from './pages/Inbox'
import PostDetail from './pages/PostDetail'
import ProjectDetail from './pages/ProjectDetail'
import Posts from './pages/Posts'
import Projects from './pages/Projects'

function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-24 text-center">
      <h1 className="font-serif text-4xl font-semibold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-accent hover:underline">← Home</Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="avatar" element={<Avatar />} />
          <Route path="about" element={<About />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:slug" element={<ProjectDetail />} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/:slug" element={<PostDetail />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

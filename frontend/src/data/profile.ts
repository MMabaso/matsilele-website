// Edit this file to update the About page and site-wide details.

// Set showPosts to true to bring the blog back into the nav, footer, home page and project links.
// Post pages stay reachable by direct link either way, so the digital twin's links to posts keep working.
export const site = {
  showPosts: false,
}

export const profile = {
  name: 'Matsilele Mabaso',
  shortName: 'Matsilele',
  title: 'Data Scientist | AI Engineer',
  location: 'Pretoria, South Africa',
  email: 'matsilele.aubrey@gmail.com',
  photo: '/matsilele.jpg',
  twinPhoto: '/matsilele-twin.jpg', // AI-styled version used on the Digital Twin page
  social: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/matsilele-aubrey-mabaso-phd-74b37438' },
    { label: 'Email', href: 'mailto:matsilele.aubrey@gmail.com' },
  ],
}

export const experience = [
  {
    period: 'Nov 2024 – Present',
    role: 'Senior Data Scientist',
    org: 'Hulamin',
    place: 'Pietermaritzburg',
    summary:
      'Designing, building and deploying production ML applications across manufacturing — Django/DRF APIs, React/TypeScript frontends, Docker, GitHub Actions, and Azure (ACR, AKS, Blob Storage), with pipelines on Databricks and Spark. Leading ML initiatives and mentoring analysts and engineers.',
  },
  {
    period: 'Jan 2022 – Oct 2024',
    role: 'Data Scientist',
    org: 'Sasol',
    place: 'Sandton',
    summary:
      'Led end-to-end data science projects in predictive maintenance and process optimisation, built monitoring dashboards, and shipped a Django + React time-series forecasting API.',
  },
  {
    period: 'Nov 2019 – Dec 2021',
    role: 'Machine Learning Engineer',
    org: 'Consumer Profile Bureau',
    place: 'Bryanston',
    summary:
      'Credit scoring and risk models (+12% predictive accuracy), automated R Shiny reporting (−60% manual work) and a predictive dialling model (−25% idle time).',
  },
  {
    period: '2011 – 2019',
    role: 'Researcher, Computer Vision & ML',
    org: 'CSIR',
    place: 'Pretoria',
    summary:
      'Postgraduate and applied research in image processing, computer vision and robotic perception. Peer-reviewed publications, conference talks and student supervision. Also a part-time lecturer in Mathematical Statistics at TUT (2019).',
  },
]

export const education = [
  { year: '2015 – 2019', degree: 'Doctor of Electrical Engineering — Computer Vision & ML', school: 'University of Johannesburg' },
  { year: '2012 – 2014', degree: 'Master of Electrical Engineering — Image Processing (Distinction)', school: 'University of Johannesburg' },
  { year: '2010', degree: 'Honours in Mathematical Statistics (Cum Laude)', school: 'University of Limpopo' },
  { year: '2007 – 2009', degree: 'BSc Mathematics & Statistics (Cum Laude)', school: 'University of Limpopo' },
  { year: '2022', degree: 'Data Engineering', school: 'Explore Data Science Academy' },
]

// Leave `year` out while a certification is in progress; it shows an "In progress" badge instead.
export const certifications: { name: string; issuer?: string; year?: string }[] = [
  { name: 'Lean Six Sigma Green Belt' },
]

export const skills = [
  { group: 'ML Engineering & MLOps', items: ['MLflow', 'CI/CD', 'Docker', 'Kubernetes', 'Model monitoring', 'Retraining'] },
  { group: 'Cloud & Data', items: ['Azure', 'AKS', 'ACR', 'Blob Storage', 'Databricks', 'PySpark', 'Delta Lake'] },
  { group: 'Machine Learning', items: ['Regression', 'Classification', 'Deep learning', 'NLP', 'Time series', 'Computer vision'] },
  { group: 'Generative AI', items: ['LLMs', 'RAG', 'Embeddings', 'FAISS', 'ChromaDB', 'Semantic search'] },
  { group: 'Software', items: ['Python', 'SQL', 'R', 'TypeScript', 'React', 'Django / DRF'] },
]

export const awards = [
  '2019 — Invited Speaker, International Conference on Soft Computing and Machine Learning, Wuhan, China',
  '2018 — Best Doctor of Engineering Student, CSIR',
  '2018 — Paper selected for journal publication, BIOSTEC, Madeira, Portugal',
  '2017 — Best Paper Presentation, AIECES, Madanapalle, India',
  '2014 — Best Master of Engineering Student, CSIR',
  '2009 — Best Bachelor of Science Student, University of Limpopo',
]

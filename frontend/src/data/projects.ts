// Edit this file to add or update projects on the Projects page.
// Projects are numbered in the order they appear here.

export interface Project {
  name: string
  slug: string // URL: /projects/<slug>
  org?: string
  tagline: string
  image: string
  imageCredit?: string
  problem?: string
  summary: string
  highlights: string[]
  question?: string // an example question a user would ask the product
  contributions?: string[] // what I did on the project
  objective?: string
  impact?: string
  stack: string[]
  links?: { label: string; href: string }[] // hrefs starting with / open in the same tab
}

export const projects: Project[] = [
  {
    name: 'Hulamin Knowledge Base Assistant',
    slug: 'hulamin-knowledge-base-assistant',
    org: 'Hulamin',
    tagline: 'A private GenAI assistant that answers questions about Hulamin from its own documents',
    image: '/projects/knowledge-base-assistant.svg',
    problem:
      'Manufacturing sites run on documentation: engineering manuals, standard operating procedures and reports. ' +
      'The knowledge is there, but finding the right answer quickly is the hard part.',
    summary:
      'An enterprise knowledge base assistant that pairs a private LLM with retrieval-augmented generation (RAG), so ' +
      "people can simply ask a question about Hulamin and get an answer grounded in the company's own documents.",
    highlights: [
      'Answers questions in natural language from engineering manuals, SOPs and reports',
      'Retrieves the most relevant passages with semantic search, then hands them to the LLM as context',
      'Shows the sources behind each answer, so engineers can check where it came from',
      'Runs on a private LLM, so internal documents stay in-house',
    ],
    question: 'What checks are needed before restarting the cold mill after a work roll change?',
    contributions: [
      'Built the document pipeline that chunks, embeds and indexes company documents for semantic search with FAISS / ChromaDB',
      'Built the RAG flow that retrieves relevant passages and grounds the private LLM’s answers in them',
    ],
    impact: 'People can ask instead of hunting through folders, and support requests dropped by 40%.',
    stack: ['Python', 'LLMs', 'RAG', 'Embeddings', 'FAISS', 'ChromaDB', 'Semantic search'],
    links: [{ label: 'Read the write-up', href: '/posts/building-a-private-rag-chatbot-over-engineering-manuals' }],
  },
  {
    name: 'Manufacturing Recovery & Loss Management Dashboard',
    slug: 'recovery-loss-management-dashboard',
    org: 'Hulamin',
    tagline: 'A full-stack dashboard that tracks manufacturing losses and makes sure corrective actions get done',
    image: '/projects/recovery-loss-dashboard.svg',
    summary:
      'A full-stack dashboard at Hulamin that monitors manufacturing losses and recovery performance, links each loss ' +
      'to a corrective action with an owner and a deadline, and follows up automatically when actions run late.',
    highlights: [
      'Interactive analytics for manufacturing losses, recovery performance and loss categories',
      'Corrective-action tracking that links losses to responsible teams, action owners and target dates',
      'Automatic reminders when corrective actions pass their deadline',
      'Connected to the Hulamin Knowledge Base Assistant',
    ],
    contributions: [
      'Designed, developed and deployed a full-stack manufacturing recovery and loss management dashboard using Python, Django REST Framework and React',
      'Implemented interactive analytics to monitor manufacturing losses, recovery performance and loss categories, supporting data-driven operational decision-making',
      'Developed corrective-action tracking workflows linking identified losses to responsible teams, action owners and target completion dates',
      'Automated overdue-action reminders to notify responsible teams when corrective actions exceeded their deadlines, improving accountability and follow-up',
      "Integrated the dashboard with the Hulamin Knowledge Base Assistant, connecting manufacturing reporting workflows with the company's AI-powered knowledge assistance capability",
      "Containerised the application using Docker and deployed it within Hulamin's in-house environment",
    ],
    stack: ['Python', 'Django REST Framework', 'React', 'Docker', 'AI integration', 'Workflow automation'],
  },
  {
    name: 'Automated Pinhole Detection & Quality Decision Support System',
    slug: 'pinhole-detection',
    org: 'Hulamin',
    tagline: 'Computer vision that counts pinholes in aluminium foil and recommends a quality disposition',
    image: '/projects/pinhole-detection.svg',
    summary:
      'An automated computer vision system at Hulamin that detects and counts pinholes in illuminated foil samples ' +
      'using a Basler industrial camera and fluorescent lighting, then recommends what to do with the material.',
    highlights: [
      'Detects and counts pinholes automatically, eliminating the need for manual operator counting',
      'Recommends one of three predefined quality dispositions: release to customer, refer to a product specialist, or reject',
      'In operational use within the manufacturing quality inspection process',
    ],
    contributions: [
      'Developed and deployed an automated computer vision system to detect and count pinholes in illuminated foil samples using a Basler industrial camera and fluorescent lighting',
      'Implemented image-processing algorithms using OpenCV to automate pinhole identification and quantification, eliminating the need for manual operator counting',
      'Developed a Streamlit application to display inspection results and recommend predefined quality dispositions: release to customer, refer to a product specialist for further assessment, or reject',
      'Containerised the application using Docker and deployed it for operational use within the manufacturing quality inspection process',
    ],
    impact:
      'Improved inspection efficiency and decision consistency, while contributing to a reduction in customer ' +
      'complaints associated with foil quality defects.',
    stack: ['Python', 'OpenCV', 'Basler industrial camera', 'Streamlit', 'Docker', 'Computer vision'],
  },
  {
    name: 'Argus Commodity Price Forecasting',
    slug: 'argus-commodity-price-forecasting',
    org: 'Sasol',
    tagline: 'Time-series forecasting of raw material commodity prices, built with Django and React',
    image: '/projects/argus-commodity-price-forecasting.svg',
    summary:
      'A forecasting application at Sasol that uses Argus commodity price data to predict where raw material prices are ' +
      'heading, and puts those forecasts in front of the people who plan and buy.',
    highlights: [
      'Forecasts commodity prices for raw materials from Argus price data',
      'Uses time-series models to project prices forward, with uncertainty ranges around each forecast',
      'Serves forecasts through a Django API to a React frontend',
    ],
    contributions: [
      'Created the Django backend and the forecasting API that serves model output',
      'Integrated the backend into an existing React frontend, so forecasts appear where users already work',
    ],
    stack: ['Python', 'Django', 'React', 'Time series', 'Forecasting', 'Argus price data'],
  },
]

/** "01", "02", ... from the project's position in the list. */
export const projectNumber = (index: number) => String(index + 1).padStart(2, '0')

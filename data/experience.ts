export interface Experience {
  id: string
  company: string
  role: string
  location: string
  period: string
  current?: boolean
  bullets: string[]
  tags: string[]
  color: string
}

export interface Education {
  school: string
  degree: string
  location: string
  period: string
  gpa?: string
  courses: string[]
}

export const experiences: Experience[] = [
  {
    id: 'itron-2',
    company: 'Itron',
    role: 'Software Engineer Intern',
    location: 'San Jose, CA',
    period: 'Jan 2026 – Present',
    current: true,
    bullets: [
      'Engineered a clustering algorithm in C++ for 1M+ location-based data points, optimizing map performance',
      'Built an Angular frontend to render clustered data with TypeScript/HTML/CSS, reducing map latency by 70%',
      'Executed automated testing using Pytest in Linux environments, reporting defects to improve stability',
    ],
    tags: ['C++', 'Angular', 'TypeScript', 'Pytest', 'Linux'],
    color: '#00F5FF',
  },
  {
    id: 'itron-1',
    company: 'Itron',
    role: 'Full Stack Engineer Intern',
    location: 'San Jose, CA',
    period: 'Jun – Sep 2025',
    bullets: [
      'Built C#/.NET REST APIs with SQL Server to automate tenant settings configuration, reducing setup time',
      'Developed Angular microfrontend modules with TypeScript for the admin portal, creating custom editors',
      'Optimized CI/CD workflows using Postman and Azure DevOps, increasing deployment reliability',
    ],
    tags: ['C#', '.NET', 'Angular', 'Azure DevOps', 'SQL Server'],
    color: '#8B5CF6',
  },
  {
    id: 'theverse',
    company: 'The Verse',
    role: 'Software Engineer Intern',
    location: 'Berkeley, CA',
    period: 'Jun – Sep 2024',
    bullets: [
      'Programmed plant/animal behaviors to create a dynamic ecosystem using Unity and C#, increasing gameplay realism',
      'Integrated SQL database for player progress, reducing load times by 30% and ensuring persistent game state',
      'Automated deployment pipelines using GitHub Actions and CI/CD, improving workflow efficiency',
    ],
    tags: ['Unity', 'C#', 'SQL', 'GitHub Actions', 'Game Dev'],
    color: '#FF006E',
  },
  {
    id: 'textify',
    company: 'Textify Analytics',
    role: 'Data Science Intern',
    location: 'Remote',
    period: 'Jul – Sep 2024',
    bullets: [
      'Built a news tool using Python/LangChain for NLP to process 1000+ articles daily and surface query-relevant news',
      'Managed data processing workflows via a React dashboard, converting news into structured Docs/Slides',
      'Maintained a MongoDB vector database to store and index scraped news articles, reducing retrieval time by 40%',
    ],
    tags: ['Python', 'LangChain', 'NLP', 'React', 'MongoDB', 'Vector DB'],
    color: '#00F5FF',
  },
]

export const education: Education = {
  school: 'University of California, Santa Cruz',
  degree: 'B.S. Computer Science: Game Design, Minor in Computer Science',
  location: 'Santa Cruz, CA',
  period: 'Expected June 2026',
  courses: ['AI', 'Machine Learning', 'Algorithms', 'Data Structures', 'OOP', 'Networks'],
}

export const skills = {
  languages: ['Python', 'C++', 'TypeScript', 'JavaScript', 'Swift', 'Java', 'C#', 'SQL', 'C', 'Ruby'],
  frameworks: ['React', 'Next.js', 'Angular', 'Flask', 'Node.js', '.NET', 'Unity', 'TensorFlow', 'LangChain', 'React Native'],
  tools: ['Azure', 'Docker', 'FastAPI', 'REST APIs', 'NGINX', 'PostgreSQL', 'MongoDB', 'Power BI'],
  ai: ['LLMs', 'NLP', 'ETL', 'Vector Databases', 'Scikit-learn', 'Pandas', 'NumPy', 'SSIS'],
}

export interface Project {
  id: string
  title: string
  description: string
  longDescription: string
  tags: string[]
  github: string
  demo?: string
  award?: string
  color: string
  accentColor: string
  year: string
}

export const projects: Project[] = [
  {
    id: 'brailleout',
    title: 'BrailleOut',
    description: 'A physical assistive device that reads real-world text through a webcam, processes it with AI, and outputs it in Braille.',
    longDescription: 'Won 1st Place at HackDavis 2026. Uses computer vision and AI to make the physical world accessible for visually impaired users.',
    tags: ['Python', 'Computer Vision', 'AI', 'Hardware', 'OpenCV'],
    github: 'https://github.com/varunpalanisamy/BrailleOut',
    award: '🏆 HackDavis 2026 Winner',
    color: '#00F5FF',
    accentColor: 'rgba(0, 245, 255, 0.15)',
    year: '2026',
  },
  {
    id: 'ecoquest',
    title: 'EcoQuest',
    description: 'Competition app that encourages users to recycle and find ways to clean the environment using on-device AI and IBM automation.',
    longDescription: 'Won 1st Place at SF Hacks 2026. Deployed on-device Meta ExecuTorch model for litter classification, with IBM App Connect pipeline for cross-platform notifications.',
    tags: ['Swift', 'TypeScript', 'ExecuTorch', 'IBM App Connect', 'MongoDB', 'Snowflake'],
    github: 'https://github.com/sbelambe/EcoQuest',
    award: '🏆 SF Hacks 2026 Winner',
    color: '#8B5CF6',
    accentColor: 'rgba(139, 92, 246, 0.15)',
    year: '2026',
  },
  {
    id: 'bananabreak',
    title: 'BananaBreak',
    description: 'Full-stack website helping UCSC students find empty classrooms to relax, study, or hang out between classes.',
    longDescription: 'Built a quarterly-updating class info API pipeline using Selenium, storing and indexing data in MongoDB. Node.js & EJS full-stack with Google Maps integration.',
    tags: ['Node.js', 'EJS', 'MongoDB', 'Selenium', 'Google Maps API'],
    github: 'https://github.com/varunpalanisamy/BananaBreak',
    demo: 'https://bananabreak.tech',
    color: '#FF006E',
    accentColor: 'rgba(255, 0, 110, 0.15)',
    year: '2024',
  },
  {
    id: 'djsetmaker',
    title: 'DJ Set Maker',
    description: 'AI-powered DJ set generator — blending my passion for music production with machine learning to create intelligent, dynamic sets.',
    longDescription: 'Combines music theory, audio analysis, and machine learning to generate DJ sets. Built from my background as a music producer.',
    tags: ['Python', 'Machine Learning', 'Audio Analysis', 'AI', 'Music'],
    github: 'https://github.com/varunpalanisamy/DJ_Set_Maker',
    color: '#00F5FF',
    accentColor: 'rgba(0, 245, 255, 0.15)',
    year: '2025',
  },
]

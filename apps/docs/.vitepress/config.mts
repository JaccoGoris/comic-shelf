import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Comic Shelf',
  description: 'A self-hosted comic book collection manager',
  base: '/comic-shelf/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started/installation' },
      { text: 'Features', link: '/features/comic-management' },
      { text: 'Deployment', link: '/deployment/docker' },
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Dev Setup', link: '/getting-started/dev-setup' },
          { text: 'Running', link: '/getting-started/running' },
        ],
      },
      {
        text: 'Features',
        items: [
          { text: 'Comic Management', link: '/features/comic-management' },
          { text: 'Series Tracking', link: '/features/series-tracking' },
          { text: 'Metron Integration', link: '/features/metron-integration' },
          { text: 'Backup System', link: '/features/backup-system' },
          { text: 'Barcode Scanner', link: '/features/barcode-scanner' },
          { text: 'Statistics', link: '/features/statistics' },
        ],
      },
      {
        text: 'Authentication',
        items: [
          { text: 'Authentication', link: '/auth/authentication' },
          { text: 'OIDC', link: '/auth/oidc' },
          { text: 'User Management', link: '/auth/user-management' },
        ],
      },
      {
        text: 'Deployment',
        items: [
          { text: 'Docker', link: '/deployment/docker' },
          { text: 'Environment Variables', link: '/deployment/environment-variables' },
          { text: 'CI/CD', link: '/deployment/ci-cd' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Project Structure', link: '/architecture/project-structure' },
          { text: 'API', link: '/architecture/api' },
          { text: 'Frontend', link: '/architecture/frontend' },
          { text: 'Database', link: '/architecture/database' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/JaccoGoris/comic-shelf' },
    ],
  },
})

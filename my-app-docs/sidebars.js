module.exports = {
  docs: [
    {
      type: 'doc',
      id: 'intro',
      label: '  Welcome to CloudMaSa',
    },


     {
      type: 'category',
      label: 'OVERVIEW',
      collapsed: false,
      items: [
        'overview/what-is-cloudmasa',
        'overview/architecture',
        'overview/basic-concepts',
        'overview/products',
      ],
    },

    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/get-access', 
        'getting-started/first-login',
        'getting-started/dashboard-overview',
      ],
    },
    {
      type: 'category',
      label: 'Core Features',
      collapsed: true,
      items: [
        'features/dashboard',
        'features/workspace',
        'features/cloud-connector',
        'features/clusters',
        {
      type: 'category',
      label: 'Workflow',
      collapsed: true,
      items: [
        'features/workflow/overview', 
        'features/workflow/aws',
        'features/workflow/gcp',
        'features/workflow/azure'
      ],
        },
        'features/scm-connector',
        'features/tools',
        'features/database',
        'features/policies',
        'features/masa-bot',
      ],
    },
    
    {
      type: 'category',
      label: 'Guides & Best Practices',
      collapsed: true,
      items: [
        'guides/automate-k8s-deploy',
        'guides/team-collaboration',
        'guides/troubleshooting',
      ],
    },
    {
      type: 'doc',
      id: 'changelog',
      label: 'Changelog',
    },
  ],
};
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        <img 
        src="https://i.ibb.co/202j1W2v/sofia-logo.png" 
        alt="SOFIA Builder Logo" 
        className="h-8 dark:hidden" 
          />
          <img 
        src="https://i.ibb.co/yFH80Dpg/sofia-logo-white.png" 
        alt="SOFIA Builder Logo" 
        className="h-8 hidden dark:block" 
          />
      </>
    ),
  },
  links: [
    {
      text: 'Documentation',
      url: '/docs',
      active: 'nested-url',
    },
  ],
};

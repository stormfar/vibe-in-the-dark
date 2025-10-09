'use client';

import TurboRenderer from './TurboRenderer';

interface PreviewRendererProps {
  renderMode: 'retro' | 'turbo';
  html?: string;
  css?: string;
  jsx?: string;
  className?: string;
}

export default function PreviewRenderer({ renderMode, html, css, jsx, className }: PreviewRendererProps) {
  if (renderMode === 'turbo' && jsx) {
    return (
      <div className={`${className} overflow-auto`}>
        <TurboRenderer jsx={jsx} />
      </div>
    );
  }

  // Retro mode - use iframe
  return (
    <iframe
      srcDoc={`
        <!DOCTYPE html>
        <html>
          <head>
            <style>${css || ''}</style>
          </head>
          <body>${html || '<div style="padding: 20px; font-size: 12px;">Waiting...</div>'}</body>
        </html>
      `}
      sandbox="allow-same-origin"
      className={className || "w-full h-full border-0"}
    />
  );
}

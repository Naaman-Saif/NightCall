import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/300.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/400-italic.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import './design-system/styles.css';
import './app.css';
import { App } from './app';
import { MascotMotionProvider } from './brand/mascot-motion';
import './brand/goose.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <MascotMotionProvider><App /></MascotMotionProvider>
  </StrictMode>,
);

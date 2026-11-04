import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/unbounded/wght.css';
import '@fontsource-variable/onest/wght.css';
import '@fontsource-variable/martian-mono/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/materials.css';
import './styles/sections.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

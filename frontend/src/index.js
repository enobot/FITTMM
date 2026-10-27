import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/barlow/400';
import '@fontsource/barlow/500';
import '@fontsource/barlow/600';
import '@fontsource/barlow/700';
import '@fontsource/big-shoulders-display/700';
import '@fontsource/big-shoulders-display/800';
import './styles/tokens.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { initTheme } from './theme';

initTheme();

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML = '<p style="padding:20px">Root element not found.</p>';
} else {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  reportWebVitals();
}

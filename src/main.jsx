import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import BandeauCookies from './components/BandeauCookies.jsx';
import { demarrerMesureAudience } from './lib/mesureAudience.js';

import './styles/base.css';
import './styles/layout.css';
import './styles/home.css';
import './styles/form.css';
import './styles/rnpp-photo.css';
import './styles/suivi.css';
import './styles/infos.css';
import './styles/faq.css';
import './styles/cookies.css';

demarrerMesureAudience();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <BandeauCookies />
  </React.StrictMode>
);

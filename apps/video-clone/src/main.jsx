import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import EmbedApp from './EmbedApp';
import { ViralLibraryPage } from './VideoGenModal';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const isEmbed = params.has('embed');
const isViral = params.has('viral');
if (isEmbed) document.documentElement.classList.add('is-embed');
if (isViral) document.documentElement.classList.add('is-viral');

function ViralStandalone() {
  return <ViralLibraryPage standalone onUse={() => {}} />;
}

createRoot(document.getElementById('root')).render(
  isViral ? <ViralStandalone /> : isEmbed ? <EmbedApp /> : <App />
);

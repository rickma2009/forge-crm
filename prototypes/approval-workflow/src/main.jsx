import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../../packages/web/src/styles/index.css';
import '../../../packages/web/src/showcase/showcase.css';
import './styles.css';
import App from './App.jsx';
createRoot(document.getElementById('root')).render(<App/>);

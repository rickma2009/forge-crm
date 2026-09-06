import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RootApp } from './app/RootApp';
import './styles/index.css';
import './showcase/showcase.css';

createRoot(document.getElementById('root')!).render(<StrictMode><RootApp /></StrictMode>);

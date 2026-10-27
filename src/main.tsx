import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/500-italic.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/600.css';
import '@fontsource/roboto/700.css';
import App from './App';
import './styles.css';
import './responsive.css';
import './onboarding.css';

const root = document.getElementById('root');
if (!root) throw new Error('Application root is missing.');
ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);

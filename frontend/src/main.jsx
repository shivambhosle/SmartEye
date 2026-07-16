import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CitizenAuthProvider } from './context/CitizenAuthContext.jsx';
import { StaffAuthProvider } from './context/StaffAuthContext.jsx';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CitizenAuthProvider>
        <StaffAuthProvider>
          <App />
        </StaffAuthProvider>
      </CitizenAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
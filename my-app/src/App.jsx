import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './login';
import ForgetPassword from './ForgetPassword';
import './App.css';
import Admin from './Admin';
import AdminDashboard from './AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route path="/forget-password" element={<ForgetPassword />} />
        
        <Route path="/admin" element={<Admin />} />
        
        <Route path="/AdminDashboard" element={<AdminDashboard />} />
      
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './login';
import ForgetPassword from './ForgetPassword';
import './App.css';
import Admin from './Admin';
import AdminDashboard from './AdminDashboard';
import StudentDashboard from './StudentDashboard';
import ProfessorDashboard from './ProfessorDashboard';
import Navbar from './Navbar';  

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>    
        <Route path="/" element={<Login />} />
        
        <Route path="/forget-password" element={<ForgetPassword />} />
        
        <Route path="/admin" element={<Admin />} />
        
        <Route path="/AdminDashboard" element={<AdminDashboard />} />

        <Route path="/StudentDashboard" element={<StudentDashboard />} />

        <Route path="/ProfessorDashboard" element={<ProfessorDashboard />} />
      
      </Routes>
    </BrowserRouter>
  );
}

export default App;
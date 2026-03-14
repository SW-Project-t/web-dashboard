import React, { useState } from 'react';
import axios from 'axios';
import { signInWithEmailAndPassword } from "firebase/auth"; 
import { auth } from "./firebase"; 
import uniLogo from './assets/logo2.jpg';
import teamLogo from './assets/yallaclass_logo.jpg';
import { FiMail, FiLock, FiPlus, FiHash } from 'react-icons/fi'; 
import ParticleBackground from './movingbackground';
import './Admin.css';

function Admin() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentcode, setStudentCode] = useState('');
  
  const [role, setRole] = useState('Student');
  const [academicYear, setAcademicYear] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('https://yallaclass-backend-production.up.railway.app/admin/add-user', {
        email,
        password,
        fullName,
        role,
        academicYear
      });
      if (response.data.success) {
        alert("User added successfully!");
        setEmail('');
        setPassword('');
        setFullName('');
        setAcademicYear('');
      }
    } catch (error) {
      console.error("Error adding user:", error);
      alert(error.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div id="admin_unique_page">
    <div className='admin_page_wrapper'>
      <div>
        <ParticleBackground />
      </div>
      <img src={uniLogo} alt="University Logo" className="admin_page_logo" />
      
      <div className='admin_form_card'>
        <div className="admin_header_brand">
          <img src={teamLogo} alt="Yalla Class Logo" className="admin_brand_logo" />
          <h1 className='admin_brand_text'>Yalla Class</h1>
        </div>
        
        <div className='admin_form_content'>
          <h1 className='admin_title'>Admin Panel - Add User</h1>
          
          <p className="admin_input_label">Student Code</p>
            <div className="admin_input_wrapper">
                <FiHash className="admin_input_icon_left" />
                <input
                    type="text"
                    placeholder="Enter student code"
                    value={studentcode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    className="admin_input_field"
                />
            </div>
          <p className="admin_input_label">User Email</p>
          <div className="admin_input_wrapper">
            <FiMail className="admin_input_icon_left" />
            <input 
                    type="email" 
                    placeholder="Enter user email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="admin_input_field"
            />
          </div>
          <p className="admin_input_label">Password</p>
          <div className="admin_input_wrapper">
            <FiLock className="admin_input_icon_left" />
             <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter user password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="admin_input_field admin_input_with_right_icon" 
               />
             </div>
          <button 
          className='admin_submit_button' 
           onClick={handleAdd}
           disabled={loading}>
            {loading ? "Processing..." : "Add User"} <FiPlus className="admin_button_icon" />
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin;
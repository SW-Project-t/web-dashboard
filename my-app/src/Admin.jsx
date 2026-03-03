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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const handleAdd = async () => {
    if (studentcode === "" || email === "" || password === "") {
      alert("Please enter student code, email, and password");
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      const response = await axios.post('http://localhost:3001/verify-login', {
        idToken: idToken ,
        studentcode: studentcode
      });

      if (response.data.success) {
        alert("Added Successfully! " + response.data.profile.fullName);
        setStudentCode("");
        setEmail("");
        setPassword("");
        }
      } catch (error) {
      console.error("Full Error Details:", error);
      const errorMessage = error.response?.data?.message || error.message;
      alert("Action Failed: " + errorMessage);
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
          <button className='admin_submit_button' onClick={handleAdd}>
            Add User <FiPlus className="admin_button_icon" />
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin;
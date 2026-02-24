import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase"; 
import uniLogo from './assets/logo2.jpg';
import teamLogo from './assets/yallaclass_logo.jpg';
import { FiMail, FiLock, FiEye, FiEyeOff , FiLogIn } from 'react-icons/fi';

function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const handleSignIn = async () => {
    if (email === "" || password === "") {
      alert("Please enter both email and password");
      return;
    }

    try {
      console.log("1. Authenticating with Firebase...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      console.log("2. Real Token obtained!");
      console.log("3. Sending Token to your server...");
      const response = await axios.post('http://localhost:3000/verify-login', {
        idToken: idToken 
      });
      if (response.data.success) {
        alert("Login Successful! Welcome " + response.data.profile.name);
        localStorage.setItem('token', response.data.token);
        navigate('');
      }
    } catch (error) {
      console.error("Full Error Details:", error);
      const errorMessage = error.response?.data?.message || error.message;
      alert("Login Failed: " + errorMessage);
    }
  };
  return (
    <div className='container1'>
      <img src={uniLogo} alt="University Logo" className="page_logo" />
      <div className='container2'>
        <div className="header_brand">
          <img src={teamLogo} alt="Yalla Class Logo" className="brand_logo" />
          <h1 className='logo'>Yalla Class</h1>
        </div>
        <div className='login_container'>
          <h1 className='login'>Login</h1>
          
          <p>Email</p>
          <div className="input_wrapper">
            <FiMail className="input_icon_left" />
            <input 
              type="email" 
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input_with_icon"
            />
          </div>
          
          <p>Password</p>
          <div className="input_wrapper">
            {/* أيقونة القفل اللي على الشمال */}
            <FiLock className="input_icon_left" />
            
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input_with_icon input_with_right_icon" 
            />
            
            {/* أيقونة العين اللي على اليمين (بتتغير حسب الـ State) */}
            <span className="toggle_password_icon" onClick={togglePasswordVisibility}>
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </span>
          </div>

          <Link to="/forget-password" className="forgot_password">Forgot Password?</Link>
          
          <button className='login_button' onClick={handleSignIn}>
            Sign in <FiLogIn className="sign_in_icon" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
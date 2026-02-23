import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase"; 
function Login() {
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

      // التعديل هنا: غيرنا المسار لـ /verify-login
      const response = await axios.post('http://localhost:3000/verify-login', {
        idToken: idToken 
      });

      if (response.data.success) {
        // التعديل هنا: جلب البيانات من profile اللي الباك إند بيبعته
        alert("Login Successful! Welcome " + response.data.profile.fullName);
        localStorage.setItem('token', idToken); // حفظ التوكن
        navigate('/dashboard'); // أو أي مسار عندك
      }
    } catch (error) {
      console.error("Full Error Details:", error);
      const errorMessage = error.response?.data?.error || error.message;
      alert("Login Failed: " + errorMessage);
    }
  };
  return (
    <div className='container1'>
      <div className='container2'>
        <h1 className='logo'>Yalla Class</h1>
        <div className='login_container'>
          <h1 className='login'>Login</h1>
          
          <p>Email</p>
          <input type="email" 
          placeholder="example@mail.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          />
          
          <p>Password</p>
          <div className="password_wrapper">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="eye_icon" onClick={togglePasswordVisibility}>
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          <Link to="/forget-password" className="forgot_password">Forgot Password?</Link>
          
          <button className="login_button" onClick={handleSignIn}>Sign in</button>
        </div>
      </div>
    </div>
  );
}

export default Login;
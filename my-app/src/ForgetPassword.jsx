import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { getAuth, sendPasswordResetEmail } from "firebase/auth"

function ForgetPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleResetPassword = async () => {
    if (!email) {
      alert("Please enter your email address");
      return;
    }

    setIsLoading(true);
    const auth = getAuth();

    try {
      await sendPasswordResetEmail(auth, email);
      
      alert("Password reset email sent! Please check your inbox.");
    } catch (error) {
      console.error("Error sending reset email:", error)
      alert("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
};
  return (
    <div className='container1'>
      <div className='container2'>
        <h1 className='logo'>Yalla Class</h1>
        <div className='login_container'>
          <h1 className='login'>Reset Password</h1>
          
          <p style={{ fontSize: '14px', marginBottom: '20px', color: '#cbd5e1' }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
          
          <p>Email</p>
          <input type="email" 
          placeholder="example@mail.com"
          value = {email}
          onChange={(e) => setEmail(e.target.value)}/>
          
          <button className='login_button' 
          onClick={handleResetPassword} 
          disabled={isLoading}>
          {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
          <Link to="/" className="forgot_password" style={{ textAlign: 'left', marginTop: '20px' }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgetPassword;
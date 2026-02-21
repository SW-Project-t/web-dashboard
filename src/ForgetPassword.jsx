import React from 'react';
import { Link } from 'react-router-dom';

function ForgetPassword() {
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
          <input type="email" placeholder="example@mail.com"/>
          
          <button className='login_button'>Send Reset Link</button>
          <Link to="/" className="forgot_password" style={{ textAlign: 'left', marginTop: '20px' }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgetPassword;
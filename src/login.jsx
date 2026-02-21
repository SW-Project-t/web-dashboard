import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function Login() {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className='container1'>
      <div className='container2'>
        <h1 className='logo'>Yalla Class</h1>
        <div className='login_container'>
          <h1 className='login'>Login</h1>
          
          <p>Email</p>
          <input type="email" placeholder="example@mail.com"/>
          
          <p>Password</p>
          <div className="password_wrapper">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
            />
            <span className="eye_icon" onClick={togglePasswordVisibility}>
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          <Link to="/forget-password" className="forgot_password">Forgot Password?</Link>
          
          <button className='login_button'>Sign in</button>
        </div>
      </div>
    </div>
  );
}

export default Login;
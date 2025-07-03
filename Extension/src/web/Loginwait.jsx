// Login.js
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = setInterval(() => {
      const email = localStorage.getItem('securityEmail');
      const token = localStorage.getItem('authToken');
      
      if (email && token) navigate('/');
    }, 2000);

    return () => clearInterval(checkAuth);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse">
          <div className="text-cyan-400 text-4xl mb-4 animate-spin">⌛</div>
          <h1 className="text-green-400 text-2xl font-mono">Waiting for extension authentication...</h1>
          <p className="text-gray-400 mt-4">Please authenticate through the browser extension</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
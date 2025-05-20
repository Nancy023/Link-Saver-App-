// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AddBookmark from './pages/AddBookmark';

const API_BASE_URL = 'http://localhost:5000/api'; // Our backend API base URL

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate(); // This hook can only be used inside Router

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    navigate('/login'); // Redirect to login after logout
  };

  return (
    <>
      <nav>
        <div className="nav-links">
          <Link to="/">Home</Link>
          {isLoggedIn && <Link to="/add">Add Link</Link>}
        </div>
        <div className="auth-buttons">
          {isLoggedIn ? (
            <button onClick={handleLogout} className="button">Logout</button>
          ) : (
            <>
              <Link to="/login" className="button" style={{ marginRight: '10px' }}>Login</Link>
              <Link to="/signup" className="button">Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      <div className="container">
        <Routes>
          <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} API_BASE_URL={API_BASE_URL} />} />
          <Route path="/signup" element={<Signup API_BASE_URL={API_BASE_URL} />} />
          <Route path="/" element={isLoggedIn ? <Dashboard API_BASE_URL={API_BASE_URL} /> : <Login setIsLoggedIn={setIsLoggedIn} API_BASE_URL={API_BASE_URL} />} />
          <Route path="/add" element={isLoggedIn ? <AddBookmark API_BASE_URL={API_BASE_URL} /> : <Login setIsLoggedIn={setIsLoggedIn} API_BASE_URL={API_BASE_URL} />} />
        </Routes>
      </div>
    </>
  );
}

// Wrapper to use useNavigate outside the direct <Routes> context
// This component ensures App has access to Router context
function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;
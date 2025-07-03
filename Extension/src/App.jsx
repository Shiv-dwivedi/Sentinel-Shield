import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage"; // Extension homepage
import LoginPopup from "./popup/LoginPopup"; // Extension login popup
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isExtension, setIsExtension] = useState(false);

  useEffect(() => {
    // Check if running inside a Chrome extension
    setIsExtension(!!chrome.runtime?.id);

    // Check authentication status
    if (localStorage.getItem("token")) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <Router>
      {!isAuthenticated ? (
        <LoginPopup onLoginSuccess={() => setIsAuthenticated(true)} />
      ) : (
        <Routes>
          {/* Default route for extension */}
          <Route path="/" element={<HomePage />} />
          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;

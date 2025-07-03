import React, { useState, useEffect } from "react";
import axios from "axios";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import "./Popup.css";
import HomePage from "../pages/HomePage"; // Import the HomePage component

const Popup = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [fingerprint, setFingerprint] = useState(""); // Fingerprint state
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [message, setMessage] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Generate or fetch the device fingerprint using FingerprintJS and store it in chrome.storage.local
  useEffect(() => {
    const generateFingerprint = async () => {
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.get(["deviceFingerprint"], async (result) => {
          let deviceFingerprint = result.deviceFingerprint;
          if (!deviceFingerprint) {
            // Load FingerprintJS and generate a fingerprint
            const fp = await FingerprintJS.load();
            const fpResult = await fp.get();
            deviceFingerprint = fpResult.visitorId; // This is the unique fingerprint
            chrome.storage.local.set({ deviceFingerprint });
            console.log("Generated and saved fingerprint:", deviceFingerprint);
          } else {
            console.log("Fetched existing fingerprint:", deviceFingerprint);
          }
          setFingerprint(deviceFingerprint);
        });
      }
    };

    generateFingerprint();
  }, []);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      let token, storedEmail;
  
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.get(["token", "email"], (result) => {
          if (result.token) {
            token = result.token;
            storedEmail = result.email;
          }
  
          // If token is not in Chrome storage, check localStorage (website login)
          if (!token) {
            token = localStorage.getItem("authToken");
            storedEmail = localStorage.getItem("userEmail");
          }
  
          if (token) {
            setEmail(storedEmail || "");
            setIsVerified(true);
          }
        });
      }
    };
    checkAuth();
  }, []);
  
  const requestOtp = async () => {
    setIsLoading(true);
    try {
      await axios.post("https://integral-addia-shivdwivedi-f1a17698.koyeb.app/request-otp", { email });
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.set({ pendingEmail: email });
      }
      setShowOtpInput(true);
      setMessage("OTP sent to your email! Check your inbox.");
    } catch (error) {
      setMessage(error.response?.data?.error || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post("https://integral-addia-shivdwivedi-f1a17698.koyeb.app/verify-otp", { email, otp });
      const token = res.data.token;
  
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.set({ token, email }, () => {
          console.log("Stored in chrome.storage:", { token, email });
        });
      }
  
      // Sync with localStorage for website login
      localStorage.setItem("authToken", token);
      localStorage.setItem("userEmail", email);
  
      // Notify content script to update session on web pages
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage({ action: "syncToken", token, email });
      }
      
      // Send email, token, and fingerprint to backend for device session saving
      await axios.post("https://integral-addia-shivdwivedi-f1a17698.koyeb.app/save-session", {
        email,
        token,
        fingerprint,
      });
  
      setIsVerified(true);
      setMessage("Verification successful!");
      setShowOtpInput(false);
      setOtp("");
    } catch (error) {
      setMessage(error.response?.data?.error || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      // Send email and fingerprint to backend for removal of session
      // const res = await axios.post("https://integral-addia-shivdwivedi-f1a17698.koyeb.app/remove-session", {
      //   email,
      //   fingerprint,
      // });
  
      // if (res.data.success) {
        if (typeof chrome !== "undefined" && chrome.storage) {
          chrome.storage.local.remove(["token", "email"], () => {
            console.log("Logged out from extension storage");
          });
        // }
  
        // Also clear localStorage for website logout
        localStorage.removeItem("authToken");
        localStorage.removeItem("userEmail");
  
        setIsVerified(false);
        setEmail("");
        setOtp("");
        setShowOtpInput(false);
        setMessage("");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  
  const toggleAuthMode = () => {
    setShowOtpInput(!showOtpInput);
    setMessage("");
    setOtp("");
  };

  // If user is verified, show the home page inside the popup
  if (isVerified) {
    return <HomePage email={email} onLogout={handleLogout} />;
  }

  return (
    <div className="popup-container">
      <div className="auth-header">
        <h2>{showOtpInput ? "Verify OTP" : "Secure Login"}</h2>
        <p className="auth-subtext">
          {showOtpInput ? "Enter the 6-digit code sent to your email" : "Enter your email to get started"}
        </p>
      </div>

      <div className="input-group">
        {!showOtpInput ? (
          <>
            <input
              type="email"
              className="email-input"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <button 
              className={`primary-button ${isLoading ? "loading" : ""}`}
              onClick={requestOtp}
              disabled={!email.includes("@") || isLoading}
            >
              {isLoading ? "Sending..." : "Send OTP"}
            </button>
          </>
        ) : (
          <>
            <input
              type="email"
              className="email-input"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              className="otp-input"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              maxLength="6"
              autoFocus
            />
            <button 
              className={`primary-button ${isLoading ? "loading" : ""}`}
              onClick={verifyOtp}
              disabled={otp.length < 6 || isLoading}
            >
              {isLoading ? "Verifying..." : "Verify Code"}
            </button>
            <button className="resend-link" onClick={requestOtp} disabled={isLoading}>
              Resend OTP
            </button>
          </>
        )}
      </div>

      <div className="auth-footer">
        <button className="toggle-auth-mode" onClick={toggleAuthMode} disabled={isLoading}>
          {showOtpInput ? "← Use different email" : "Already have a code?"}
        </button>
      </div>

      {message && <div className={`message ${message.includes("success") ? "success" : "error"}`}>{message}</div>}
    </div>
  );
};

export default Popup;

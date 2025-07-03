import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import axios from "axios";
import "./LoginPage.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) navigate("/"); // Redirect if already logged in
  }, [navigate]);

  const generateFingerprint = async () => {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  };

  const handleSendOtp = async () => {
    setIsLoading(true);
    try {
      await axios.post("http://localhost:5000/request-otp", { email });
      setMessage("OTP sent to your email! Check your inbox.");
      setShowOtpInput(true);
    } catch (error) {
      setMessage(error.response?.data?.error || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.post("http://localhost:5000/verify-otp", { email, otp });
      const token = data.token;

      const fingerprint = await generateFingerprint();
      await axios.post("http://localhost:5000/save-session", { email, token, fingerprint });

      localStorage.setItem("authToken", token);
      localStorage.setItem("userEmail", email);

      setMessage("Verification successful!");
      navigate("/"); // Redirect to home page after verification
    } catch (error) {
      setMessage(error.response?.data?.error || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>{showOtpInput ? "Verify OTP" : "Secure Login"}</h2>
        <p>{showOtpInput ? "Enter the 6-digit OTP sent to your email" : "Enter your email to get started"}</p>

        {!showOtpInput ? (
          <>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={handleSendOtp} disabled={!email || isLoading}>
              {isLoading ? "Sending..." : "Send OTP"}
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength="6"
            />
            <button onClick={handleVerifyOtp} disabled={otp.length < 6 || isLoading}>
              {isLoading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

        <p className="message">{message}</p>
      </div>
    </div>
  );
};

export default LoginPage;

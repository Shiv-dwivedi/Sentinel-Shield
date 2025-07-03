import React, { useState, useEffect } from "react";
import { Box, Typography, Switch, Button, Card, CircularProgress } from "@mui/material";
import CryptoJS from "crypto-js";
import "./Pages.css"

const SECRET_KEY = "your_secret_key";

const HomePage = ({ email, onLogout }) => {
  const [score, setScore] = useState(0);
  const [settings, setSettings] = useState({
    liveWebsiteInspect: false,
    liveEmail: false,
    liveQRCheck: false,
  });

  useEffect(() => {
    const handleAuthChange = (changes, area) => {
      if (area === "local" && (changes.token || changes.email)) {
        // If token or email is removed, log out
        if (!changes.token?.newValue && !localStorage.getItem("authToken")) {
          setIsVerified(false);
        }
      }
    };
  
    chrome.storage.onChanged.addListener(handleAuthChange);
    return () => chrome.storage.onChanged.removeListener(handleAuthChange);
  }, []);
  

  // Load settings when the component mounts
  useEffect(() => {
    
    if (chrome?.storage) {
      chrome.storage.local.get(["liveWebsiteInspect", "liveEmail","livePassword", "liveQRCheck"], (result) => {
        setSettings((prev) => ({
          ...prev,
          liveWebsiteInspect: result.liveWebsiteInspect ?? false,
          liveEmail: result.liveEmail ?? false,
          livePassword: result.livePassword ?? false,
          liveQRCheck: result.liveQRCheck ?? false,
        }));
      });

      // Listen for changes in storage and update state
      const handleStorageChange = (changes) => {
        setSettings((prev) => {
          const updatedSettings = { ...prev };
          Object.keys(changes).forEach((key) => {
            if (key in updatedSettings) {
              updatedSettings[key] = changes[key].newValue;
            }
          });
          return updatedSettings;
        });
      };      

      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  // Handle toggle change
  const handleToggle = (key) => {
    const newValue = !settings[key];
  
    if (chrome?.storage) {
      chrome.storage.local.set({ [key]: newValue }, () => {
        setSettings((prev) => ({ ...prev, [key]: newValue }));
      });
    }
  };
  
  useEffect(() => {
    fetch(`https://integral-addia-shivdwivedi-f1a17698.koyeb.app/api/overall-score/${email}`)
      .then((res) => res.json())
      .then((data) => setScore(data.score ?? 0))
      .catch((error) => {
        console.error("Failed to fetch score:", error);
        setScore(0);
      });
  }, [email]);
  

  const handleCardClick = () => {
    chrome.storage.local.get(["email"], (result) => {
      if (result.email) {
        // Encrypt the email
        const encryptedEmail = CryptoJS.AES.encrypt(result.email, SECRET_KEY).toString();
  
        // Encode it to be URL safe
        const encodedEmail = encodeURIComponent(encryptedEmail);
  
        // Open the dashboard with the encrypted email
        chrome.tabs.create({ url: `https://extension-frontend.vercel.app/dashboard?data=${encodedEmail}` });
      }
    });
  };

  return (
    <Box sx={{ width: 300, p: 3, bgcolor: "#121212", color: "#fff", borderRadius: 2 }}>
      {/* Profile Section */}
      <Card sx={{ bgcolor: "#1E1E1E", mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, cursor: "pointer" }} onClick={handleCardClick}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>Welcome</Typography>
          <Typography variant="body2" color="gray">{email}</Typography>
        </Box>
        <Box position="relative" display="inline-flex">
          <CircularProgress variant="determinate" value={score} size={50} thickness={5} sx={{ color: score > 70 ? "#4caf50" : score > 40 ? "#ff9800" : "#f44336" }} />
          <Box
            top={0}
            left={0}
            bottom={0}
            right={0}
            position="absolute"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Typography variant="caption" color="white">{score}%</Typography>
          </Box>
        </Box>
      </Card>

      {/* Toggle Settings */}
      <Box>
        {[
          { key: "liveWebsiteInspect", label: "Live Website Inspect" },
          { key: "liveEmail", label: "Live Email" },
          { key: "livePassword", label: "Live Password" },
          { key: "liveQRCheck", label: "Live QR Check" },
        ].map(({ key, label }) => (
          <Box key={key} display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography>{label}</Typography>
            <Switch
              checked={settings[key]}
              onChange={() => handleToggle(key)}
              color="primary"
            />
          </Box>
        ))}
      </Box>

      {/* Open Website Button */}
      <Button
        fullWidth
        variant="contained"
        sx={{ mt: 2, bgcolor: "#1976d2", color: "white" }}
        onClick={() => chrome.tabs.create({ url: "https://extension-frontend.vercel.app/scam" })}
      >
        Scam Check
      </Button>
      <Button
        fullWidth
        variant="contained"
        sx={{ mt: 2, bgcolor: "#1976d2", color: "white" }}
        onClick={() => chrome.tabs.create({ url: "https://extension-frontend.vercel.app/updates" })}
      >
        Updates
      </Button>
      <Button
        fullWidth
        variant="contained"
        sx={{ mt: 2, bgcolor: "#1976d2", color: "white" }}
        onClick={() => chrome.tabs.create({ url: "https://extension-frontend.vercel.app/Help" })}
      >
        Help
      </Button>

      {/* Logout Button */}
      <Button
        fullWidth
        variant="contained"
        sx={{ mt: 2, bgcolor: "#d32f2f", color: "white" }}
        onClick={onLogout}
      >
        Logout
      </Button>
    </Box>
  );
};

export default HomePage;

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  TextField,
  MenuItem,
  Box,
  Avatar,
  Container,
} from "@mui/material";
import { motion } from "framer-motion";
import { FiShield, FiClock } from "react-icons/fi";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const SecurityChecker = () => {
  const [activeCheck, setActiveCheck] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [checkType, setCheckType] = useState("email");
  const [loginMessage, setLoginMessage] = useState(""); // For session check warning
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const email = localStorage.getItem("userEmail");

    // Redirect to login page if session data is missing
    if (!token || !email) {
      setLoginMessage("Session not found. Please log in to continue.");
      setTimeout(() => navigate("/login"), 3000); // Redirect after 3 seconds
      return;
    }

    const checkSessionFingerprint = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      console.log("Fingerprint:", result.visitorId); // Optionally log visitor ID to verify session
    };

    checkSessionFingerprint();
  }, [navigate]);

  const handleCheck = () => {
    navigate(`/${activeCheck}-results`, { state: { inputValue, checkType } });
  };

  const renderInput = () => {
    if (!activeCheck) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120 }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            mt: 4,
            background: "rgba(255, 255, 255, 0.1)",
            padding: "2.5rem",
            borderRadius: "16px",
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            width: "100%",
            maxWidth: "800px",
          }}
        >
          {activeCheck === "breach" && (
            <>
              <TextField
                label={`Enter ${checkType}`}
                variant="outlined"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                sx={{ width: "100%" }}
              />
              <TextField
                select
                value={checkType}
                onChange={(e) => setCheckType(e.target.value)}
                variant="outlined"
                sx={{ width: "50%" }}
              >
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="password">Password</MenuItem>
              </TextField>
            </>
          )}
          {activeCheck === "website" && (
            <TextField
              label="Enter Website URL"
              variant="outlined"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              sx={{ width: "100%" }}
            />
          )}
          {activeCheck === "scam" && (
            <TextField
              label="Analyze Scam Message"
              multiline
              rows={5}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              sx={{ width: "100%" }}
            />
          )}
          <Button
            variant="contained"
            onClick={handleCheck}
            sx={{
              mt: 2,
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              color: "white",
              fontWeight: "bold",
              borderRadius: "12px",
              padding: "12px 32px",
              textTransform: "none",
              fontSize: "1rem",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)",
              },
              transition: "all 0.2s ease",
            }}
          >
            Analyze Security
          </Button>
        </Box>
      </motion.div>
    );
  };

  const handleNavigation = () => {
    navigate("/breach-history");
  };

  return (
    <Box sx={{ background: "#f8fafc", minHeight: "100vh" }}>
      <AppBar position="static" sx={{ background: "#1e1b4b" }}>
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: "800", color: "white" }}>
            ShieldScan
          </Typography>
          <Button onClick={() => setActiveCheck("breach")} sx={{ color: "white" }}>
            Breach Check
          </Button>
          <Button onClick={() => setActiveCheck("website")} sx={{ color: "white" }}>
            Website Check
          </Button>
          <Button onClick={() => setActiveCheck("scam")} sx={{ color: "white" }}>
            Scam Check
          </Button>
          <Button sx={{ color: "white" }} onClick={handleNavigation}>
            <FiClock style={{ marginRight: 8 }} /> History
          </Button>
          <Avatar sx={{ ml: 2, bgcolor: "#6366f1" }}>
            <FiShield color="white" />
          </Avatar>
        </Toolbar>
      </AppBar>

      {/* Banner for login prompt if session not found */}
      {loginMessage && (
        <Box
          sx={{
            background: "#ffebee",
            color: "#c62828",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          {loginMessage}
        </Box>
      )}

      <Container
        sx={{
          display: "flex",
          justifyContent: "center",
          padding: "4rem 2rem",
          maxWidth: 1600,
        }}
      >
        {renderInput()}
      </Container>
    </Box>
  );
};

export default SecurityChecker;

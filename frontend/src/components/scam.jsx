import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography, Button, CircularProgress, Modal, Alert } from "@mui/material";
import { FiHome } from "react-icons/fi";

const Scam = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { inputValue } = location.state || { inputValue: "" };
  const [loading, setLoading] = useState(true);
  const [aiResponse, setAiResponse] = useState({ message: "", confidence: 0 });
  const [error, setError] = useState("");
  const [open, setOpen] = useState(true);

  const fetchAIAnalysis = async (input) => {
    if (!input) {
      setLoading(false);
      setError("No input provided");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputValue: input }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAiResponse({
        message: data.message,
        confidence: Math.min(Math.max(data.confidence, 0), 100)
      });
      setError("");
    } catch (error) {
      console.error("Error analyzing input:", error);
      setError("Failed to analyze input. Please try again.");
      setAiResponse({ message: "", confidence: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inputValue) {
      fetchAIAnalysis(inputValue);
    }
  }, [inputValue]);

  return (
    <Box sx={{ minHeight: "100vh", background: "#f8fafc", padding: "2rem" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 2rem", 
                background: "#1e1b4b", borderRadius: "12px", color: "white" }}>
        <Typography variant="h5" fontWeight="bold">Security Report</Typography>
        <Button variant="contained" onClick={() => navigate("/")} sx={{ background: "#6366f1", textTransform: "none" }}>
          <FiHome style={{ marginRight: "8px" }} /> Home
        </Button>
      </Box>

      <Modal open={open} onClose={() => setOpen(false)}>
        <Box sx={{ 
          position: "absolute", 
          top: "50%", 
          left: "50%", 
          transform: "translate(-50%, -50%)", 
          bgcolor: "background.paper", 
          borderRadius: "12px", 
          boxShadow: 24, 
          p: 4, 
          minWidth: 400, 
          maxWidth: "90%",
          textAlign: "center" 
        }}>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          ) : loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>Analyzing potential scam...</Typography>
            </Box>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>Security Analysis</Typography>
              <Box sx={{ 
                maxHeight: '400px', 
                overflowY: 'auto', 
                mb: 2,
                p: 2,
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                textAlign: 'left'
              }}>
                {aiResponse.message.split('\n').map((line, index) => (
                  <Typography key={index} variant="body1" sx={{ mb: 1 }}>{line}</Typography>
                ))}
              </Box>
              
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Threat Confidence: {aiResponse.confidence}%
              </Typography>
              
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <CircularProgress 
                  variant="determinate" 
                  value={aiResponse.confidence} 
                  size={100} 
                  thickness={5}
                  sx={{ 
                    color: aiResponse.confidence > 75 ? 'error.main' : 
                          aiResponse.confidence > 40 ? 'warning.main' : 'success.main'
                  }}
                />
                <Box sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}>
                  <Typography variant="h6">{aiResponse.confidence}%</Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={() => setOpen(false)}
                  sx={{ background: "#6366f1" }}
                >
                  Close
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/')}
                  sx={{ borderColor: "#6366f1", color: "#6366f1" }}
                >
                  New Analysis
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default Scam;
import React, { useState } from "react";
import {
  TextField,
  Button,
  Container,
  Typography,
  Box,
  Modal,
  CircularProgress,
  Alert,
} from "@mui/material";
import { FiSearch } from "react-icons/fi";

const VIRUSTOTAL_API_KEY = "VIRUSTOTAL_API_KEY"; // Replace with your actual VirusTotal API key

const checkWithVirusTotal = async (domain) => {
  try {
    const response = await fetch(`https://www.virustotal.com/api/v3/domains/${domain}`, {
      headers: { "x-apikey": VIRUSTOTAL_API_KEY },
    });
    const data = await response.json();
    const stats = data.data?.attributes?.last_analysis_stats || {};

    return {
      malicious: (stats.malicious || 0) + (stats.suspicious || 0) > 3,
      source: stats.malicious ? `VirusTotal (${stats.malicious} detections)` : null,
      total_sources: Object.keys(data.data?.attributes?.last_analysis_results || {}).length,
    };
  } catch (error) {
    console.error("❌ VirusTotal API Error:", error);
    return { malicious: false };
  }
};

const ScamDetection = () => {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState({ message: "", confidence: 0 });
  const [vtResult, setVtResult] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const fetchAIAnalysis = async (input) => {
    if (!input) {
      setError("No input provided for analysis");
      return;
    }
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
        confidence: Math.min(Math.max(data.confidence, 0), 100),
      });
    } catch (error) {
      console.error("Error analyzing input:", error);
      setError("Failed to analyze input. Please try again.");
      setAiResponse({ message: "", confidence: 0 });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setError("");
    setAiResponse({ message: "", confidence: 0 });
    setVtResult(null);
    setLoading(true);
    setOpen(true);

    // Extract domain if input is a URL
    const domainMatch = inputValue.match(/https?:\/\/(www\.)?([^/]+)/);
    const domain = domainMatch ? domainMatch[2] : null;

    // Fire off both API calls concurrently
    const aiPromise = fetchAIAnalysis(inputValue);
    const vtPromise = domain ? checkWithVirusTotal(domain) : Promise.resolve(null);

    // Wait for both to complete
    const [_, vtData] = await Promise.all([aiPromise, vtPromise]);

    if (vtData) {
      setVtResult(vtData);
    }
    setLoading(false);
  };

  return (
    <Container maxWidth="sm" sx={{ textAlign: "center", mt: 5 }}>
      <Typography variant="h4" fontWeight="bold" color="#1e1b4b" gutterBottom>
        Scam Detection by <span style={{ color: "#6366f1" }}>Secure Buddy</span>
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          label="Enter Email, Website, or Message"
          variant="outlined"
          fullWidth
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <Button
          type="submit"
          variant="contained"
          sx={{ bgcolor: "#6366f1", color: "white", "&:hover": { bgcolor: "#4f46e5" } }}
          startIcon={<FiSearch />}
        >
          Analyze for Scam
        </Button>
      </Box>

      <Modal open={open} onClose={() => setOpen(false)}>
        <Box
          sx={{
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
            textAlign: "center",
          }}
        >
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Analyzing input...
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                AI Security Analysis
              </Typography>
              <Box
                sx={{
                  maxHeight: "200px",
                  overflowY: "auto",
                  mb: 2,
                  p: 2,
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  textAlign: "left",
                }}
              >
                {aiResponse.message.split("\n").map((line, index) => (
                  <Typography key={index} variant="body1" sx={{ mb: 1 }}>
                    {line}
                  </Typography>
                ))}
              </Box>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Threat Confidence: {aiResponse.confidence}%
              </Typography>

              {vtResult && (
                <>
                  <Typography variant="h6" gutterBottom>
                    VirusTotal Analysis
                  </Typography>
                  <Box
                    sx={{
                      mb: 2,
                      p: 2,
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      textAlign: "left",
                    }}
                  >
                    <Typography variant="body1">
                      Malicious: {vtResult.malicious ? "Yes" : "No"}
                    </Typography>
                    {vtResult.source && (
                      <Typography variant="body1">Source: {vtResult.source}</Typography>
                    )}
                    <Typography variant="body1">
                      Total Sources Checked: {vtResult.total_sources}
                    </Typography>
                  </Box>
                </>
              )}

              <Button variant="contained" onClick={() => setOpen(false)} sx={{ background: "#6366f1" }}>
                Close
              </Button>
            </>
          )}
        </Box>
      </Modal>
    </Container>
  );
};

export default ScamDetection;

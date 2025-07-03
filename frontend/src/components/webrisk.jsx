import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography, Button, CircularProgress, Link } from "@mui/material";
import { FiHome, FiExternalLink } from "react-icons/fi";

const WebsiteSafetyCheck = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { inputValue } = location.state || { inputValue: "" };
  const [loading, setLoading] = useState(true);
  const [safetyData, setSafetyData] = useState(null);
  const [riskScore, setRiskScore] = useState(0);

  const fetchWebsiteData = async (inputValue) => {
    if (!inputValue) return;
    setLoading(true);

    try {
      const hostname = new URL(inputValue).hostname || inputValue;
      const vtResponse = await fetch(`https://www.virustotal.com/api/v3/domains/${hostname}`, {
        method: "GET",
        headers: { "x-apikey": "" },
      });
      const vtData = await vtResponse.json();
      const vtScore = vtData?.data?.attributes?.last_analysis_stats?.malicious || 0;
      console.log(vtData);

      const xonResponse = await fetch(`https://api.xposedornot.com/v1/domain-analytics?domain=${hostname}`);
      const xonData = await xonResponse.json();
      const xonRisk = xonData?.DomainRiskScore || 0;


      const finalRisk = Math.min((vtScore * 10) + xonRisk, 100);
      setRiskScore(finalRisk);
      setSafetyData({ vtData, xonData, finalRisk });
    } catch (error) {
      console.error("Error fetching website safety data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inputValue) fetchWebsiteData(inputValue);
  }, [inputValue]);

  return (
    <Box sx={{ minHeight: "100vh", background: "#f8fafc", padding: "2rem" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 2rem", background: "#1e1b4b", borderRadius: "12px", color: "white" }}>
        <Typography variant="h5" fontWeight="bold">Security Report</Typography>
        <Button variant="contained" onClick={() => navigate("/")} sx={{ background: "#6366f1", color: "white", textTransform: "none" }}>
          <FiHome style={{ marginRight: "8px" }} /> Home
        </Button>
      </Box>

      <Box sx={{ marginTop: "2rem", padding: "2rem", background: "white", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxWidth: "800px", marginX: "auto" }}>
        {loading ? (
          <CircularProgress />
        ) : safetyData ? (
          <>
            <Typography variant="h6">Input Checked: {inputValue || "N/A"}</Typography>
            <Box sx={{ position: "relative", marginTop: "2rem" }}>
              <CircularProgress variant="determinate" value={riskScore} size={120} thickness={5} sx={{ color: riskScore > 50 ? "red" : riskScore > 20 ? "orange" : "green" }} />
              <Typography variant="h6" sx={{ position: "absolute", top: "35%", left: "50%", transform: "translate(-50%, -50%)" }}>
                {riskScore}%
              </Typography>
            </Box>
            <Typography variant="h6" color={riskScore > 50 ? "error" : "primary"}>
              {riskScore > 50 ? "⚠️ High Risk! Avoid this." : riskScore > 20 ? "⚠️ Moderate Risk! Be cautious." : "✅ Safe! No major threats detected."}
            </Typography>
            <Link href={`https://www.virustotal.com/gui/domain/${inputValue}`} target="_blank" rel="noopener noreferrer" sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              View Details on VirusTotal <FiExternalLink />
            </Link>
          </>
        ) : (
          <Typography variant="h6" color="red">Error fetching data</Typography>
        )}
      </Box>
    </Box>
  );
};

export default WebsiteSafetyCheck;

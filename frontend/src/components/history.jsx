import React, { useEffect, useState } from "react";
import axios from "axios";
import { useMediaQuery } from "@mui/material";
import { Box, Typography, Button, CircularProgress, Link } from "@mui/material";
import { FiHome } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const BreachHistoryTimeline = () => {
  const [breachData, setBreachData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBreachData = async () => {
      try {
        const response = await axios.get("https://api.xposedornot.com/v1/breaches");
        const sortedData = response.data.exposedBreaches
          ? response.data.exposedBreaches.sort(
              (a, b) => new Date(b.breachedDate) - new Date(a.breachedDate)
            )
          : [];
        setBreachData(sortedData);
      } catch (err) {
        console.error("Failed to fetch breach data:", err);
        setError("Failed to load breach history. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchBreachData();
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", background: "#f8fafc", padding: "2rem" }}>
      {/* Header */}

      

      <Typography
        variant="h4"
        align="center"
        sx={{ marginBottom: "2rem", fontWeight: 600, color: "#1e3a8a" }}
      >
        Breach Records Timeline
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography variant="body1" color="error">{error}</Typography>
      ) : (
        <Box
          sx={{
            position: "relative",
            padding: "2rem 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            "&::before": {
              content: '""',
              position: "absolute",
              height: "100%",
              width: "4px",
              background: "linear-gradient(180deg, #1e3a8a, #2563eb)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1,
            },
          }}
        >
          {breachData.map((breach, index) => (
            <Box
              key={breach.breachID}
              sx={{
                display: "flex",
                justifyContent: isMobile
                  ? "center"
                  : index % 2 === 0
                  ? "flex-end"
                  : "flex-start",
                alignItems: "center",
                position: "relative",
                margin: "2rem 0",
                width: "100%",
              }}
            >
              {/* Card Container */}
              <Box
                sx={{
                  position: "relative",
                  width: isMobile ? "90%" : "45%",
                  background: "linear-gradient(135deg, #eff6ff, #93c5fd)",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                  zIndex: 2,
                  textAlign: "left",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <img
                    src={breach.logo}
                    alt={`${breach.breachID} logo`}
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      border: "2px solid #1e40af",
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e3a8a" }}>
                    {breach.breachID}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: "#4b5563", marginBottom: "0.3rem" }}>
                  <strong>Domain:</strong> {breach.domain}
                </Typography>
                <Typography variant="body2" sx={{ color: "#4b5563", marginBottom: "0.3rem" }}>
                  <strong>Breached Date:</strong> {new Date(breach.breachedDate).toDateString()}
                </Typography>
                <Typography variant="body2" sx={{ color: "#1e40af", fontWeight: 600 }}>
                  <strong>Records Exposed:</strong> {breach.exposedRecords.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ color: "#4b5563" }}>
                  <strong>Industry:</strong> {breach.industry}
                </Typography>
                <Typography variant="body2" sx={{ color: "#4b5563" }}>
                  <strong>Password Risk:</strong> {breach.passwordRisk}
                </Typography>
                <Typography variant="body2" sx={{ color: "#4b5563" }}>
                  <strong>Verified:</strong> {breach.verified ? "Yes" : "No"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#4b5563" }}>
                  <strong>Searchable:</strong> {breach.searchable ? "Yes" : "No"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#4b5563", marginBottom: "0.3rem" }}>
                  <strong>Exposed Data:</strong> {breach.exposedData?.join(", ") || "N/A"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#111827" }}>
                  <strong>Description:</strong> {breach.exposureDescription}
                </Typography>
                {breach.referenceURL && (
                  <Typography variant="body2" sx={{ marginTop: "8px" }}>
                    <strong>Reference:</strong>{" "}
                    <Link href={breach.referenceURL} target="_blank" rel="noopener" sx={{ color: "#1e3a8a" }}>
                      {breach.referenceURL}
                    </Link>
                  </Typography>
                )}
              </Box>

              {/* Timeline Dot */}
              <Box
                sx={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: "#1e40af",
                  border: "4px solid #3b82f6",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  zIndex: 3,
                }}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default BreachHistoryTimeline;

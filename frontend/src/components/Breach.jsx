import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Typography, Button, CircularProgress, Avatar, Link } from "@mui/material";
import { FiHome, FiAlertTriangle, FiExternalLink, FiLock } from "react-icons/fi";
import { keccak_512 } from "js-sha3";


const BreachResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { inputValue, checkType  } = location.state || {}; // Getting value & type (email or password)
  const [breachData, setBreachData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riskScore, setRiskScore] = useState(0);
  const [passwordBreachCount, setPasswordBreachCount] = useState(null);

  useEffect(() => {
    if (!inputValue || checkType !== "email") return; // Run only if type is "email"

    const sendBreachData = async () => {
        const storedEmail = localStorage.getItem("userEmail"); // Get stored user email

        if (!storedEmail) {
            console.warn("No stored email found in localStorage.");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/store-breach", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  storedEmail: storedEmail, // Logged-in user email
                  breachEmail: inputValue, // Breached email being checked
                }),
            });

            const result = await response.json();
            console.log("Breach data sent successfully:", result);
        } catch (error) {
            console.error("Error sending breach data:", error);
        }
    };

    sendBreachData();
}, [inputValue, checkType]); // Runs when inputValue or checkType changes


  useEffect(() => {
    if (!inputValue || !checkType ) return;

    const fetchBreachData = async () => {
        console.log("Fetching breach data for:", inputValue, checkType );
      try {
        setLoading(true);

        if (checkType  === "email") {
          // Fetch breach details for an email
          const response = await fetch(`https://api.xposedornot.com/v1/breach-analytics?email=${inputValue}`);
          const data = await response.json();
          setBreachData(data);

          // Extract risk score
          const risk = data.BreachMetrics?.risk[0]?.risk_score || 0;
          setRiskScore(risk * 10); // Scale to 0-100
        } else if (checkType === "password") {
            // Hash password using SHA3-Keccak-512
            const fullHash = keccak_512(inputValue);
            const hashedPassword = fullHash.slice(0, 10); // Use the first 10 characters
            console.log("Full Keccak-512 hash:", fullHash);
            console.log("Using first 10 chars:", hashedPassword);
          
            try {
              const response = await fetch(`https://passwords.xposedornot.com/api/v1/pass/anon/${hashedPassword}`);
              const data = await response.json();
              console.log("Password breach data:", data);
          
              // Extract breach details
              const breachCount = data.SearchPassAnon?.count || 0;
              const wordlistFlag = data.SearchPassAnon?.wordlist || 0; // Whether this password is in common wordlists
              const charDetails = data.SearchPassAnon?.char || ""; // Password structure analysis
          
              setPasswordBreachCount(breachCount);
              
              // Determine security status
              let securityStatus = "";
              let recommendation = "";
          
              if (breachCount > 0) {
                securityStatus = `⚠️ This password has been exposed **${breachCount.toLocaleString()}** times!`;
                recommendation = "🔹 **Change your password immediately.**\n🔹 Use a mix of uppercase, lowercase, numbers, and symbols.\n🔹 Avoid using common passwords or dictionary words.\n🔹 Consider using a **password manager** for generating strong passwords.";
                
                if (wordlistFlag) {
                  recommendation += "\n❗ **Warning:** This password is in a common wordlist and is extremely unsafe!";
                }
              } else {
                securityStatus = "✅ This password is **safe** and has not been found in any breaches!";
                recommendation = "🔹 Keep using unique and strong passwords.\n🔹 Never reuse passwords across multiple accounts.\n🔹 Consider enabling two-factor authentication (2FA).";
              }
          
              // Update state with the result
              setBreachData({
                breachCount,
                wordlistFlag,
                charDetails,
                securityStatus,
                recommendation
              });
          
            } catch (error) {
              console.error("Error fetching password breach data:", error);
            }
          }
          
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      };
    

    fetchBreachData();
  }, [inputValue, checkType ]);

  return (
    <Box sx={{ minHeight: "100vh", background: "#f8fafc", padding: "2rem" }}>
      {/* Header */}
      <Box sx={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "1rem 2rem", background: "#1e1b4b", borderRadius: "12px", color: "white"
      }}>
        <Typography variant="h5" fontWeight="bold">Breach Report</Typography>
        <Button variant="contained" onClick={() => navigate("/")} 
          sx={{ background: "#6366f1", color: "white", textTransform: "none" }}>
          <FiHome style={{ marginRight: "8px" }} /> Home
        </Button>
      </Box>

      {/* Content */}
      <Box sx={{
        display: "flex", flexDirection: "column", alignItems: "center",
        marginTop: "2rem", padding: "2rem", background: "white",
        borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxWidth: "800px", marginX: "auto"
      }}>
        {loading ? (
          <CircularProgress />
        ) : checkType  === "email" ? (
          breachData ? (
            <>
              <Typography variant="h6">Email: {inputValue}</Typography>

              {/* Risk Indicator */}
              <Box sx={{ position: "relative", marginTop: "2rem", marginBottom: "2rem" }}>
                <CircularProgress variant="determinate" value={riskScore} size={120} thickness={5} sx={{
                  color: riskScore > 50 ? "red" : riskScore > 20 ? "orange" : "green"
                }} />
                <Typography variant="h6" sx={{ position: "absolute", top: "35%", left: "50%", transform: "translate(-50%, -50%)" }}>
                  {riskScore}%
                </Typography>
              </Box>

              {/* Exposed Breaches */}
              {breachData.ExposedBreaches?.breaches_details?.length > 0 ? (
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" color="error">
                    <FiAlertTriangle style={{ marginRight: "8px" }} /> {breachData.ExposedBreaches.breaches_details.length} breaches found!
                  </Typography>
                  {breachData.ExposedBreaches.breaches_details.map((breach, index) => (
                    <Box key={index} sx={{
                      display: "flex", alignItems: "center", gap: 2,
                      background: "#f1f5f9", padding: "1rem", borderRadius: "8px", marginTop: "1rem"
                    }}>
                      <Avatar src={breach.logo} alt={breach.breach} sx={{ width: 50, height: 50 }} />
                      <Box>
                        <Typography fontWeight="bold">{breach.breach} ({breach.xposed_date})</Typography>
                        <Typography variant="body2">{breach.details}</Typography>
                        <Link href={breach.references} target="_blank" rel="noopener noreferrer" sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                          Read More <FiExternalLink />
                        </Link>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="h6" color="green">✅ No breaches found!</Typography>
              )}
            </>
          ) : (
            <Typography variant="h6" color="red">Error fetching email breach data</Typography>
          )
        ) : (
          // Password Breach Display
          passwordBreachCount !== null ? (
            <Box sx={{ textAlign: "center", marginTop: "2rem" }}>
              <Typography variant="h6" color={passwordBreachCount > 0 ? "red" : "green"}>
                <FiLock style={{ marginRight: "8px" }} /> 
                {passwordBreachCount > 0 
                  ? `⚠️ This password has been exposed ${passwordBreachCount} times!`
                  : "✅ This password is safe."}
              </Typography>
            </Box>
          ) : (
            <Typography variant="h6" color="red">Error fetching password breach data</Typography>
          )
        )}
      </Box>
    </Box>
  );
};

export default BreachResults;

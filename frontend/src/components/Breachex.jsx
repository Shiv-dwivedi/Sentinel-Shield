import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Avatar, 
  Link,
  Card,
  Chip,
  Stack,
  Alert,
  Divider,
  IconButton,
  Paper
} from "@mui/material";
import { 
  FiAlertTriangle, 
  FiExternalLink, 
  FiLock, 
  FiShield,
  FiArrowLeft,
  FiCheckCircle
} from "react-icons/fi";
import { keccak_512 } from "js-sha3";

const BreachCard = ({ breach }) => {
  const getSeverityColor = (count) => {
    if (count >= 8) return 'error.main';
    if (count >= 4) return 'warning.main';
    return 'success.main';
  };

  return (
    <Card
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        transition: 'transform 0.3s',
        '&:hover': {
          transform: 'scale(1.01)',
        },
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
        <Avatar
          src={breach.logo}
          alt={breach.breach}
          sx={{ width: 72, height: 72, border: '2px solid #ddd' }}
        />
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight={600}>
              {breach.breach}
            </Typography>
            <Chip
              label={breach.xposed_date}
              size="small"
              sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}
            />
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
            {breach.details}
          </Typography>

          {breach.leaked_data?.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              {breach.leaked_data.map((item, idx) => (
                <Chip
                  key={idx}
                  label={item}
                  color="error"
                  size="small"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          )}

          <Box sx={{ mt: 2 }}>
            <Link
              href={breach.references}
              target="_blank"
              underline="hover"
              sx={{ display: 'inline-flex', alignItems: 'center', fontWeight: 500 }}
            >
              Learn more <FiExternalLink style={{ marginLeft: 6 }} />
            </Link>
          </Box>
        </Box>

        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <Chip
            label="Breached"
            icon={<FiAlertTriangle size={18} />}
            color="error"
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </Stack>
    </Card>
  );
};

const PasswordStatus = ({ breachData }) => (
  <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
    <Stack spacing={2} alignItems="center">
      {breachData.breachCount > 0 ? (
        <>
          <FiLock size={48} color="#dc2626" />
          <Typography variant="h6" color="error">
            Exposed {breachData.breachCount} times
          </Typography>
        </>
      ) : (
        <>
          <FiCheckCircle size={48} color="#16a34a" />
          <Typography variant="h6" color="success.main">
            No exposures found
          </Typography>
        </>
      )}
    </Stack>
  </Paper>
);

const BreachResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [breachData, setBreachData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordBreachCount, setPasswordBreachCount] = useState(null);

  const queryParams = new URLSearchParams(location.search);
  const inputValue = queryParams.get("inputValue") || "";
  const checkType = queryParams.get("inputType") || "";

  useEffect(() => {
    if (!inputValue || !checkType) return;

    const fetchBreachData = async () => {
      try {
        setLoading(true);

        if (checkType === "email") {
          const response = await fetch(`https://api.xposedornot.com/v1/breach-analytics?email=${inputValue}`);
          const data = await response.json();
          setBreachData(data);
        } else if (checkType === "password") {
          const fullHash = keccak_512(inputValue);
          const hashedPassword = fullHash.slice(0, 10);
          const response = await fetch(`https://passwords.xposedornot.com/api/v1/pass/anon/${hashedPassword}`);
          const data = await response.json();

          const breachCount = data.SearchPassAnon?.count || 0;
          setPasswordBreachCount(breachCount);
          setBreachData({
            breachCount,
            recommendation: data.SearchPassAnon?.recommendation || ""
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBreachData();
  }, [inputValue, checkType]);

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      bgcolor: 'background.default',
      p: { xs: 2, md: 4 }
    }}>
      <Box sx={{ 
        maxWidth: 800, 
        mx: 'auto',
        position: 'relative'
      }}>

        {!loading && (
          <Typography variant="h5" align="center" gutterBottom sx={{ mb: 4 }}>
            {checkType === 'email' ? 'Email Security Report' : 'Password Safety Check'}
          </Typography>
        )}

        <Paper sx={{ 
          borderRadius: 3,
          boxShadow: 3,
          p: { xs: 2, md: 4 },
          bgcolor: 'background.paper'
        }}>
          {loading ? (
            <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={60} thickness={4} />
            </Box>
          ) : checkType === "email" ? (
            <>
              {breachData?.ExposedBreaches?.breaches_details?.length > 0 ? (
                <>
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {breachData.ExposedBreaches.breaches_details.length} breaches detected for:
                    <Typography component="span" fontWeight={700} sx={{ ml: 1 }}>
                      {inputValue}
                    </Typography>
                  </Alert>
                  {breachData.ExposedBreaches.breaches_details.map((breach, index) => (
                    <BreachCard key={index} breach={breach} />
                  ))}
                </>
              ) : (
                <Stack spacing={3} alignItems="center">
                  <FiShield size={64} color="#16a34a" />
                  <Typography variant="h6" color="success.main">
                    No security breaches found
                  </Typography>
                  <Typography color="text.secondary" align="center">
                    No exposures detected for {inputValue} in known data breaches
                  </Typography>
                </Stack>
              )}
            </>
          ) : (
            <Stack spacing={4}>
              <PasswordStatus breachData={breachData} />
              
              {breachData?.breachCount > 0 && (
                <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'error.light' }}>
                  <Typography variant="h6" gutterBottom>
                    Immediate Actions Required:
                  </Typography>
                  <Stack spacing={1}>
                    <Typography>• Change this password immediately</Typography>
                    <Typography>• Enable two-factor authentication</Typography>
                    <Typography>• Use a password manager</Typography>
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default BreachResults;
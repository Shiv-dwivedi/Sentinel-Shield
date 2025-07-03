import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  CircularProgress,
  Alert,
  Modal,
  Paper,
  Link,
  Container,
  Stack,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "90%", sm: 500 },
  maxHeight: "80vh",
  bgcolor: "background.paper",
  borderRadius: "16px",
  boxShadow: 24,
  p: 4,
  overflowY: "auto",
};

const LinkifyText = ({ text }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, index) =>
        urlRegex.test(part) ? (
          <Link
            href={part}
            key={index}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ wordBreak: "break-all", color: "primary.main" }}
          >
            {part}
          </Link>
        ) : (
          part
        )
      )}
    </>
  );
};

const TempMail = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const emailFromUrl = params.get("email")
    ? decodeURIComponent(params.get("email"))
    : "";

  const [email, setEmail] = useState(emailFromUrl || "");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Replace with your actual RapidAPI key
  const API_KEY = "";

  const fetchInbox = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const inboxUrl = `https://temp-mail44.p.rapidapi.com/api/v3/email/${email}/messages`;
      const response = await axios.get(inboxUrl, {
        headers: {
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": "temp-mail44.p.rapidapi.com",
        },
      });
      setMessages(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch inbox. Please try again later.");
      console.error("Error fetching inbox:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (email) {
      fetchInbox();
      const interval = setInterval(fetchInbox, 10000); // Fixed refresh interval (10 seconds)
      return () => clearInterval(interval);
    }
  }, [email]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f4ff, #ffffff)",
        py: 6,
        px: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="md">
        <Box textAlign="center" mb={4}>
          <Typography variant="h3" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
            Temporary Mailbox
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Disposable email address with real-time inbox updates
          </Typography>
        </Box>

        <Card sx={{ mb: 4, boxShadow: 3, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Your Temporary Email Address
            </Typography>
            {email ? (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="body1"
                  sx={{ wordBreak: "break-word", flex: 1, fontFamily: "monospace" }}
                >
                  {email}
                </Typography>
                <IconButton
                  onClick={() => copyToClipboard(email)}
                  color="primary"
                  sx={{
                    border: "1px solid #1976d2",
                    borderRadius: "50%",
                    height: 36,
                    width: 36,
                    p: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Stack>
            ) : (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <CircularProgress size={28} />
              </Box>
            )}
          </CardContent>
        </Card>

        <Box textAlign="center" mb={4}>
          <Button
            variant="contained"
            onClick={fetchInbox}
            disabled={loading}
            startIcon={<RefreshIcon />}
            size="large"
            sx={{
              borderRadius: 3,
              px: 4,
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { transform: "scale(1.02)" },
              transition: "transform 0.2s",
            }}
          >
            {loading ? "Refreshing..." : "Refresh Inbox"}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Card sx={{ boxShadow: 3, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Inbox ({messages.length})
            </Typography>
            {messages.length > 0 ? (
              messages.map((msg) => (
                <Card
                  key={msg.id}
                  sx={{
                    mb: 2,
                    cursor: "pointer",
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    transition: "all 0.2s",
                    "&:hover": {
                      transform: "translateX(4px)",
                      borderColor: "primary.main",
                    },
                  }}
                  onClick={() => setSelectedMessage(msg)}
                >
                  <CardContent sx={{ p: "0 !important" }}>
                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                      {msg.subject || "No Subject"}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" noWrap>
                      From: {msg.from}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(msg.created_at).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" color="textSecondary">
                  {loading ? "Loading messages..." : "Inbox is empty"}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>

      <Modal
        open={Boolean(selectedMessage)}
        onClose={() => setSelectedMessage(null)}
        BackdropProps={{ transitionDuration: 150 }}
      >
        <Paper sx={modalStyle}>
          {selectedMessage && (
            <>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {selectedMessage.subject}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                From: {selectedMessage.from}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Received: {new Date(selectedMessage.created_at).toLocaleString()}
              </Typography>
              <Paper
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "background.default",
                  borderRadius: 2,
                  maxHeight: "60vh",
                  overflowY: "auto",
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  <LinkifyText
                    text={
                      selectedMessage.body_text ||
                      "No text content available."
                    }
                  />
                </Typography>
              </Paper>
              <Stack
                direction="row"
                spacing={2}
                justifyContent="flex-end"
                sx={{ mt: 3 }}
              >
                <Button
                  variant="outlined"
                  onClick={() => setSelectedMessage(null)}
                  sx={{ borderRadius: 2 }}
                >
                  Close
                </Button>
                <Button
                  variant="contained"
                  onClick={() => copyToClipboard(selectedMessage.body_text)}
                  sx={{ borderRadius: 2 }}
                >
                  Copy Text
                </Button>
              </Stack>
            </>
          )}
        </Paper>
      </Modal>
    </Box>
  );
};

export default TempMail;
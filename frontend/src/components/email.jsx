import React, { useState, useEffect } from "react";
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
  Paper
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 500,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

const TempMail = () => {
  const [email, setEmail] = useState("");
  const [emailId, setEmailId] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const API_KEY = "68f6d76326msh607985ebb1e3938p125646jsn0b43c5160be3";
  
  // Generates a new email and saves it in localStorage with a timestamp
  const generateEmail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(
        "https://temp-mail44.p.rapidapi.com/api/v3/email/new",
        {},
        {
          headers: {
            "x-rapidapi-key": API_KEY,
            "x-rapidapi-host": "temp-mail44.p.rapidapi.com",
            "Content-Type": "application/json",
          },
        }
      );
      const newEmail = response.data.email;
      console.log("New Email Response:", response.data);
      setEmail(newEmail);
      setEmailId(newEmail.split("@")[0]);
      // Save email and timestamp to localStorage (using 10 minutes expiry as an example)
      localStorage.setItem("tempMailEmail", newEmail);
      localStorage.setItem("tempMailTimestamp", Date.now().toString());
    } catch (error) {
      setError("Failed to generate temporary email. Please try again.");
      console.error("Error generating email:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch inbox messages for the current email
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
      console.log("Inbox Response:", response.data);
      setMessages(response.data);
    } catch (error) {
      setError("Failed to fetch inbox. Please try again later.");
      console.error("Error fetching inbox:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check localStorage on mount and generate a new email if necessary
  useEffect(() => {
    const storedEmail = localStorage.getItem("tempMailEmail");
    const storedTimestamp = localStorage.getItem("tempMailTimestamp");
    if (storedEmail && storedTimestamp) {
      const age = Date.now() - parseInt(storedTimestamp, 10);
      // For example: if the email is less than 10 minutes old, use it
      if (age < 10 * 60 * 1000) {
        setEmail(storedEmail);
        setEmailId(storedEmail.split("@")[0]);
      } else {
        generateEmail();
      }
    } else {
      generateEmail();
    }
  }, []);

  // Auto-refresh inbox every 10 seconds if auto-refresh is enabled
  useEffect(() => {
    let interval;
    if (autoRefresh && email) {
      interval = setInterval(() => {
        fetchInbox();
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [email, autoRefresh]);

  // Copy text to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  // Format ISO time string to a more readable format
  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  // Handle message modal open/close
  const openMessageModal = (message) => {
    setSelectedMessage(message);
  };

  const closeMessageModal = () => {
    setSelectedMessage(null);
  };

  return (
    <Box sx={{ maxWidth: 700, mx: "auto", mt: 4, textAlign: "center" }}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h5">Temporary Email Service</Typography>
          {email ? (
            <Box display="flex" justifyContent="center" alignItems="center" sx={{ mt: 2 }}>
              <Typography variant="body1" sx={{ mr: 2 }}>{email}</Typography>
              <IconButton onClick={() => copyToClipboard(email)}>
                <ContentCopyIcon />
              </IconButton>
            </Box>
          ) : (
            <CircularProgress />
          )}
        </CardContent>
      </Card>

      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={fetchInbox} disabled={loading} startIcon={<RefreshIcon />}>
          {loading ? "Checking Inbox..." : "Check Inbox Manually"}
        </Button>
        <Button variant="outlined" onClick={generateEmail} sx={{ ml: 2 }} startIcon={<DeleteIcon />}>
          Recreate Email
        </Button>
        <Button
          variant={autoRefresh ? "outlined" : "contained"}
          onClick={() => setAutoRefresh(!autoRefresh)}
          sx={{ ml: 2 }}
        >
          {autoRefresh ? "Stop Auto-Refresh" : "Start Auto-Refresh"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Inbox Messages:</Typography>
        {messages && messages.length > 0 ? (
          messages.map((msg) => (
            <Card key={msg.id} sx={{ mb: 2, cursor: "pointer" }} onClick={() => openMessageModal(msg)}>
              <CardContent>
                <Typography variant="subtitle1">From: {msg.from}</Typography>
                <Typography variant="subtitle2">Subject: {msg.subject}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatTime(msg.created_at)}
                </Typography>
              </CardContent>
            </Card>
          ))
        ) : (
          <Typography variant="body2" sx={{ mt: 2 }}>
            {loading ? "Loading messages..." : "No messages yet. Check again later!"}
          </Typography>
        )}
      </Box>

      {/* Modal to display full message */}
      <Modal open={Boolean(selectedMessage)} onClose={closeMessageModal}>
        <Paper sx={modalStyle}>
          {selectedMessage && (
            <>
              <Typography variant="h6" gutterBottom>
                {selectedMessage.subject}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                From: {selectedMessage.from} • {formatTime(selectedMessage.created_at)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, mb: 2, whiteSpace: "pre-wrap" }}>
                {selectedMessage.body_text || "No text content available."}
              </Typography>
              <Box display="flex" justifyContent="space-between">
                <Button variant="contained" onClick={() => copyToClipboard(selectedMessage.body_text)}>
                  Copy Message
                </Button>
                <Button variant="outlined" onClick={closeMessageModal}>
                  Close
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Modal>
    </Box>
  );
};

export default TempMail;

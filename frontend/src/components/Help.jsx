import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Autocomplete,
  Button,
  Modal,
  Paper,
  TextareaAutosize,
  Link,
  IconButton,
  CircularProgress
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';

function Help() {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5000/sites')
      .then(res => res.json())
      .then(data => setSites(data))
      .catch(err => console.error(err));
  }, []);

  const handleGenerateEmail = async () => {
    if (!selectedSite) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/generate-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: selectedSite._id, inputValue }),
      });
      const data = await response.json();
      setGeneratedEmail(data.generatedEmail || 'Error generating email');
    } catch (error) {
      console.error(error);
      setGeneratedEmail('Error generating email');
    } finally {
      setLoading(false);
      setOpen(true);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedEmail);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 6, textAlign: 'center' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Data Deletion Assistant
      </Typography>

      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
        <Autocomplete
          options={sites}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField {...params} label="Search website" variant="outlined" fullWidth />
          )}
          onChange={(e, value) => setSelectedSite(value)}
          sx={{ width: 400 }}
        />
      </Box>

      {selectedSite && (
        <Paper elevation={3} sx={{ p: 4, mb: 3, textAlign: 'left' }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {selectedSite.name}
          </Typography>
          <Typography paragraph>
            <strong>Deletion URL:</strong>{' '}
            <Link href={selectedSite.url} target="_blank" underline="hover">
              {selectedSite.url}
            </Link>
          </Typography>
          <Typography paragraph>
            <strong>Instructions:</strong> {selectedSite.notes}
          </Typography>

          {selectedSite.email && (
            <>
              <Typography paragraph>
                <strong>Email for Deletion:</strong> {selectedSite.email}
              </Typography>
              <TextareaAutosize
                minRows={4}
                placeholder="Enter additional details (optional)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                style={{ width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid #ccc' }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleGenerateEmail}
                fullWidth
                disabled={loading}
                sx={{ textTransform: 'none', fontSize: '16px', padding: '10px' }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate Email'}
              </Button>
            </>
          )}
        </Paper>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Paper sx={{ p: 4, width: '90%', maxWidth: 600, position: 'relative' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Generated Email
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              border: '1px solid',
              borderColor: 'divider',
              minHeight: 100
            }}
          >
            {generatedEmail.split('**').map((text, i) =>
              i % 2 === 0 ? text : <strong key={i}>{text}</strong>
            )}
          </Box>
          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Button
              variant="contained"
              startIcon={<ContentCopyIcon />}
              onClick={copyToClipboard}
              sx={{ textTransform: 'none', fontSize: '14px', mr: 2 }}
            >
              Copy
            </Button>
            <Button variant="outlined" onClick={() => setOpen(false)} sx={{ textTransform: 'none', fontSize: '14px' }}>
              Close
            </Button>
          </Box>
        </Paper>
      </Modal>
    </Container>
  );
}

export default Help;

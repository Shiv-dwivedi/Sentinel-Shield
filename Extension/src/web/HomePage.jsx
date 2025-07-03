import React, { useState, useEffect } from 'react';
import { Container, Button, TextField, Fade, Zoom, Slide, Grid, Typography, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/system';

const securityTips = [
  "Always enable 2FA for important accounts",
  "Use a password manager to generate strong passwords",
  "Check for HTTPS in website URLs before entering sensitive data",
  "Never reuse passwords across different websites",
  "Regularly update your software and apps",
  "Be cautious of unsolicited emails asking for personal information"
];

const AnimatedHeader = styled('div')(({ theme }) => ({
  background: 'linear-gradient(45deg, #2c3e50, #3498db)',
  padding: '2rem',
  borderRadius: '15px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  marginBottom: '2rem',
  transform: 'translateY(0)',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)'
  }
}));

const FeatureButton = styled(Button)(({ theme }) => ({
  margin: '0.5rem',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
  }
}));

const SecurityCheckPage = () => {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [showTips, setShowTips] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setShowTips(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { id: 1, name: 'Breach Check', inputType: 'email-password' },
    { id: 2, name: 'Website Check', inputType: 'url' },
    { id: 3, name: 'Scam Message Check', inputType: 'text' },
    { id: 4, name: 'Temp Email', inputType: 'none' },
    { id: 5, name: 'Breach News', inputType: 'none' },
    { id: 6, name: 'Delete Data Guide', inputType: 'text' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/results', { state: { type: selectedFeature.name, value: inputValue } });
  };

  const renderInput = () => {
    switch (selectedFeature?.inputType) {
      case 'email-password':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" variant="outlined" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Password" type="password" variant="outlined" />
            </Grid>
          </Grid>
        );
      case 'url':
        return <TextField fullWidth label="Website URL" type="url" variant="outlined" />;
      case 'text':
        return <TextField fullWidth label={selectedFeature.name} multiline rows={4} variant="outlined" />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ minHeight: '100vh', py: 4 }}>
      <Slide direction="down" in={true} mountOnEnter unmountOnExit>
        <AnimatedHeader>
          <Typography variant="h3" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
            Security Toolkit
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#ecf0f1' }}>
            Protect your digital presence with our comprehensive security tools
          </Typography>
        </AnimatedHeader>
      </Slide>

      <Grid container spacing={3} justifyContent="center" sx={{ mb: 4 }}>
        {features.map((feature) => (
          <Zoom in={true} key={feature.id} style={{ transitionDelay: `${feature.id * 100}ms` }}>
            <FeatureButton
              variant="contained"
              color="primary"
              onClick={() => feature.inputType === 'none' ? navigate(`/${feature.name}`) : setSelectedFeature(feature)}
              sx={{ textTransform: 'none' }}
            >
              {feature.name}
            </FeatureButton>
          </Zoom>
        ))}
      </Grid>

      {selectedFeature?.inputType !== 'none' && selectedFeature?.inputType && (
        <Fade in={true}>
          <Paper elevation={4} sx={{ p: 4, maxWidth: 800, margin: '0 auto', borderRadius: '15px' }}>
            <form onSubmit={handleSubmit}>
              <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                {selectedFeature.name}
              </Typography>
              {renderInput()}
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                size="large"
                sx={{ mt: 3, float: 'right' }}
              >
                Analyze
              </Button>
            </form>
          </Paper>
        </Fade>
      )}

      {showTips && (
        <Fade in={true}>
          <Paper elevation={3} sx={{ p: 3, mt: 4, background: '#f8f9fa', borderRadius: '15px' }}>
            <Typography variant="h6" gutterBottom>
              Security Tip of the Moment
            </Typography>
            <Typography variant="body1">
              {securityTips[Math.floor(Math.random() * securityTips.length)]}
            </Typography>
          </Paper>
        </Fade>
      )}
    </Container>
  );
};

export default SecurityCheckPage;
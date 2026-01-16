import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Grid,
  Alert,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { modelsAPI, predictionsAPI } from '../services/api';

const featureDefinitions = {
  DISTRICT: {
    label: "District",
    type: "select",
    options: {
      "11": "Colombo", "12": "Gampaha", "13": "Kaluthara",
      "21": "Kandy", "22": "Matale", "23": "Nuwara Eliya",
      "31": "Galle", "32": "Mathara", "33": "Hambanthota",
      "41": "Jaffna", "42": "Mannar", "43": "Vavuniya", "44": "Mulathivu", "45": "Kilinochchi",
      "51": "Batticaloa", "52": "Ampara", "53": "Trincomalee",
      "61": "Kurunegala", "62": "Puttalam",
      "71": "Anuradhapura", "72": "Polonnaruwa",
      "81": "Badulla", "82": "Moneragala",
      "91": "Rathnapura", "92": "Kegalle"
    }
  },
  SEX: {
    label: "Sex",
    type: "select",
    options: {
      "1": "Male",
      "2": "Female"
    }
  },
  AGE: {
    label: "Age",
    type: "number",
    min: 15,
    max: 99
  },
  MARITAL: {
    label: "Marital Status",
    type: "select",
    options: {
      "1": "Never Married",
      "2": "Married",
      "3": "Widowed",
      "5": "Divorced/Separated"
    }
  },
  EDU: {
    label: "Education Level",
    type: "select",
    options: {
      "0": "Studying/Studied Grade 1", "1": "Passed Grade 1", "2": "Passed Grade 2",
      "3": "Passed Grade 3", "4": "Passed Grade 4", "5": "Passed Grade 5",
      "6": "Passed Grade 6", "7": "Passed Grade 7", "8": "Passed Grade 8",
      "9": "Passed Grade 9", "10": "Passed Grade 10", "11": "Passed G.C.E (O/L) / N.C.E",
      "12": "Passed Grade 12", "13": "Passed G.C.E (A/L) / H.N.C.E", "14": "Passed G.A.Q. / G.S.Q",
      "15": "Degree", "16": "Postgraduate Degree / Diploma", "17": "Special Educational Institutions",
      "18": "Post Graduate - M", "19": "Post Graduate - PhD"
    }
  },
  Language_Profile_Encoded: {
    label: "Language Profile",
    type: "select",
    options: {
      "0": "ENG", "1": "ENG+SIN", "2": "ENG+SIN+TAMIL",
      "3": "ENG+TAMIL", "4": "None", "5": "SIN",
      "6": "SIN+TAMIL", "7": "TAMIL"
    }
  },
  Disability_Category_Encoded: {
    label: "Disability Category",
    type: "select",
    options: {
      "0": "None", "1": "Mild", "2": "Moderate"
    }
  }
};

export default function Predict() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [features, setFeatures] = useState({
    DISTRICT: 11,
    SEX: 1,
    AGE: 25,
    MARITAL: 1,
    EDU: 10,
    Language_Profile_Encoded: 3,
    Disability_Category_Encoded: 0,
  });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const response = await modelsAPI.getAll();
      setModels(response.data);
      if (response.data.length > 0) {
        setSelectedModel(response.data[0].model_type);
      }
    } catch (err) {
      setError('Failed to load models: ' + err.message);
    }
  };

  const handlePredict = async () => {
    if (!selectedModel) {
      setError('Please select a model');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await predictionsAPI.predict({
        model_type: selectedModel,
        features: features,
      });
      setPrediction(response.data);
    } catch (err) {
      setError('Prediction failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureChange = (feature, value) => {
    setFeatures((prev) => ({
      ...prev,
      [feature]: parseFloat(value) || 0,
    }));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Make Prediction
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Enter individual characteristics to predict employment status.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Input Features
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Model</InputLabel>
              <Select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                label="Model"
              >
                {models.map((model) => (
                  <MenuItem key={model.model_type} value={model.model_type}>
                    {model.model_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            {Object.keys(features).map((feature) => {
              const def = featureDefinitions[feature];
              
              if (def.type === 'select') {
                return (
                  <FormControl key={feature} fullWidth sx={{ mb: 2 }}>
                    <InputLabel>{def.label}</InputLabel>
                    <Select
                      value={features[feature]}
                      onChange={(e) => handleFeatureChange(feature, e.target.value)}
                      label={def.label}
                    >
                      {Object.entries(def.options).map(([value, label]) => (
                        <MenuItem key={value} value={parseInt(value)}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              }
              
              return (
                <TextField
                  key={feature}
                  fullWidth
                  label={def.label}
                  type="number"
                  value={features[feature]}
                  onChange={(e) => handleFeatureChange(feature, e.target.value)}
                  sx={{ mb: 2 }}
                  inputProps={{
                    min: def.min || 0,
                    max: def.max || 999,
                  }}
                />
              );
            })}

            <Button
              variant="contained"
              fullWidth
              onClick={handlePredict}
              disabled={loading || !selectedModel}
              sx={{ mt: 2 }}
            >
              {loading ? 'Predicting...' : 'Predict Employment Status'}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          {prediction && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Prediction Result
                </Typography>

                <Box sx={{ my: 3, textAlign: 'center' }}>
                  <Typography
                    variant="h3"
                    color={
                      prediction.prediction === 1 ? 'success.main' : 'error.main'
                    }
                  >
                    {prediction.prediction_label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Using {prediction.model_name}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Probabilities
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography>Employed:</Typography>
                    <Typography fontWeight="bold">
                      {(prediction.probabilities.Employed * 100).toFixed(2)}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Unemployed:</Typography>
                    <Typography fontWeight="bold">
                      {(prediction.probabilities.Unemployed * 100).toFixed(2)}%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

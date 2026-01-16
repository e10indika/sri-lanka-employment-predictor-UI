import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Paper,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material';
import { modelsAPI, trainingAPI, visualizationsAPI } from '../services/api';

export default function TrainModel() {
  const [availableModels, setAvailableModels] = useState([]);
  const [modelType, setModelType] = useState('');
  const [selectedModels, setSelectedModels] = useState([]);
  const [performCV, setPerformCV] = useState(true);
  const [cvFolds, setCvFolds] = useState(5);
  const [performTuning, setPerformTuning] = useState(false);
  const [training, setTraining] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadModelTypes();
  }, []);

  useEffect(() => {
    let interval;
    if (jobId && training) {
      interval = setInterval(checkStatus, 2000);
    }
    return () => clearInterval(interval);
  }, [jobId, training]);

  const loadModelTypes = async () => {
    try {
      const response = await modelsAPI.getTypes();
      const modelTypes = response.data.model_types || [];
      setAvailableModels(modelTypes);
      if (modelTypes.length > 0) {
        setModelType(modelTypes[0].value);
        setSelectedModels([modelTypes[0].value]);
      }
    } catch (err) {
      setError('Failed to load model types: ' + err.message);
    }
  };

  const handleSelectAll = () => {
    if (selectedModels.length === availableModels.length) {
      setSelectedModels([]);
    } else {
      setSelectedModels(availableModels.map(m => m.value));
    }
  };

  const handleModelToggle = (modelValue) => {
    setSelectedModels(prev => {
      if (prev.includes(modelValue)) {
        return prev.filter(m => m !== modelValue);
      } else {
        return [...prev, modelValue];
      }
    });
  };

  const checkStatus = async () => {
    try {
      const response = await trainingAPI.getStatus(jobId);
      setStatus(response.data);

      if (response.data.status === 'completed' || response.data.status === 'failed') {
        setTraining(false);
        if (response.data.status === 'failed') {
          setError(response.data.error);
        }
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    }
  };

  const waitForCompletion = async (jobId) => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const response = await trainingAPI.getStatus(jobId);
          setStatus(response.data);

          if (response.data.status === 'completed') {
            clearInterval(interval);
            resolve();
          } else if (response.data.status === 'failed') {
            clearInterval(interval);
            setError(response.data.error);
            reject(new Error(response.data.error));
          }
        } catch (err) {
          clearInterval(interval);
          reject(err);
        }
      }, 2000);
    });
  };

  const handleTrain = async () => {
    if (selectedModels.length === 0) {
      setError('Please select at least one model to train');
      return;
    }

    try {
      setTraining(true);
      setError(null);
      setStatus(null);

      // Train all selected models sequentially
      for (const model of selectedModels) {
        const response = await trainingAPI.start({
          model_type: model,
          perform_cv: performCV,
          cv_folds: cvFolds,
          perform_tuning: performTuning,
        });

        setJobId(response.data.job_id);
        setModelType(model); // Update current model being trained
        
        // Wait for this model to complete before starting the next one
        await waitForCompletion(response.data.job_id);
      }
      
      setTraining(false);
    } catch (err) {
      setError('Failed to complete training: ' + err.message);
      setTraining(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Train Employment Prediction Model
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Train new models to predict employment status based on Sri Lankan labour force statistics.
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
              Training Configuration
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1">Select Models to Train</Typography>
                <Button
                  size="small"
                  onClick={handleSelectAll}
                  disabled={training}
                >
                  {selectedModels.length === availableModels.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {availableModels.map((model) => (
                  <FormControlLabel
                    key={model.value}
                    control={
                      <Checkbox
                        checked={selectedModels.includes(model.value)}
                        onChange={() => handleModelToggle(model.value)}
                        disabled={training}
                      />
                    }
                    label={model.label}
                  />
                ))}
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={performCV}
                  onChange={(e) => setPerformCV(e.target.checked)}
                  disabled={training}
                />
              }
              label="Perform Cross-Validation"
            />

            {performCV && (
              <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
                <InputLabel>CV Folds</InputLabel>
                <Select
                  value={cvFolds}
                  onChange={(e) => setCvFolds(e.target.value)}
                  label="CV Folds"
                  disabled={training}
                >
                  {[3, 4, 5, 7, 10].map((n) => (
                    <MenuItem key={n} value={n}>
                      {n} Folds
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={performTuning}
                  onChange={(e) => setPerformTuning(e.target.checked)}
                  disabled={training}
                />
              }
              label="Hyperparameter Tuning (slower)"
            />

            <Button
              variant="contained"
              fullWidth
              onClick={handleTrain}
              disabled={training || selectedModels.length === 0}
              sx={{ mt: 3 }}
            >
              {training ? 'Training...' : `Train ${selectedModels.length} Model${selectedModels.length !== 1 ? 's' : ''}`}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          {status && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Training Progress
                </Typography>

                <Box sx={{ my: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2">{status.message}</Typography>
                    <Typography variant="body2">{status.progress}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={status.progress}
                  />
                </Box>

                <Chip
                  label={status.status.toUpperCase()}
                  color={
                    status.status === 'completed'
                      ? 'success'
                      : status.status === 'failed'
                      ? 'error'
                      : 'primary'
                  }
                  sx={{ mt: 2 }}
                />

                {status.results && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Training Results
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Model: <strong>{status.results.model_name}</strong>
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          Accuracy: <strong>{(status.results.metrics.accuracy * 100).toFixed(2)}%</strong>
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          Precision: <strong>{(status.results.metrics.precision * 100).toFixed(2)}%</strong>
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          Recall: <strong>{(status.results.metrics.recall * 100).toFixed(2)}%</strong>
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          F1 Score: <strong>{(status.results.metrics.f1_weighted * 100).toFixed(2)}%</strong>
                        </Typography>
                      </Grid>
                      {status.results.cv_scores && status.results.cv_scores.length > 0 && (
                        <>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mt: 1 }}>
                              Cross-Validation
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2">
                              CV Mean: <strong>{(status.results.cv_scores.reduce((a, b) => a + b, 0) / status.results.cv_scores.length * 100).toFixed(2)}%</strong>
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2">
                              CV Std: <strong>{(Math.sqrt(status.results.cv_scores.map(x => Math.pow(x - status.results.cv_scores.reduce((a, b) => a + b, 0) / status.results.cv_scores.length, 2)).reduce((a, b) => a + b, 0) / status.results.cv_scores.length) * 100).toFixed(2)}%</strong>
                            </Typography>
                          </Grid>
                        </>
                      )}
                      {status.results.training_time && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Training Time: <strong>{status.results.training_time.toFixed(2)}s</strong>
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Visualizations Section */}
      {status && status.status === 'completed' && status.results && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Model Visualizations
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Confusion Matrix
                  </Typography>
                  <Box
                    component="img"
                    key={`cm-${modelType}`}
                    src={visualizationsAPI.getConfusionMatrix(modelType)}
                    alt="Confusion Matrix"
                    sx={{ width: '100%', height: 'auto' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: 'none', mt: 2, textAlign: 'center' }}
                  >
                    Visualization not yet available
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Feature Importance
                  </Typography>
                  <Box
                    component="img"
                    key={`fi-${modelType}`}
                    src={visualizationsAPI.getFeatureImportance(modelType)}
                    alt="Feature Importance"
                    sx={{ width: '100%', height: 'auto' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: 'none', mt: 2, textAlign: 'center' }}
                  >
                    Visualization not yet available
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    SHAP Summary
                  </Typography>
                  <Box
                    component="img"
                    key={`shap-${modelType}`}
                    src={visualizationsAPI.getShapSummary(modelType)}
                    alt="SHAP Summary"
                    sx={{ width: '100%', height: 'auto', maxHeight: '600px', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: 'none', mt: 2, textAlign: 'center' }}
                  >
                    Visualization not yet available
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}

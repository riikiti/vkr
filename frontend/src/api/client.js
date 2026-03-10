import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minutes for long experiments
});

export const getConfig = () => client.get('/config');

export const runExperiment = (params) => client.post('/experiments/run', params);

export const generateReport = (format, results) =>
  client.post('/reports/generate', { format, results }, {
    responseType: 'blob',
  });

export default client;

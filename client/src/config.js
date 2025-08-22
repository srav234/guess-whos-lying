// Configuration for backend URL
// In development, this will be localhost:3001
// In production, this will be your Render backend URL
const config = {
  backendUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'
};

export default config;

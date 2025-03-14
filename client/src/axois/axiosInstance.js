import axios from 'axios';


// Create Axios instance with default config
export const axiosInstance = axios.create({
    baseURL: 'http://localhost:5000',  // Base URL for all requests
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true  // Ensures cookies are sent with requests (if required)
});

// Request Interceptor (Optional for adding tokens, logs, etc.)
axiosInstance.interceptors.request.use(
    config => {
        console.log(`[REQUEST] ${config.method.toUpperCase()} ${config.url}`);
        return config;
    },
    error => Promise.reject(error)
);

// Response Interceptor (Optional for error handling)
axiosInstance.interceptors.response.use(
    response => response,
    error => {
        console.error('[ERROR]', error.response || error.message);
        return Promise.reject(error);
    }
);

export default axiosInstance;

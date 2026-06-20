import axios from "axios";

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: any = null) => {
    failedQueue.forEach(prom => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
};

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        'X-Client-Type': 'web',
        "ngrok-skip-browser-warning": "true"
    },
});

api.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (originalRequest.url?.includes('login') || originalRequest.url?.includes('register'))
            return Promise.reject(error);

        if (error.response?.status === 403 && error.response?.data?.message === 'Hesabınız engellenmiştir.') {
            if (!window.location.pathname.includes('/banned'))
                window.location.href = '/banned';
            return Promise.reject(error);
        }

        if (error.response?.status === 429) {
            console.error('Rate limit hit. Please wait a moment.');
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => api(originalRequest))
                    .catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await axios.post(`${import.meta.env.VITE_API_URL}api/auth/refresh`, {}, {
                    withCredentials: true,
                    headers: { 'X-Client-Type': 'web' },
                    ...(import.meta.env.DEV ? { "ngrok-skip-browser-warning": "true" } : {})
                });

                processQueue(null);
                isRefreshing = false;

                return api(originalRequest);

            } catch (err) {
                processQueue(err, null);
                isRefreshing = false;

                localStorage.removeItem('user');

                if (window.location.pathname !== '/' && window.location.pathname !== '') {
                    window.location.href = "/";
                }

                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
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

const adminApi = axios.create({
    baseURL: import.meta.env.VITE_ADMIN_API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        'X-Client-Type': 'web',
        ...(import.meta.env.DEV ? { "ngrok-skip-browser-warning": "true" } : {})
    },
});

adminApi.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => Promise.reject(error)
);

adminApi.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => adminApi(originalRequest))
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

                return adminApi(originalRequest);

            } catch (err) {
                processQueue(err, null);
                isRefreshing = false;

                window.location.href = "/";
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

export default adminApi;
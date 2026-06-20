/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BACKEND_URL: string;
    // Başka değişkenlerin varsa buraya ekleyebilirsin
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
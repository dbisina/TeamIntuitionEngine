import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getApiUrl() {
    if (process.env.NEXT_PUBLIC_API_URL) {
        let url = process.env.NEXT_PUBLIC_API_URL;
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }
        return url;
    }

    if (process.env.NODE_ENV === 'production') {
        return 'https://backend-production-efe0.up.railway.app';
    }

    return 'http://localhost:8000';
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getApiUrl() {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    if (!url.startsWith('http')) {
        return `https://${url}`;
    }
    return url;
}

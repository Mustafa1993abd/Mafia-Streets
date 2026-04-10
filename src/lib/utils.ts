import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0';
  
  // Use Intl.NumberFormat for compact notation (e.g., 1K, 1.5M, 2B, 3T)
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
}

export function formatNumberExact(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatMoney(num: number | undefined | null): string {
  if (num === undefined || num === null) return '$0';
  return '$' + formatNumber(num);
}

export function formatDate(date: any): string {
  if (!date) return '-';
  try {
    // Handle Firestore Timestamp
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  } catch (e) {
    return '-';
  }
}

export function safeToDate(date: any): Date {
  if (!date) return new Date();
  try {
    const d = date.toDate ? date.toDate() : new Date(date);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch (e) {
    return new Date();
  }
}

export function safeToMillis(date: any): number {
  if (!date) return 0;
  try {
    if (typeof date.toMillis === 'function') return date.toMillis();
    if (typeof date.toDate === 'function') return date.toDate().getTime();
    if (date instanceof Date) return date.getTime();
    if (typeof date === 'number') return date;
    if (typeof date === 'string') return new Date(date).getTime();
    if (date.seconds !== undefined) return date.seconds * 1000;
    return new Date(date).getTime() || 0;
  } catch (e) {
    return 0;
  }
}

export function getHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getRealisticAvatar(seed: string, gender: 'male' | 'female' = 'male', age: number = 25): string {
  // Manual fallback avatar URL
  return `https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkNDIzN2YyZmY0ODE5MTgxN2IzZWFjN2VkNzBiODU6ZmlsZV8wMDAwMDAwMGQzZmM3MjQ2OGVlODJlNThhN2FhMDI5OSIsInRzIjoiMjA1NDkiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6ImJkOGZjNDM0ZTViODdjMGU1ZTZmYWEwNjA5NTI3ZjNjZjU0ZjMxZWVlMjkzZjBhODJjNDU0YjBiODI2YjAyNjUiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9`;
}

export async function safeFetch(url: string, options?: RequestInit, retries = 30, delay = 3000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const fetchOptions = {
        ...options,
        headers: {
          ...options?.headers,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      };
      const res = await fetch(url, fetchOptions);
      const text = await res.text();
      console.log(`safeFetch response from ${url}:`, text.substring(0, 100));
      
      const trimmedText = text.trim().toLowerCase();
      const isHtml = trimmedText.startsWith('<!doctype html>') || 
                     trimmedText.startsWith('<html') ||
                     trimmedText.includes('<head>') ||
                     trimmedText.includes('<body>');
      
      if (isHtml) {
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error('الخادم قيد التشغيل، يرجى المحاولة مرة أخرى بعد ثوانٍ (انتهت محاولات الاتصال - 90 ثانية)');
      }

      if (!res.ok) {
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || `Server error (${res.status})`);
        } catch (e) {
          throw new Error(`Server error (${res.status}): ${text.substring(0, 100)}`);
        }
      }

      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse JSON:', text);
        throw new Error('Invalid response format from server');
      }
    } catch (error: any) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

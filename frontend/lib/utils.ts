/**
 * Utility functions
 */

// Get API base URL without /api/v1 suffix for static files
export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
  }
  return process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://backend:8000';
};

/**
 * Get full URL for avatar
 * Backend returns relative path like /uploads/avatars/filename.png
 * We need to prepend the API base URL
 */
export const getAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
  if (!avatarUrl) return null;
  
  // If already a full URL, return as is
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // Prepend API base URL
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${avatarUrl}`;
};

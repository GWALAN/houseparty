export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
};

export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password || password.trim() === '') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }

  return { valid: true };
};

export const validateUsername = (username: string): { valid: boolean; error?: string } => {
  if (!username || username.trim() === '') {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long' };
  }

  if (username.length > 20) {
    return { valid: false, error: 'Username must be no more than 20 characters long' };
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  return { valid: true };
};

export const validateHouseName = (name: string): { valid: boolean; error?: string } => {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'House name is required' };
  }

  if (name.length < 3) {
    return { valid: false, error: 'House name must be at least 3 characters long' };
  }

  if (name.length > 50) {
    return { valid: false, error: 'House name must be no more than 50 characters long' };
  }

  return { valid: true };
};

export const validateURL = (url: string): { valid: boolean; error?: string } => {
  if (!url || url.trim() === '') {
    return { valid: true };
  }

  try {
    new URL(url);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasValidExtension = validExtensions.some(ext => url.toLowerCase().includes(ext));

    if (!hasValidExtension) {
      return { valid: false, error: 'URL must point to a valid image file (.jpg, .jpeg, .png, .gif, .webp)' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Please enter a valid URL' };
  }
};

export const safeFontSize = (size: number, minSize: number = 12): number => {
  if (typeof size !== 'number' || isNaN(size) || !isFinite(size)) {
    console.warn(`[safeFontSize] Invalid font size received: ${size}, using minimum ${minSize}`);
    return minSize;
  }

  if (size < minSize) {
    if (size < 0) {
      console.warn(`[safeFontSize] Negative font size detected: ${size}, clamping to ${minSize}`);
    }
    return minSize;
  }

  return size;
};

export const safeSize = (size: number, minSize: number = 16, defaultSize: number = 32): number => {
  if (typeof size !== 'number' || isNaN(size) || !isFinite(size)) {
    console.warn(`[safeSize] Invalid size received: ${size}, using default ${defaultSize}`);
    return defaultSize;
  }

  if (size < minSize) {
    if (size < 0) {
      console.warn(`[safeSize] Negative size detected: ${size}, clamping to ${minSize}`);
    }
    return minSize;
  }

  return size;
};

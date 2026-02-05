import validator from 'validator';

export function validateEmail(email) {
  return validator.isEmail(email);
}

export function validatePassword(password) {
  // At least 8 characters
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  return { valid: true };
}

export function validateSignup(email, name, password, confirmPassword) {
  const errors = [];

  // Email validation
  if (!email || !validateEmail(email)) {
    errors.push('Invalid email address');
  }

  // Name validation
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  // Password validation
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  // Confirm password
  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateLogin(email, password) {
  const errors = [];

  if (!email || !validateEmail(email)) {
    errors.push('Invalid email address');
  }

  if (!password || password.length === 0) {
    errors.push('Password is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validatePlaceSubmission(data) {
  const errors = [];

  const {
    name,
    description,
    locationLat,
    locationLng,
    address,
    pricePerNight,
    imageUrl,
    placeType,
    amenities,
  } = data;

  // Name validation
  if (!name || name.trim().length < 3) {
    errors.push('Place name must be at least 3 characters');
  }

  // Description validation
  if (!description || description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  }

  // Location validation
  if (!locationLat || !locationLng) {
    errors.push('Location (latitude and longitude) is required');
  }

  if (locationLat < -90 || locationLat > 90) {
    errors.push('Invalid latitude');
  }

  if (locationLng < -180 || locationLng > 180) {
    errors.push('Invalid longitude');
  }

  // Address validation
  if (!address || address.trim().length < 5) {
    errors.push('Address must be at least 5 characters');
  }

  // Price validation
  if (!pricePerNight || pricePerNight <= 0) {
    errors.push('Price per night must be greater than 0');
  }

  // Place type validation
  if (!placeType || placeType.trim().length === 0) {
    errors.push('Place type is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

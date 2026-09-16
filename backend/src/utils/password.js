import bcrypt from 'bcryptjs';

/**
 * Hash a plaintext password using bcrypt with a work factor of 12.
 * @param {string} plainTextPassword
 * @returns {Promise<string>} The generated password hash.
 */
export async function hashPassword(plainTextPassword) {
  const saltRounds = 12;
  const hash = await bcrypt.hash(plainTextPassword, saltRounds);
  return hash;
}

/**
 * Compare a plaintext password with a bcrypt hash.
 * @param {string} plainTextPassword
 * @param {string} passwordHash
 * @returns {Promise<boolean>} True if the password matches the hash.
 */
export async function comparePassword(plainTextPassword, passwordHash) {
  const match = await bcrypt.compare(plainTextPassword, passwordHash);
  return match;
}

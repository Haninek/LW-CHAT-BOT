#!/usr/bin/env node

const crypto = require('crypto');

// Generate a secure 32-byte encryption key
const key = crypto.randomBytes(32).toString('hex');

console.log('Generated encryption key:');
console.log(key);
console.log('');
console.log('Add this to your .env file:');
console.log(`ENCRYPTION_KEY=${key}`);
console.log('');
console.log('⚠️  Keep this key secure and never commit it to version control!');
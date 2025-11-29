#!/usr/bin/env node

require('dotenv').config();

console.log('\n=== Environment Configuration Validation ===\n');

const REQUIRED_VARS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY'
];

const HARDCODED_CONFIG = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://gryezgodpegsucautulc.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyeWV6Z29kcGVnc3VjYXV0dWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjM1MjIsImV4cCI6MjA3NDg5OTUyMn0.Y4F8D5dDrVj1NuH4k81SBVlR2-4JAptPBrrbLz51n6w'
};

let hasErrors = false;
let allLoaded = true;

REQUIRED_VARS.forEach(varName => {
  const envValue = process.env[varName];
  const hardcodedValue = HARDCODED_CONFIG[varName];
  
  if (envValue) {
    console.log(`✅ ${varName}`);
    console.log(`   Source: .env file`);
    console.log(`   Value: ${envValue.substring(0, 40)}...`);
  } else if (hardcodedValue) {
    console.log(`⚠️  ${varName}`);
    console.log(`   Source: HARDCODED_CONFIG (fallback)`);
    console.log(`   Value: ${hardcodedValue.substring(0, 40)}...`);
  } else {
    console.log(`❌ ${varName}`);
    console.log(`   Source: MISSING`);
    hasErrors = true;
    allLoaded = false;
  }
  console.log('');
});

console.log('===========================================\n');

if (hasErrors) {
  console.error('❌ VALIDATION FAILED: Missing required environment variables');
  console.error('\nPlease ensure your .env file contains all required variables.');
  process.exit(1);
} else if (!allLoaded) {
  console.warn('⚠️  WARNING: Some variables are using fallback values');
  console.warn('The app will work, but consider adding them to .env\n');
  process.exit(0);
} else {
  console.log('✅ All environment variables are properly configured\n');
  process.exit(0);
}

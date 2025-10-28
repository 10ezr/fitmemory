#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates that all required environment variables are set
 */

require("dotenv").config({ path: ".env.local" });

const requiredVars = ["MONGODB_URI"];

const optionalVars = ["NEXT_PUBLIC_SITE_URL", "OPENAI_API_KEY"];

console.log("🔍 Environment Validation");
console.log("========================");

let hasErrors = false;

// Check required variables
console.log("\n📋 Required Variables:");
requiredVars.forEach((varName) => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: NOT SET`);
    hasErrors = true;
  } else {
    // Mask sensitive values
    const masked =
      varName.includes("URI") || varName.includes("KEY")
        ? value.substring(0, 20) + "..."
        : value;
    console.log(`✅ ${varName}: ${masked}`);
  }
});

// Check optional variables
console.log("\n📋 Optional Variables:");
optionalVars.forEach((varName) => {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚠️  ${varName}: NOT SET (optional)`);
  } else {
    const masked =
      varName.includes("URI") || varName.includes("KEY")
        ? value.substring(0, 20) + "..."
        : value;
    console.log(`✅ ${varName}: ${masked}`);
  }
});

// Validate MongoDB URI format
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  console.log("\n🔍 MongoDB URI Validation:");
  if (mongoUri.includes("localhost") || mongoUri.includes("127.0.0.1")) {
    console.log(
      "❌ MONGODB_URI contains localhost - this will not work in production"
    );
    console.log(
      "   Use MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/fitmemory"
    );
    hasErrors = true;
  } else if (mongoUri.startsWith("mongodb+srv://")) {
    console.log("✅ MONGODB_URI appears to be a valid Atlas connection string");
  } else if (mongoUri.startsWith("mongodb://")) {
    console.log("⚠️  MONGODB_URI appears to be a local connection string");
  } else {
    console.log("❌ MONGODB_URI format is unrecognized");
    hasErrors = true;
  }
}

console.log("\n" + "=".repeat(40));
if (hasErrors) {
  console.log("❌ Environment validation failed");
  console.log("\nTo fix:");
  console.log("1. Create .env.local with required variables");
  console.log("2. For production, set variables in Vercel Project Settings");
  process.exit(1);
} else {
  console.log("✅ Environment validation passed");
}

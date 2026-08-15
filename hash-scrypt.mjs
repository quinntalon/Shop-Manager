#!/usr/bin/env node
/**
 * Generates a scrypt password hash in the same format used by the app.
 * Usage: PASSWORD="yourpassword" node hash-scrypt.mjs
 */

import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const password = process.env.PASSWORD;
if (!password) {
  console.error("Error: PASSWORD environment variable is not set.");
  console.error('Usage: PASSWORD="yourpassword" node hash-scrypt.mjs');
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const derivedKey = await scryptAsync(password, salt, 64);
const hash = `${salt}:${derivedKey.toString("hex")}`;

console.log(hash);

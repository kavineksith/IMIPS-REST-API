#!/usr/bin/env node

/**
 * Security Key Generator for IMIPS Backend
 * 
 * This script generates secure random keys for:
 * - JWT_SECRET
 * - ENCRYPTION_KEY
 * - Database passwords
 * 
 * Usage: node scripts/generate-keys.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('\n='.repeat(70));
console.log('IMIPS Security Key Generator');
console.log('='.repeat(70));
console.log('\n');

// Generate JWT Secret (64 bytes = 128 hex characters)
const jwtSecret = crypto.randomBytes(64).toString('hex');

const encryptionKey = crypto.randomBytes(32).toString('hex');

// Generate secure database password
const dbPassword = crypto.randomBytes(32).toString('base64')
    .replace(/[+/=]/g, '')
    .substring(0, 32);

// Generate admin password
const adminPassword = crypto.randomBytes(16).toString('base64')
    .replace(/[+/=]/g, '')
    .substring(0, 20) + '@1Aa';

// Save all generated keys to a file, do not print to stdout by default
const outputFile = path.resolve(__dirname, 'generated-keys.txt');
const outputContents =
`# IMIPS Security Key Generator Output

JWT_SECRET=${jwtSecret}
ENCRYPTION_KEY=${encryptionKey}
DB_PASSWORD=${dbPassword}
ADMIN_PASSWORD=${adminPassword}

# Copy each value to your .env file as appropriate, then delete this file securely.
# DO NOT commit this file to version control.
`;

fs.writeFileSync(outputFile, outputContents, { encoding: 'utf8', flag: 'w' });

console.log('All secrets have been generated and written to: ' + outputFile);
console.log('Open this file, copy values as needed to your .env file, then securely DELETE the file.');
console.log('If you need secrets printed to stdout, rerun this script with: node scripts/generate-keys.js --stdout');

// Refuse to show secrets on stdout, even if explicitly requested
if (process.argv.includes('--stdout')) {
    console.log('Refusing to print sensitive secrets to stdout. Please see the generated-keys.txt file for your generated secrets and handle it securely.');
}
console.log('='.repeat(70));
console.log('IMPORTANT SECURITY NOTES:');
console.log('='.repeat(70));
console.log('1. Copy these values to your .env file immediately');
console.log('2. NEVER commit .env file to version control');
console.log('3. Set proper file permissions: chmod 600 .env');
console.log('4. Store these values securely (password manager recommended)');
console.log('5. Different environments should use different keys');
console.log('6. Change the admin password after first login');
console.log('='.repeat(70));
console.log('\n');

// Optionally create/update .env file
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

readline.question('Would you like to create/update .env file? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        const envPath = path.join(__dirname, '..', '.env');
        let envContent = '';

        // Check if .env exists
        if (fs.existsSync(envPath)) {
            console.log('\nWarning: .env file already exists!');
            readline.question('Overwrite existing .env? (yes/no): ', (overwrite) => {
                if (overwrite.toLowerCase() === 'yes' || overwrite.toLowerCase() === 'y') {
                    createEnvFile(envPath, jwtSecret, encryptionKey, dbPassword);
                } else {
                    console.log('\nNo changes made. Copy the keys manually to your .env file.');
                }
                readline.close();
            });
        } else {
            createEnvFile(envPath, jwtSecret, encryptionKey, dbPassword);
            readline.close();
        }
    } else {
        console.log('\nKeys generated. Copy them manually to your .env file.');
        readline.close();
    }
});

function createEnvFile(envPath, jwtSecret, encryptionKey, dbPassword) {
    const envTemplate = `# Environment Configuration
NODE_ENV=production
PORT=5000
TRUST_PROXY=true

# Database Configuration
DB_HOST=localhost
DB_USER=imips_user
DB_PASSWORD=${dbPassword}
DB_NAME=imips

# JWT Configuration (GENERATED)
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=24h

# Encryption Key (GENERATED)
ENCRYPTION_KEY=${encryptionKey}

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password

# Backup Configuration
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30

# Security Settings
LOG_SECURITY_TO_DB=true
LOG_LEVEL=info
MAX_CONCURRENT_SESSIONS=5

# IMPORTANT: Update SMTP settings and ALLOWED_ORIGINS before deployment!
`;

    try {
        fs.writeFileSync(envPath, envTemplate, { mode: 0o600 });
        console.log('\n✓ .env file created successfully!');
        console.log('✓ File permissions set to 600 (read/write owner only)');
        console.log('\nNext steps:');
        console.log('1. Update SMTP settings in .env');
        console.log('2. Update ALLOWED_ORIGINS with your frontend domains');
        console.log('3. Review and adjust other settings as needed');
    } catch (error) {
        console.error('\nError creating .env file:', error.message);
    }
}

// Validate existing .env file
function validateEnvFile() {
    const envPath = path.join(__dirname, '..', '.env');

    if (!fs.existsSync(envPath)) {
        return { valid: false, message: '.env file not found' };
    }

    try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const issues = [];

        // Check for weak/default values
        if (envContent.includes('GENERATE_SECURE') ||
            envContent.includes('CHANGE_THIS')) {
            issues.push('- Contains placeholder values that must be changed');
        }

        // Check JWT_SECRET length
        const jwtMatch = envContent.match(/JWT_SECRET=([^\n]+)/);
        if (jwtMatch && jwtMatch[1].length < 64) {
            issues.push('- JWT_SECRET is too short (minimum 64 characters)');
        }

        // Check ENCRYPTION_KEY length
        const encMatch = envContent.match(/ENCRYPTION_KEY=([^\n]+)/);
        if (encMatch && encMatch[1].length < 64) {
            issues.push('- ENCRYPTION_KEY is too short (minimum 64 characters)');
        }

        if (issues.length > 0) {
            return {
                valid: false,
                message: 'Security issues found in .env:\n' + issues.join('\n')
            };
        }

        return { valid: true, message: '.env file looks good!' };
    } catch (error) {
        return { valid: false, message: 'Error reading .env file: ' + error.message };
    }
}

// Export for use in other scripts
module.exports = {
    generateJWTSecret: () => crypto.randomBytes(64).toString('hex'),
    generateEncryptionKey: () => crypto.randomBytes(32).toString('hex'),
    generateSecurePassword: (length = 32) => {
        return crypto.randomBytes(length).toString('base64')
            .replace(/[+/=]/g, '')
            .substring(0, length);
    },
    validateEnvFile
};
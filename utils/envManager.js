const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');

/**
 * Updates or sets an environment variable key in process.env and persists it to the .env file.
 * @param {string} key - Environment variable name (e.g. 'IMGBB_API_KEY')
 * @param {string} value - Value to set
 */
function updateEnvVariable(key, value) {
  const cleanKey = String(key || '').trim().toUpperCase();
  const cleanValue = String(value || '').trim();

  if (!cleanKey) {
    throw new Error('Key name is required');
  }

  // Update live process.env
  process.env[cleanKey] = cleanValue;

  try {
    let envContent = '';
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf8');
    }

    const regex = new RegExp(`^${cleanKey}=.*$`, 'm');
    const newLine = `${cleanKey}=${cleanValue}`;

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      if (envContent && !envContent.endsWith('\n')) {
        envContent += '\n';
      }
      envContent += `${newLine}\n`;
    }

    fs.writeFileSync(ENV_PATH, envContent, 'utf8');
    return cleanValue;
  } catch (err) {
    console.error(`Error saving ${cleanKey} to .env file:`, err.message);
    throw err;
  }
}

module.exports = {
  updateEnvVariable
};

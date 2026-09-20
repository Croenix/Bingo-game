const express = require('express');
const router = express.Router();

/**
 * GET /api/agora/config
 * Returns the configured Agora App ID for client-side RTC initialization.
 */
router.get('/config', (req, res) => {
  const appId = process.env.AGORA_APP_ID || 'a1b2c3d4e5f67890a1b2c3d4e5f67890';
  return res.json({
    ok: true,
    appId
  });
});

module.exports = router;

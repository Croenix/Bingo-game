const express = require('express');
const router = express.Router();
const { RtcTokenBuilder, RtcRole } = require('agora-token');

function generateAgoraRtcToken(channelName, uid) {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) return null;

  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600 * 24;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  if (typeof uid === 'number' || (uid !== undefined && uid !== null && !isNaN(Number(uid)) && String(uid).trim() !== '')) {
    return RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      Number(uid),
      role,
      privilegeExpiredTs,
      privilegeExpiredTs
    );
  } else {
    return RtcTokenBuilder.buildTokenWithUserAccount(
      appId,
      appCertificate,
      channelName,
      String(uid || 'user').trim(),
      role,
      privilegeExpiredTs,
      privilegeExpiredTs
    );
  }
}

/**
 * GET /api/agora/config
 * Returns configured Agora App ID and whether token authentication is required.
 */
router.get('/config', (req, res) => {
  const appId = process.env.AGORA_APP_ID || '';
  const hasCertificate = Boolean(process.env.AGORA_APP_CERTIFICATE);
  return res.json({
    ok: true,
    appId,
    tokenRequired: hasCertificate
  });
});

/**
 * POST /api/agora/token
 * Generates signed Agora RTC token for channel access.
 * Body: { channelName, uid }
 */
router.post('/token', (req, res) => {
  try {
    const { channelName, uid } = req.body || {};
    if (!channelName) {
      return res.status(400).json({ ok: false, message: 'channelName is required' });
    }

    const appId = process.env.AGORA_APP_ID;
    const token = generateAgoraRtcToken(channelName, uid || 0);

    return res.json({
      ok: true,
      appId,
      channelName,
      token
    });
  } catch (err) {
    console.error('[Agora] Token generation error:', err.message);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;

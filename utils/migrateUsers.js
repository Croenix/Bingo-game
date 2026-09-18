const User = require('../models/User');
const { generateUniqueUserId } = require('./userIdGenerator');
const { generateUniqueUsername } = require('./usernameGenerator');
const { generateDefaultAvatar } = require('./avatarGenerator');

/**
 * Migration helper to backfill missing userId and username fields for legacy users.
 */
async function migrateLegacyUsers() {
  try {
    const unmigratedUsers = await User.find({
      $or: [
        { userId: { $exists: false } },
        { userId: null },
        { userId: '' },
        { username: { $exists: false } },
        { username: null },
        { username: '' }
      ]
    });

    if (unmigratedUsers.length === 0) {
      return;
    }

    console.log(`[Migration] Found ${unmigratedUsers.length} user(s) missing userId or username. Starting backfill...`);
    let migratedCount = 0;

    for (const user of unmigratedUsers) {
      if (!user.userId) {
        user.userId = await generateUniqueUserId(User);
      }
      if (!user.username) {
        user.username = await generateUniqueUsername(User, user.name);
      }
      if (!user.name) {
        user.name = user.username;
      }
      if (!user.profileImageUrl) {
        user.profileImageUrl = generateDefaultAvatar(user.userId);
      }
      await user.save();
      migratedCount++;
    }

    console.log(`[Migration] Successfully migrated ${migratedCount} legacy user(s) with User IDs & Bingo Usernames.`);
  } catch (err) {
    console.error('[Migration Error] Failed to migrate legacy users:', err.message);
  }
}

module.exports = migrateLegacyUsers;

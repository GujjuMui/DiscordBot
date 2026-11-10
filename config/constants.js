// Frozen operational constants. Values are identical to the literals
// previously scattered through the codebase — this file only gives
// them names, it does not change any number or colour.
module.exports = Object.freeze({
    DEFAULT_PAGE_SIZE: 10,
    GALLERY_TTL_MS: 1800000, // 30 minutes — matches the gallery's shipped TTL
    COOLDOWN_MS: 3000,
    CACHE_TTL_MS: 60000, // 1 minute — settings / category / auto-reply caches

    // Gallery / menu state TTLs
    MENU_TTL_MS: 30 * 60 * 1000, // 30 minutes
    GALLERY_MAX_ITEMS: 200,
    GALLERY_MAX_ENTRIES: 500,

    // Cooldowns
    MEMBER_MAX_USES: 5,
    MEMBER_COOLDOWN_MS: 12 * 60 * 60 * 1000, // 12 hours
    AUTOREPLY_DEFAULT_COOLDOWN_MS: 43200000, // 12 hours
    AUTOREPLY_MAX_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours

    // Verification age gates
    VERIFY_MIN_ACCOUNT_AGE_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
    VERIFY_MIN_JOIN_AGE_MS: 5 * 60 * 1000, // 5 minutes

    // Spam / invites / collectors
    SPAM_MAX_PINGS: 1000,
    SPAM_DELAY_MS: 1000,
    SPAM_PROGRESS_EVERY: 50,
    INVITE_MAX_AGE_S: 3600, // 1 hour
    CONFIRM_TIMEOUT_MS: 60000,
    SETUP_STEP_DELAY_MS: 1500,

    COLORS: Object.freeze({
        PRIMARY: 0x2ecc71,
        ERROR: 0xe74c3c,
        INFO: 0x3498db,
        SUCCESS: 0x57f287,
        WARNING: 0xfee75c,
        BRAND: 0x5865f2,
        CARD: 0xff9900,
        ART: 0x8e44ad,
        LINK: 0x00b894
    })
});

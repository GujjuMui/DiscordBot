const MemberCooldownRepository = require("../repositories/MemberCooldownRepository");
const { MEMBER_MAX_USES: MAX_USES, MEMBER_COOLDOWN_MS: COOLDOWN_MS } = require("../config/constants");

// Atomic: a single findOneAndUpdate $inc upsert, so two concurrent
// /member calls can never both read uses=4 and both write uses=5.
// The old findOne + create + save sequence had exactly that race.
module.exports = async userId => {
    const now = new Date();

    // Reset an expired cooldown first (idempotent, single update).
    await MemberCooldownRepository.updateOne(
        { userId, cooldownUntil: { $ne: null, $lte: now } },
        { $set: { uses: 0, cooldownUntil: null } }
    ).catch(() => {});

    const data = await MemberCooldownRepository.findOneAndUpdate(
        { userId },
        {
            $inc: { uses: 1 },
            $setOnInsert: { cooldownUntil: null }
        },
        { upsert: true, new: true }
    );

    if (data.cooldownUntil && data.cooldownUntil > now) {
        // The $inc above already counted this attempt; roll it back
        // so a denied attempt does not consume a use.
        await MemberCooldownRepository.updateOne({ userId }, { $inc: { uses: -1 } }).catch(() => {});
        const remainingMs = data.cooldownUntil.getTime() - now.getTime();
        const hours = Math.floor(remainingMs / 3600000);
        const minutes = Math.floor((remainingMs % 3600000) / 60000);

        return {
            allowed: false,
            message:
                `⏱️ You have reached the limit of **${MAX_USES}** member commands.\n\nTry again in **${hours}h ${minutes}m**.`,
        };
    }

    let cooldownUntil = data.cooldownUntil;
    if (data.uses >= MAX_USES) {
        cooldownUntil = new Date(now.getTime() + COOLDOWN_MS);
        await MemberCooldownRepository.updateOne({ userId }, { $set: { cooldownUntil } }).catch(() => {});
    }

    return {
        allowed: true,
        uses: data.uses,
        remaining: Math.max(MAX_USES - data.uses, 0),
        cooldownStarted: cooldownUntil !== null,
    };
};

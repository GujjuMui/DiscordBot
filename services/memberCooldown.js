const MemberCooldown = require("../database/MemberCooldown");

const MAX_USES = 5;
const COOLDOWN_MS = 12 * 60 * 60 * 1000;

module.exports = async userId => {
    let data = await MemberCooldown.findOne({ userId });

    if (!data) {
        data = await MemberCooldown.create({
            userId,
            uses: 0,
            cooldownUntil: null,
        });
    }

    const now = new Date();

    if (data.cooldownUntil && data.cooldownUntil <= now) {
        data.uses = 0;
        data.cooldownUntil = null;
    }

    if (data.cooldownUntil && data.cooldownUntil > now) {
        const remainingMs = data.cooldownUntil.getTime() - now.getTime();
        const hours = Math.floor(remainingMs / 3600000);
        const minutes = Math.floor((remainingMs % 3600000) / 60000);

        return {
            allowed: false,
            message:
                `⏱️ You have reached the limit of **${MAX_USES}** member commands.\n\nTry again in **${hours}h ${minutes}m**.`,
        };
    }

    data.uses += 1;

    if (data.uses >= MAX_USES) {
        data.cooldownUntil = new Date(now.getTime() + COOLDOWN_MS);
    }

    await data.save();

    return {
        allowed: true,
        uses: data.uses,
        remaining: Math.max(MAX_USES - data.uses, 0),
        cooldownStarted: data.cooldownUntil !== null,
    };
};

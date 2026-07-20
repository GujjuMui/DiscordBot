const MemberCooldown = require("../database/MemberCooldown");

const MAX_USES = 5;
const COOLDOWN = 2 * 60 * 60 * 1000; // 2 hours

module.exports = async (userId) => {

    let data = await MemberCooldown.findOne({
        userId
    });

    if (!data) {

        data = await MemberCooldown.create({

            userId,

            uses: 0,

            cooldownUntil: null

        });

    }

    // ===========================
    // Cooldown expired
    // ===========================

    if (

        data.cooldownUntil &&
        data.cooldownUntil <= new Date()

    ) {

        data.uses = 0;

        data.cooldownUntil = null;

    }

    // ===========================
    // Still on cooldown
    // ===========================

    if (

        data.cooldownUntil &&
        data.cooldownUntil > new Date()

    ) {

        const remaining =
            data.cooldownUntil.getTime() - Date.now();

        const hours =
            Math.floor(remaining / 3600000);

        const minutes =
            Math.floor((remaining % 3600000) / 60000);

        return {

            allowed: false,

            message:
                `⏳ You have reached the limit of **${MAX_USES}** member commands.\n\nTry again in **${hours}h ${minutes}m**.`

        };

    }

    // ===========================
    // Count this usage
    // ===========================

    data.uses++;

    if (data.uses >= MAX_USES) {

        data.cooldownUntil =
            new Date(Date.now() + COOLDOWN);

    }

    await data.save();

    return {

        allowed: true,

        uses: data.uses,

        remaining: Math.max(
            MAX_USES - data.uses,
            0
        ),

        cooldownStarted:
            data.cooldownUntil !== null

    };

};
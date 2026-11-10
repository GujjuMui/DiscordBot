// Shared Discord safety helpers: replying to an interaction in whatever
// state it is in, permission/hierarchy pre-checks, and rate-limit-aware
// retries. Nothing here changes user-facing text — it only stops the
// bot from throwing (or silently failing) when Discord says no.
const { MessageFlags, PermissionsBitField } = require("discord.js");

const IGNORED_CODES = new Set([10062, 40060, 10008]);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Reply to an interaction safely, whatever state it is in:
//  - deferred  -> editReply
//  - replied   -> followUp (a second reply would throw 40060)
//  - fresh     -> reply
// Expired interactions (10062) and double-replies (40060) are swallowed;
// anything else is rethrown so the caller's error path still runs.
async function safeReply(interaction, payload) {
    if (!interaction) return false;
    try {
        if (interaction.deferred) {
            await interaction.editReply(payload);
        } else if (interaction.replied) {
            await interaction.followUp(payload);
        } else {
            await interaction.reply(payload);
        }
        return true;
    } catch (err) {
        if (IGNORED_CODES.has(err?.code)) return false;
        throw err;
    }
}

// True only if the bot can actually manage the role: it has
// ManageRoles and its highest role sits above the target role.
// Call this BEFORE roles.add/remove so failures are a clear message
// instead of a silent Discord 50013.
function canManageRole(botMember, role) {
    if (!botMember || !role) return false;
    if (!botMember.permissions?.has(PermissionsBitField.Flags.ManageRoles)) return false;
    const highest = botMember.roles?.highest;
    if (!highest) return false;
    return role.position < highest.position;
}

function assertTextChannel(channel) {
    return Boolean(
        channel &&
        typeof channel.isTextBased === "function" &&
        channel.isTextBased() &&
        channel.permissionsFor &&
        true
    );
}

// Retry a Discord/DB call with backoff. Honours Discord's own
// retry_after (seconds, on 429s) and stops immediately on 403/404
// (those will not succeed on retry). Returns the function's result.
async function retryWithBackoff(fn, { retries = 3, baseDelayMs = 1000 } = {}) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            const status = err?.status ?? err?.code;
            if (status === 403 || status === 404 || err?.code === 10003) break;
            if (attempt === retries) break;
            const retryAfterMs = err?.retry_after
                ? Math.ceil(err.retry_after * 1000)
                : baseDelayMs * 2 ** attempt;
            await sleep(Math.min(retryAfterMs, 30000));
        }
    }
    throw lastError;
}

// Run fn over items in chunks of `size`, waiting delayMs between
// chunks. Uses Promise.allSettled inside each chunk so one failure
// never aborts the rest; returns { results, failures }.
async function chunkedEach(items, size, fn, delayMs = 0) {
    const results = [];
    const failures = [];
    for (let i = 0; i < items.length; i += size) {
        const chunk = items.slice(i, i + size);
        const settled = await Promise.allSettled(chunk.map((item, index) => fn(item, i + index)));
        for (const [index, outcome] of settled.entries()) {
            if (outcome.status === "fulfilled") results.push(outcome.value);
            else failures.push({ item: chunk[index], error: outcome.reason });
        }
        if (delayMs > 0 && i + size < items.length) await sleep(delayMs);
    }
    return { results, failures };
}

// Log a labelled error with its stack — moved here from index.js so
// the entry point stays slim. Used by the interaction handlers.
function logError(label, error) {
    console.error("========== " + label + " ==========");
    console.error(error?.stack || error);
    console.error("=".repeat(label.length + 20));
}

// Send the generic error reply for a failed interaction — moved here
// from index.js, behaviour unchanged.
//  - deferred -> editReply (a deferred interaction cannot be replied to)
//  - replied  -> nothing (there is nothing left to answer with)
//  - fresh    -> ephemeral reply
// respondToDeferred=false is kept for button handlers, whose
// interactions were already answered with an update: a deferred
// button must NOT be answered again. Select/modal handlers pass
// true (the default) so a deferred select/modal still gets its
// error editReply instead of failing silently.
async function replyWithError(interaction, respondToDeferred = true) {
    try {
        if (interaction.deferred) {
            if (!respondToDeferred) return;
            await interaction.editReply({ content: "❌ Something went wrong." });
        } else if (!interaction.replied) {
            await interaction.reply({
                content: "❌ Something went wrong.",
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        // Silently ignore expired interactions (10062 = Unknown interaction)
        if (error.code === 10062) return;
        // A deferred component update that was already answered raises
        // 40060 — fall back to a followUp if one is available.
        if (error.code === 40060 && typeof interaction.followUp === "function") {
            try {
                await interaction.followUp({
                    content: "❌ Something went wrong.",
                    flags: MessageFlags.Ephemeral
                });
                return;
            } catch (followUpError) {
                if (followUpError.code === 10062) return;
                console.error("Failed to send error message:");
                console.error(followUpError);
                return;
            }
        }
        console.error("Failed to send error message:");
        console.error(error);
    }
}

module.exports = {
    safeReply,
    canManageRole,
    assertTextChannel,
    retryWithBackoff,
    chunkedEach,
    sleep,
    logError,
    replyWithError
};

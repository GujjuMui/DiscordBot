// Mathematical Bold Script lettering for auto-created role names.
//
// Every role the bot creates fresh gets an emoji prefix plus its name
// in this one font, so created roles look consistent in the role list.
// Letters A–Z / a–z are replaced; everything else (emoji, spaces,
// punctuation, digits) passes through unchanged.
//
// Roles that already exist keep their current names — styling applies
// only when the bot creates a role. Trade-off, stated plainly:
// Discord search matches plain text, so a styled name like
// "𝓜𝓮𝓶𝓫𝓮𝓻" does NOT match a search for "Member".
//
// (Mapping below is written out literally, not computed, because
// three capitals live outside the main script block: E is ℰ U+2130,
// G is 𝒢 U+1D4A2, O is 𝒪 U+1D4AA.)

const PLAIN_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const STYLED_UPPER = "𝓐𝓑𝓒𝓓ℰ𝓕𝒢𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝒪𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩";
const PLAIN_LOWER = "abcdefghijklmnopqrstuvwxyz";
const STYLED_LOWER = "𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃";

const MAP = new Map();
for (let i = 0; i < PLAIN_UPPER.length; i++) {
    MAP.set(PLAIN_UPPER[i], [...STYLED_UPPER][i]);
    MAP.set(PLAIN_LOWER[i], [...STYLED_LOWER][i]);
}

function toScript(text) {
    return [...String(text ?? "")].map(ch => MAP.get(ch) ?? ch).join("");
}

module.exports = { toScript };

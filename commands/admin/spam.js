const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const spamManager = require("../../services/spamManager");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("spam")

        .setDescription("Spam ping a single user (Owner Only)")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to ping")
                .setRequired(true)
        )

        .addIntegerOption(option =>
            option
                .setName("count")
                .setDescription("Number of pings (Max 1000)")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1000)
        )

        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Optional message")
                .setRequired(false)
        ),

    async execute(interaction) {

        await interaction.deferReply({
    flags: MessageFlags.Ephemeral
});

        // Owner Only
        if (interaction.user.id !== "1466871611893219455") {

            return interaction.editReply({

                content: "❌ Only the bot owner can use this command.",

            });

        }

        if (spamManager.isRunning()) {

   return interaction.editReply({

        content: "❌ A spam session is already running.",

    });

}

        const user = interaction.options.getUser("user");


        if (user.bot) {

    return interaction.editReply({

        content: "❌ You cannot spam another bot."

    });

}

        const count = interaction.options.getInteger("count");

        const message =
            interaction.options.getString("message") || "";

        const channel = interaction.channel;

        await interaction.editReply({

            content:
            `✅ Spam started.

            👤 Target: ${user.tag}
            🔢 Count: ${count}
            💬 Message: ${message || "None"}`,

        })

        spamManager.start();

        console.log(`🚀 Starting spam for ${user.tag}`);

    for (let i = 0; i < count; i++) {

        console.log("Loop:", i);
    
    if (!spamManager.isRunning()) {

        console.log("🛑 Spam manually stopped.");

        break;

    }

    try {

        await channel.send(`${user} ${message}`);

    } catch (err) {

        console.error(`❌ Failed to send spam message ${i + 1}/${count}`);
        console.error(err);

    }

    if ((i + 1) % 50 === 0) {

        console.log(`📨 Spam Progress: ${i + 1}/${count}`);

    }

    await new Promise(resolve =>
        setTimeout(resolve, 1000)
    );

}

spamManager.stop();

console.log("✅ Spam finished.");

    }

};
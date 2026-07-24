require("dotenv").config();

const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

const cloudinary = require("./utils/cloudinary");

const Card = require("./database/Card");
const Art = require("./database/Art");

const MONGO_URI =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL;

if (!MONGO_URI) {
    console.error("❌ MongoDB URI not found in .env");
    process.exit(1);
}

async function uploadIfNeeded(document, type) {

    if (!document.imageFile)
        return "skipped";

    if (document.imageFile.startsWith("http"))
        return "skipped";

    const folder =
        type === "cards"
            ? "uploads/cards"
            : "uploads/arts";

    const localPath = path.join(
        __dirname,
        folder,
        document.imageFile
    );

    if (!fs.existsSync(localPath)) {

        console.log(`⚠ Missing file: ${localPath}`);

        return "missing";

    }

    try {

        const result =
            await cloudinary.uploader.upload(
                localPath,
                {
                    folder: `hornet/${type}`,
                    public_id: path.parse(document.imageFile).name,
                    overwrite: true,
                    resource_type: "image"
                }
            );

        document.imageFile = result.secure_url;

        await document.save();

        console.log(`✔ ${document.imageFile}`);

        return "success";

    } catch (err) {

        console.log(
            `❌ Failed: ${document.imageFile}`
        );

        console.error(err.message);

        return "failed";

    }

}

(async () => {

    await mongoose.connect(MONGO_URI);

    console.log("Connected to MongoDB\n");

    let migrated = 0;
    let skipped = 0;
    let failed = 0;
    let missing = 0;

    const cards = await Card.find();

    console.log(`Cards: ${cards.length}\n`);

    for (let i = 0; i < cards.length; i++) {

        process.stdout.write(
            `[Card ${i + 1}/${cards.length}] `
        );

        const result =
            await uploadIfNeeded(
                cards[i],
                "cards"
            );

        if (result === "success") migrated++;
        if (result === "skipped") skipped++;
        if (result === "failed") failed++;
        if (result === "missing") missing++;

    }

    const arts = await Art.find();

    console.log(`\nArts: ${arts.length}\n`);

    for (let i = 0; i < arts.length; i++) {

        process.stdout.write(
            `[Art ${i + 1}/${arts.length}] `
        );

        const result =
            await uploadIfNeeded(
                arts[i],
                "arts"
            );

        if (result === "success") migrated++;
        if (result === "skipped") skipped++;
        if (result === "failed") failed++;
        if (result === "missing") missing++;

    }

    console.log("\n==========================");
    console.log("Migration Complete");
    console.log("==========================");
    console.log(`Uploaded : ${migrated}`);
    console.log(`Skipped  : ${skipped}`);
    console.log(`Missing  : ${missing}`);
    console.log(`Failed   : ${failed}`);

    await mongoose.disconnect();

})();
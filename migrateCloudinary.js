require("dotenv").config();

const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

const cloudinary = require("./utils/cloudinary");
const config = require("./config/config");
const { chunkedEach } = require("./utils/discord");

const CardRepository = require("./repositories/CardRepository");
const ArtRepository = require("./repositories/ArtRepository");

// MONGO_URI is canonical — config.mongoUri reads it (see config.js).
const MONGO_URI = config.mongoUri;

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
                    folder: `${config.cloudinary.folderPrefix}/${type}`,
                    public_id: path.parse(document.imageFile).name,
                    overwrite: true,
                    resource_type: "image"
                }
            );

        return { status: "success", url: result.secure_url };

    } catch (err) {

        console.log(
            `❌ Failed: ${document.imageFile}`
        );

        console.error(err.message);

        return { status: "failed" };

    }

}

async function migrate(repository, type, idField) {
    // listAll() returns lean documents, oldest first.
    const docs = await repository.listAll();

    console.log(`${type}: ${docs.length}\n`);

    const counts = { success: 0, skipped: 0, failed: 0, missing: 0 };
    const updates = []; // bulkWrite operations, applied once at the end

    await chunkedEach(docs, 3, async doc => {
        const result = await uploadIfNeeded(doc, type);
        const status = typeof result === "string" ? result : result.status;
        counts[status] = (counts[status] || 0) + 1;
        if (status === "success") {
            updates.push({
                updateOne: {
                    filter: { [idField]: doc[idField] },
                    update: { $set: { imageFile: result.url } }
                }
            });
        }
    });

    if (updates.length) {
        await repository.bulkWrite(updates);
        console.log(`✔ Updated ${updates.length} ${type} records in bulk.`);
    }

    return counts;
}

(async () => {

    await mongoose.connect(MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
    });

    console.log("Connected to MongoDB\n");

    const cardCounts = await migrate(CardRepository, "cards", "cardId");
    const artCounts = await migrate(ArtRepository, "arts", "artId");

    const migrated = cardCounts.success + artCounts.success;
    const skipped = cardCounts.skipped + artCounts.skipped;
    const failed = cardCounts.failed + artCounts.failed;
    const missing = cardCounts.missing + artCounts.missing;

    console.log("\n==========================");
    console.log("Migration Complete");
    console.log("==========================");
    console.log(`Uploaded : ${migrated}`);
    console.log(`Skipped  : ${skipped}`);
    console.log(`Missing  : ${missing}`);
    console.log(`Failed   : ${failed}`);

    await mongoose.disconnect();

})();

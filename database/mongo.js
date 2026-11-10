const mongoose = require("mongoose");

async function connectMongo() {
    try {
        // Pool options only — the URI itself comes from MONGO_URI
        // unchanged, and is never logged (it may contain a password).
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });

        console.log("✅" + " Connected to MongoDB");
    } catch (err) {
        console.error("❌" + " MongoDB Connection Failed");
        console.error(err);
        process.exit(1);
    }
}

module.exports = connectMongo;

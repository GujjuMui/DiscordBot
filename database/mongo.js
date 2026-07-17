const mongoose = require("mongoose");

async function connectMongo() {
    try {
        console.log(process.env.MONGO_URI);
await mongoose.connect(process.env.MONGO_URI);

        console.log("✅ Connected to MongoDB");
    } catch (err) {
        console.error("❌ MongoDB Connection Failed");
        console.error(err);
        process.exit(1);
    }
}

module.exports = connectMongo;
const mongoose = require("mongoose");
const settings = require("../config/settings");

async function connectMongo() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("✅" + " Connected to MongoDB");
    } catch (err) {
        console.error("❌" + " MongoDB Connection Failed");
        console.error(err);
        process.exit(1);
    }
}

module.exports = connectMongo;

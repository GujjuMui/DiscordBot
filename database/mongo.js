const mongoose = require("mongoose");
const settings = require("../config/settings");

async function connectMongo() {
    try {
        console.log(process.env.MONGO_URI);
await mongoose.connect(process.env.MONGO_URI);

        console.log(settings.emojis.check + " Connected to MongoDB");
    } catch (err) {
        console.error(settings.emojis.cross + " MongoDB Connection Failed");
        console.error(err);
        process.exit(1);
    }
}

module.exports = connectMongo;
const Art = require("../database/Art");

class ArtRepository {
    async findByCode(code) {
        return await Art.findOne({ code }).lean();
    }

    async create(data) {
        const art = new Art(data);
        return await art.save();
    }

    async update(code, updateData) {
        return await Art.findOneAndUpdate({ code }, updateData, { new: true }).lean();
    }

    async delete(code) {
        return await Art.findOneAndDelete({ code }).lean();
    }

    async findAll(limit = 100) {
        return await Art.find({}).limit(limit).lean();
    }
}

module.exports = new ArtRepository();

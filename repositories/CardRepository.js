const Card = require("../database/Card");

class CardRepository {
    async findByCode(code) {
        return await Card.findOne({ code }).lean();
    }

    async create(data) {
        const card = new Card(data);
        return await card.save();
    }

    async update(code, updateData) {
        return await Card.findOneAndUpdate({ code }, updateData, { new: true }).lean();
    }

    async delete(code) {
        return await Card.findOneAndDelete({ code }).lean();
    }

    async findAll(limit = 100) {
        return await Card.find({}).limit(limit).lean();
    }
}

module.exports = new CardRepository();

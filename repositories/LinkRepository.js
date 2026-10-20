const Link = require("../models/Link");

class LinkRepository {
    async findByTitle(title) {
        return await Link.findOne({ title }).lean();
    }

    async create(data) {
        const link = new Link(data);
        return await link.save();
    }

    async delete(title) {
        return await Link.findOneAndDelete({ title }).lean();
    }

    async findAll() {
        return await Link.find({}).lean();
    }
}

module.exports = new LinkRepository();

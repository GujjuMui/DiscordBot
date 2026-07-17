const fs = require("fs/promises");
const path = require("path");

module.exports = async function saveImage(
    attachment,
    folder,
    fileName
) {

    const response = await fetch(attachment.url);

    if (!response.ok) {
        throw new Error("Failed to download image.");
    }

    const buffer = Buffer.from(
        await response.arrayBuffer()
    );

    const extension =
        path.extname(attachment.name) || ".png";

    const file = `${fileName}${extension}`;

    const fullPath = path.join(
        process.cwd(),
        "uploads",
        folder,
        file
    );

    await fs.writeFile(fullPath, buffer);

    return file;

};
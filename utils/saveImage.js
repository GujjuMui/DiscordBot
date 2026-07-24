const fs = require("fs/promises");
const path = require("path");
const cloudinary = require("./cloudinary");

module.exports = async function saveImage(attachment, folder, fileName) {

    const response = await fetch(attachment.url);

    if (!response.ok)
        throw new Error("Failed to download image.");

    const buffer = Buffer.from(
        await response.arrayBuffer()
    );

    const tempDir = path.join(process.cwd(), "temp");

    await fs.mkdir(tempDir, { recursive: true });

    const extension =
        path.extname(attachment.name) || ".png";

    const tempFile = path.join(
        tempDir,
        `${fileName}${extension}`
    );

    await fs.writeFile(tempFile, buffer);

    try {

        const result = await cloudinary.uploader.upload(
            tempFile,
            {
                folder: `hornet/${folder}`,
                public_id: fileName,
                overwrite: true,
                resource_type: "image"
            }
        );

        await fs.unlink(tempFile);

        return result.secure_url;

    } catch (err) {

        await fs.unlink(tempFile).catch(() => {});

        throw err;

    }

};
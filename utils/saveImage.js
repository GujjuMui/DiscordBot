const cloudinary = require("./cloudinary");
const config = require("../config/config");

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const FETCH_TIMEOUT_MS = 10000; // 10 s

// Stream the attachment straight into Cloudinary's upload stream —
// the old version wrote the image to a temp file on disk first and
// deleted it afterwards, which was slower and leaked files on crash.
// Returns the Cloudinary secure_url, exactly as before.
module.exports = async function saveImage(attachment, folder, fileName) {
    if (!attachment?.url) {
        throw new Error("Image attachment URL is missing.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response;
    try {
        response = await fetch(attachment.url, { signal: controller.signal });
    } catch (err) {
        clearTimeout(timeout);
        if (err?.name === "AbortError") {
            throw new Error("Image download timed out after 10 seconds.");
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        throw new Error(`Failed to download image (HTTP ${response.status}).`);
    }

    const contentLength = Number(response.headers?.get?.("content-length"));
    if (contentLength > MAX_IMAGE_BYTES) {
        throw new Error("Image is larger than the 10 MB limit.");
    }

    // Stream the body into Cloudinary without buffering the whole
    // file in memory or on disk. Node's fetch body is a web ReadableStream;
    // convert it to a Node stream for upload_stream.
    const { Readable } = require("node:stream");
    const nodeStream = response.body ? Readable.fromWeb(response.body) : null;
    if (!nodeStream) throw new Error("Image download returned no body.");

    let downloaded = 0;
    nodeStream.on("data", chunk => {
        downloaded += chunk.length;
        if (downloaded > MAX_IMAGE_BYTES) nodeStream.destroy(new Error("Image is larger than the 10 MB limit."));
    });

    return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
            {
                folder: `${config.cloudinary.folderPrefix}/${folder}`,
                public_id: fileName,
                overwrite: true,
                resource_type: "image"
            },
            (err, result) => {
                if (err) return reject(err);
                resolve(result.secure_url);
            }
        );
        nodeStream.on("error", reject);
        nodeStream.pipe(upload);
    });
};

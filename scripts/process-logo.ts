
import fs from "fs";
import { Jimp } from "jimp";
import path from "path";

const TARGETS = [
    { name: "favicon.ico", size: 32 },
    { name: "logo.png", size: 512 },
    { name: "icon.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "android-chrome-192x192.png", size: 192 },
    { name: "android-chrome-512x512.png", size: 512 },
];

async function processAndGenerate() {
    console.log("Starting advanced logo processing (Robust Mode)...");

    const rawPath = path.join(process.cwd(), "public", "vanguard_raw.png");
    const deployPath = path.join(process.cwd(), "public", "logo.png");

    if (!fs.existsSync(rawPath)) {
        console.error("Raw logo file not found at:", rawPath);
        process.exit(1);
    }

    try {
        console.log("Reading raw image...");
        // Jimp v1: Jimp.read returns a promise resolving to the image class instance
        const image = await Jimp.read(rawPath);

        console.log("Processing transparency...");

        // Scan and replace black pixels with transparent ones
        // In Jimp v1, scan iterator might be slightly different but usually (x, y, idx)
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x: number, y: number, idx: number) => {
            const red = image.bitmap.data[idx + 0];
            const green = image.bitmap.data[idx + 1];
            const blue = image.bitmap.data[idx + 2];

            // Threshold for "blackness"
            if (red < 30 && green < 30 && blue < 30) {
                image.bitmap.data[idx + 3] = 0; // Set alpha to 0 (transparent)
            }
        });

        console.log("Saving transparent master logo...");

        // Robust Save: Get buffer and write with fs
        // "image/png" MIME type
        const buffer = await image.getBuffer("image/png");
        fs.writeFileSync(deployPath, buffer);
        console.log("Saved logo.png");

        // 2. Generate variants
        console.log("Generating variants...");
        for (const target of TARGETS) {
            if (target.name === "logo.png") continue; // Already saved

            const destPath = path.join(process.cwd(), "public", target.name);
            const icon = image.clone();

            if (target.size !== 512) {
                icon.resize({ w: target.size, h: target.size });
            }

            const iconBuffer = await icon.getBuffer("image/png");
            fs.writeFileSync(destPath, iconBuffer);
            console.log(`Generated: ${target.name}`);
        }

        console.log("Success! Transparency applied and icons updated.");

    } catch (err) {
        console.error("Critical error processing logo:", err);
        process.exit(1);
    }
}

processAndGenerate();

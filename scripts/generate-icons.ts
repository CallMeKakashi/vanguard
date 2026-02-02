
import fs from "fs";
import { Jimp } from "jimp";
import path from "path";

const TARGETS = [
    { name: "favicon.ico", size: 32 }, // Standard favicon
    { name: "logo.png", size: 512 },   // Ensure source is clean PNG
    { name: "icon.png", size: 512 },   // Electron icon source
    { name: "apple-touch-icon.png", size: 180 },
    { name: "android-chrome-192x192.png", size: 192 },
    { name: "android-chrome-512x512.png", size: 512 },
];

async function generate() {
    console.log("Starting icon generation...");
    const sourcePath = path.join(process.cwd(), "public", "logo.png");

    try {
        // Load the image (Jimp auto-detects format even if extension is wrong)
        const image = await Jimp.read(sourcePath);
        console.log("Source image loaded successfully.");

        for (const target of TARGETS) {
            const destPath = path.join(process.cwd(), "public", target.name as string);

            // Clone, resize, and write
            const icon = image.clone();
            if (target.size !== 512) {
                icon.resize({ w: target.size, h: target.size });
            }

            await icon.write(destPath);
            console.log(`Generated: ${target.name} (${target.size}x${target.size})`);
        }

        console.log("All icons generated successfully!");
    } catch (error) {
        console.error("Error generating icons:", error);
        // Fallback: If logo.png causes error, try to read it as buffer first
    }
}

generate();

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function convertIcons() {
    const sizes = [16, 48, 128];
    const inputFile = path.join(__dirname, 'images', 'icon.svg');

    for (const size of sizes) {
        const outputFile = path.join(__dirname, 'images', `icon${size}.png`);
        await sharp(inputFile)
            .resize(size, size)
            .png()
            .toFile(outputFile);
        console.log(`Created icon${size}.png`);
    }
}

convertIcons().catch(console.error);


import vision from '@google-cloud/vision';
import npath from 'path';
import fs from 'fs';
import { program } from 'commander';

type Metadata = {
    id: string,
    name: string,
    annotation: string,
    ext: string,
};

program.parse();

const client = new vision.ImageAnnotatorClient();
const ocr = async (path: string): Promise<string> => {
    const [result] = await client.textDetection(path);
    const textAnnotations = result.fullTextAnnotation;
    if (!textAnnotations) {
        console.log("no detections found");
        return "-";
    }
    console.log(textAnnotations.text);
    return textAnnotations.text ?? "-";
}

const main = (async () => {
    const libraryPath = program.args[0];
    if (!fs.existsSync(libraryPath)) {
        throw new Error(`Library not found: ${program.args[0]}`);
    }

    const imageDir = npath.resolve(libraryPath, "images");
    if (!fs.existsSync(imageDir)) {
        throw new Error(`Image dir not found: ${imageDir}`);
    }

    for (let id of fs.readdirSync(imageDir, { withFileTypes: true })) {
        if (!id.isDirectory() || !id.name.includes(".info")) {
            continue;
        }
        const metadataPath = npath.resolve(imageDir, id.name, "metadata.json");
        const metadata = JSON.parse(fs.readFileSync(metadataPath).toString()) as Metadata;

        console.log(`processing ${metadata.name}...`);
        if (metadata.annotation !== "") {
            console.log("annotation found, skipping...");
            continue;
        }

        const imagePath = npath.resolve(imageDir, id.name, `${metadata.name}.${metadata.ext}`);

        const ocrResult = await ocr(imagePath);
        metadata.annotation = ocrResult;
        fs.writeFileSync(metadataPath, JSON.stringify(metadata));
    }
});

main();

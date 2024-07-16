const fs = require('fs');
const { workerData, parentPort } = require("worker_threads");
const { formatText, analyzeText } = require('.')

/**
 * Processes a list of files, filters out invalid files, and analyzes text content.
 * @returns {Promise<void>} - Posts a message to the parent thread with invalid files and their sequences
 */

async function processAndAnalyzeFiles() {
    const invalidFiles = []
    const sequences = []
    for (const file of workerData.files) {
        if (!file.endsWith('.txt')) {
            invalidFiles.push(file)
            continue
        }
        const data = await fs.promises.readFile(file, 'utf8');
        const formattedText = formatText(data)

        sequences.push({ file, sequences: analyzeText(formattedText) })
    }
    parentPort.postMessage({ invalidFiles, sequences });
}

processAndAnalyzeFiles().catch(err => {
    console.error(err);
    process.exit(1);
});

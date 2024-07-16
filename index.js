#!/usr/bin/env node

const fs = require('fs');
const yargs = require('yargs');
const readline = require('readline');
const { Worker, isMainThread } = require("worker_threads");
const path = require('path');
const os = require('os');

/**
 * Processes command line arguments handling file or stdin input
 */
async function main() {
    const argv = yargs
        .option('files', {
            alias: 'f',
            type: 'array',
            description: 'List of files to process',
        })
        .option('threads', {
            alias: 't',
            type: 'number',
            description: 'Number of threads to use.',
        })
        .example('$0 -f file1.txt file2.txt', 'Process text from file1.txt and file2.txt')
        .example('$0 -f file1.txt file2.txt', 'Process text from file1.txt and file2.txt outputting a single list')
        .example('$0 -f file1.txt file2.txt -t 2', 'Process text from file1.txt and file2.txt using 2 threads ouputting list for each file')
        .example('cat file1.txt | $0', 'Process text from standard input')
        .help('help')
        .alias('help', 'h')
        .argv;

    const MAX_THREADS = os.cpus().length

    if (argv.threads > MAX_THREADS) {
        console.log(`WARNING: Maximum of ${MAX_THREADS} allowed. The program will run using ${MAX_THREADS} instead of ${argv.threads}`)
    }

    if (Number.isNaN(argv.threads)) {
        console.log(`Invalid argument for -t. Using default number of threads.`)
    }

    const THREAD_COUNT = !!argv.threads && !Number.isNaN(argv.threads) ? Math.min(Math.round(argv.threads), MAX_THREADS) : 1

    if (!!argv._.length && !argv.files) {
        // User specified file path without providing -f or --files
        throw new Error('Input given without specifying --files (-f) option.')
    }
    let topSequences = []
    if (argv.files && argv.files.length > 0) {
        // Read from arguments
        topSequences = !!argv.threads ? await processFilesInParallel(argv.files, THREAD_COUNT) : await processFilesAsOne(argv.files)
    } else {
        // Read from stdin
        const text = await processStdIn()
        topSequences.push({ file: 'stdin', sequences: analyzeText(text) })
    }

    // Log the results
    logSequences(topSequences)
}

/**
 * Logs the top sequences
 * @param {Array} topSequences - Array of objects containing file and sequences
 */
function logSequences(topSequences) {
    topSequences.forEach((ts, index) => {
        if (ts.sequences.length) {
            console.log(`\n******************* TOP SEQUENCES: ${ts.file} *****************\n`)

            ts.sequences.slice(0, 100).forEach(([sequence, frequency], index) => {
                console.log(`${index + 1}. ${sequence} - ${frequency}`);
            })
        } else {
            console.log('\n******************* NO SEQUENCES FOUND *****************\n')
        }
    });
}


/**
 * Creates a worker for processing files in parallel
 * @param {Array} fileChunk - Chunk of files to process
 * @returns {Promise} - Promise resolving with the worker's result
 */
function createWorker(fileChunk) {
    return new Promise(function (resolve, reject) {
        const worker = new Worker(path.resolve(__dirname, 'process_analyze_files.js'), { workerData: { files: fileChunk } });

        worker.on("message", (data) => {
            resolve(data);
        });
        worker.on("error", (msg) => {
            reject(`An error ocurred: ${msg}`);
        });
    });
}

/**
 * Analyzes text and return the top sequences
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of top sequences with their frequencies
 */
function analyzeText(text) {
    const sequenceMap = generateSequenceMap(text);
    return getTopSequences(sequenceMap);
}

/**
 * Processes text input from stdin
 * @returns {Promise<string>} - Promise resolving with the processed text
 */
async function processStdIn() {
    let text = ''

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    for await (const line of rl) {
        text += ` ${formatText(line)}`;
    }

    return text.trim()
}


/**
 * Processes files using N threads
 * @param {Array} files - Array of file paths
 * @returns {Array} - Top sequences from all files
 */
async function processFilesAsOne(files) {
    let text = '';
    let invalidFiles = []
    for (const file of files) {
        if (!file.endsWith('.txt')) {
            invalidFiles.push(file)
            continue
        }
        const data = await fs.promises.readFile(file, 'utf8');
        text += ` ${formatText(data)}`;
    }
    const analyzedText = analyzeText(text.trim())
    if (invalidFiles.length) {
        console.log(`Invalid input: ${invalidFiles.join(', ')}\nThis program only accepts .txt files.`)
    }
    const topSequences = [{ file: files, sequences: analyzedText }]

    return topSequences
}


/**
 * Processes files using N threads
 * @param {Array} files - Array of file paths
 * @param {number} threadCount - Number of threads to use
 * @returns {Array} - Top sequences from all files
 */
async function processFilesInParallel(files, threadCount) {
    const fileChunks = splitArrayToNChunks(files, threadCount)
    let topSequencesPromises = fileChunks.map(chunk => createWorker(chunk));
    const fileOutput = await Promise.all(topSequencesPromises)

    const invalidFiles = []
    const topSequences = []
    fileOutput.forEach(ts => {
        invalidFiles.push(...ts.invalidFiles);
        ts.sequences.forEach(s => topSequences.push({ file: s.file, sequences: s.sequences }))
    });

    if (invalidFiles.length) {
        console.log(`Invalid input: ${invalidFiles.join(', ')}\nThis program only accepts .txt files.`)
    }

    return topSequences
}

/**
 * Splits an array into N chunks
 * @param {Array} array - Array to split
 * @param {number} n - Number of chunks
 * @returns {Array} - Array of N chunks
 */
function splitArrayToNChunks(array = [], n) {
    const splitArray = [];
    let arrPos = 0;
    for (let i = 0; i < n; i++) {
        const splitArrayLength = Math.ceil((array.length - arrPos) / (n - i));
        splitArray.push([]);
        splitArray[i] = array.slice(arrPos, splitArrayLength + arrPos);
        arrPos += splitArrayLength;
    }
    return splitArray
}

/**
 * Formats text to be lowercase and without punctuation or extra white space. Preserves apostrophes and hyphens. Replaces new lines with a spaces. Supports unicode.
 * @param {string} text - Text to format
 * @returns {string} - Formatted text
 */
function formatText(text) {
    return text.toLowerCase()                           // Convert to lowercase
        .replace(/[\n]/g, ' ')                          // Replace new lines with spaces
        .replace(/[^\p{Letter}\p{Mark}\s ' -]/gu, " ")  // Remove characters that are not letters, marks, apostrophes, or hyphens with support for unicode
        .replace(/\s+'\s+/g, ' ')                       // Remove unnecessary apostrophes surrounded by whitespace
        .replace(/\s+/g, ' ')                           // Replace multiple spaces with a single space
        .trim();
}

/**
 * Generates frequency map of three-word sequences
 * @param {string} text - Text to analyze
 * @returns {Map} - Map of sequences and their frequencies
 */
function generateSequenceMap(text) {
    const sequenceMap = new Map();
    const textArray = text.split(" ")

    for (let leftIndex = 0; leftIndex < textArray.length; leftIndex++) {
        const sequenceArray = textArray.slice(leftIndex, leftIndex + 3)

        if (sequenceArray.length < 3) {
            break
        }

        const sequenceText = sequenceArray.join(' ')
        if (sequenceMap.has(sequenceText)) {
            sequenceMap.set(sequenceText, sequenceMap.get(sequenceText) + 1)
        } else {
            sequenceMap.set(sequenceText, 1)
        }
    }

    return sequenceMap;
}

/**
 * Returns matrix of sequences and frequencies sorted by frequency in descending order
 * @param {Map} sequenceMap - Map of sequences and their frequencies
 * @returns {Array} - Array of sequences and their frequencies sorted in descending order
 */
function getTopSequences(sequenceMap) {
    return Array.from(sequenceMap, ([key, value]) => ([key, value])).sort((a, b) => b[1] - a[1])
}

// Main thread execution
if (isMainThread) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = {
    main,
    formatText,
    generateSequenceMap,
    getTopSequences,
    analyzeText,
    splitArrayToNChunks
};


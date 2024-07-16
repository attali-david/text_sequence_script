const { formatText, generateSequenceMap, getTopSequences, splitArrayToNChunks } = require('../index.js')
const { execFile, exec } = require('child_process')

describe('Unit tests', () => {
    test('should normalize text by removing punctuation, handling case insensitivity, and replacing new lines with spaces', () => {
        const input = "This is a test.\nNew line, (~!@#$$%^&*()_+{}|:<,>.?1;punctuation), isn't! the white whale's state-of-the-art";

        const expectedOutput = "this is a test new line punctuation isn't the white whale's state-of-the-art";

        expect(formatText(input)).toBe(expectedOutput);
    });

    test('should handle apostrophes', () => {
        const input = " ' isn't 'tis shoes' who's ' ";
        const expectedOutput = "isn't 'tis shoes' who's";

        expect(formatText(input)).toBe(expectedOutput);
    });

    test('should handle stray hyphens', () => {
        const input = " The  White  Whale— the  White Whale! whale-ship"
        const expectedOutput = "the white whale the white whale whale-ship";

        expect(formatText(input)).toBe(expectedOutput);
    });

    test('should generate a frequency map of three-word sequences from text', () => {
        const input = "this is a simple example of sliding window";
        const expectedOutput = new Map([
            ["this is a", 1],
            ["is a simple", 1],
            ["a simple example", 1],
            ["simple example of", 1],
            ["example of sliding", 1],
            ["of sliding window", 1]
        ]);
        expect(generateSequenceMap(input)).toEqual(expectedOutput);
    });

    test('should count the frequency of three-word sequences', () => {
        const input = "this is a simple example of sliding window this is a";
        const expectedOutput = new Map([
            ["this is a", 2],
            ["is a simple", 1],
            ["a simple example", 1],
            ["simple example of", 1],
            ["example of sliding", 1],
            ["of sliding window", 1],
            ["sliding window this", 1],
            ["window this is", 1]
        ]);

        expect(generateSequenceMap(input)).toEqual(expectedOutput);
    });

    test('should normalize text by removing punctuation, handling case insensitivity, replacing hyphens with spaces, and replacing new lines with spaces', () => {
        const input = "I love\nsandwiches.(I LOVE SANDWICHES!!)";
        const expectedOutput = "i love sandwiches i love sandwiches";
        expect(formatText(input)).toBe(expectedOutput);
    });

    test('should handle unicode characters correctly', () => {
        const input = '"(! ,ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß-àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ;)"';
        const expectedOutput = "àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþß-àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ";
        expect(formatText(input)).toBe(expectedOutput);
    });

    test('should return the top 100 three-word sequences sorted by frequency', () => {
        const input = new Map([
            ["is a simple", 10],
            ["a simple example", 3],
            ["simple example of", 4],
            ["example of sliding", 111],
            ["this is a", 2],
            ["of sliding window", 11]
        ]);

        const expectedOutput = [
            ["example of sliding", 111],
            ["of sliding window", 11],
            ["is a simple", 10],
            ["simple example of", 4],
            ["a simple example", 3],
            ["this is a", 2],
        ];

        expect(getTopSequences(input)).toEqual(expect.arrayContaining(expectedOutput));
    });

    test('splits array into 2 chunks', () => {
        const array = [1, 2, 3, 4, 5];
        const result = splitArrayToNChunks(array, 2);
        expect(result).toEqual([[1, 2, 3], [4, 5]]);
    });

    test('splits array into 3 chunks', () => {
        const array = [1, 2, 3, 4, 5];
        const result = splitArrayToNChunks(array, 3);
        expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });
})


describe('Command Line Execution', () => {
    test('should execute index.js without file option', (done) => {
        execFile('node', ['../index.js', 'inputs/short.txt'], { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                expect(stderr).toContain('Input given without specifying --files (-f) option.');
                done();
            } else {
                done(new Error('Expected error, but none was thrown.'));
            }
        });
    });

    test('should execute index.js with a valid thread count', (done) => {
        execFile('node', ['../index.js', '-f', 'inputs/echoes.txt', '-t', 2], { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                done(error);
            } else {
                expect(stdout).toContain("quiet quiet night - 4");
                expect(stdout).toContain("in the night - 4");
                expect(stdout).toContain("the night night - 4");
                expect(stdout).toContain("night night night - 4");
                expect(stdout).toContain("light in the - 2");

                done();
            }
        });
    });

    test('should execute index.js with invalid thread argument', (done) => {
        execFile('node', ['../index.js', '-f', 'inputs/echoes.txt', '-t', 'invalid'], { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                done(error);
            } else {
                expect(stdout).toContain('Invalid argument for -t. Using default number of threads.');
                done();
            }
        });
    });

    test('should execute index.js with an invalid thread count', (done) => {
        execFile('node', ['../index.js', '-f', 'inputs/short.txt', '-t', 5000], { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                done(error);
            } else {
                expect(stdout).toContain('WARNING');
                done();
            }
        });
    });

    test('should execute index.js with file input', (done) => {
        execFile('node', ['../index.js', '-f', 'inputs/short.txt'], { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                done(error);
            } else {
                expect(stdout).toContain('one two three - 3');
                expect(stdout).toContain('two three one - 1');
                expect(stdout).toContain('three one two - 1');
                expect(stdout).toContain('three zero one - 1');

                done();
            }
        });
    });

    test('should execute index.js with an invalid input', (done) => {
        execFile('node', ['../index.js', '-f', 'inputs/invalid.js'], { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                done(error);
            } else {
                expect(stdout).toContain('This program only accepts .txt files.');

                done();
            }
        });
    });

    test('should execute index.js with stdin input', (done) => {
        exec('cat inputs/echoes.txt | ../index.js', { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                done(error);
            } else {
                expect(stdout).toContain("quiet quiet night - 4");
                expect(stdout).toContain("in the night - 4");
                expect(stdout).toContain("the night night - 4");
                expect(stdout).toContain("night night night - 4");
                expect(stdout).toContain("light in the - 2");

                done();
            }
        });
    });


    test('should execute index.js with multiple file input', (done) => {
        execFile('node', ['../index.js', '-f', 'inputs/extract_moby_dick.txt', 'inputs/short.txt',
            'inputs/extract_moby_dick.txt'],
            { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    done(error);
                } else {
                    expect(stdout).toContain("TOP SEQUENCES: inputs/extract_moby_dick.txt");
                    expect(stdout).toContain("TOP SEQUENCES: inputs/short.txt");

                    done();
                }
            });
    });

    test('should execute index.js with multiple file input', (done) => {
        execFile('node', ['../index.js', '-f', 'inputs/extract_moby_dick.txt', 'inputs/short.txt',
            'inputs/extract_moby_dick.txt'],
            { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    done(error);
                } else {
                    expect(stdout).toContain("TOP SEQUENCES: inputs/extract_moby_dick.txt");
                    expect(stdout).toContain("TOP SEQUENCES: inputs/short.txt");

                    done();
                }
            });
    });


    test('should execute index.js with empty stdin input', (done) => {
        exec('cat inputs/empty.txt | ../index.js', { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                done(error);
            } else {
                expect(stdout).toContain('******************* NO SEQUENCES FOUND *****************');

                done();
            }
        });
    });


    test('should execute index.js with empty file input', (done) => {
        execFile('node', ['../index.js', '-f', 'inputs/empty.txt'], { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                done(error);
            } else {
                expect(stdout).toContain('******************* NO SEQUENCES FOUND *****************');

                done();
            }
        });
    });

    test('should execute index.js with very short file input', (done) => {
        execFile('node', ['../index.js', '-f', 'inputs/too_short.txt'], { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                done(error);
            } else {
                expect(stdout).toContain('******************* NO SEQUENCES FOUND *****************');

                done();
            }
        });
    });


    test('should execute index.js with unformatted file input', (done) => {
        execFile('node', ['../index.js', '-f', 'inputs/unformatted_short.txt'], { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                done(error);
            } else {
                expect(stdout).toContain("one isn't three - 3");
                expect(stdout).toContain("three one isn't - 2");
                expect(stdout).toContain("one isnt three - 1");
                expect(stdout).toContain("isn't three state-of-the-art - 1")
                expect(stdout).toContain("three state-of-the-art three - 1")
                expect(stdout).toContain("state-of-the-art three one - 1")
                expect(stdout).toContain("isnt three three - 1")
                expect(stdout).toContain("three one isnt - 1")
                expect(stdout).toContain("isnt three three - 1")
                expect(stdout).toContain("three three one - 1")

                done();
            }
        });
    });

    test('should execute index.js with german poem file input', (done) => {
        execFile('node', ['../index.js', '-f', 'inputs/rilke.txt'], { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                done(error);
            } else {
                expect(stdout).toContain("wie soll ich - 2")
                expect(stdout).toContain("seele halten daß - 1")
                expect(stdout).toContain("halten daß sie - 1")
                expect(stdout).toContain("daß sie nicht - 1")
                expect(stdout).toContain("an deine rührt - 1")
                expect(stdout).toContain("deine rührt wie - 1")
                expect(stdout).toContain("rührt wie soll - 1")
                expect(stdout).toContain("sie hinheben über - 1")
                expect(stdout).toContain("hinheben über dich - 1")
                expect(stdout).toContain("über dich zu - 1")
                expect(stdout).toContain("ach gerne möcht - 1")
                expect(stdout).toContain("gerne möcht ich - 1")
                expect(stdout).toContain("möcht ich sie - 1")
                expect(stdout).toContain("was uns anrührt - 1")
                expect(stdout).toContain("uns anrührt dich - 1")
                expect(stdout).toContain("anrührt dich und - 1")
                expect(stdout).toContain("hand o süßes - 1")
                expect(stdout).toContain("o süßes lied - 1")

                done();
            }
        });
    });


    test('should execute index.js with Echoes of Time poem file input', (done) => {
        execFile('node', ['../index.js', '-f', 'inputs/echoes.txt'], { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                done(error);
            } else {
                expect(stdout).toContain("quiet quiet night - 4");
                expect(stdout).toContain("in the night - 4");
                expect(stdout).toContain("the night night - 4");
                expect(stdout).toContain("night night night - 4");
                expect(stdout).toContain("light in the - 2");

                done();
            }
        });
    });

    test('should execute index.js with an extract_moby_dick file input', (done) => {
        execFile('node', ['../index.js', '-f', 'inputs/extract_moby_dick.txt'], { cwd: __dirname },
            (error, stdout, stderr) => {
                if (error) {
                    done(error);
                } else {
                    expect(stdout).toContain("the greenland whale - 4");
                    expect(stdout).toContain("greenland whale is - 3");
                    expect(stdout).toContain("the great sperm - 2");
                    expect(stdout).toContain("great sperm whale - 2");
                    expect(stdout).toContain("that the greenland - 2");
                    expect(stdout).toContain("of the seas - 2");
                    expect(stdout).toContain("the sperm whale - 2");
                    expect(stdout).toContain("the various species - 2");

                    done();
                }
            });
    });
});

afterAll(done => {
    done()
})
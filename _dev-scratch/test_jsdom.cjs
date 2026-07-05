const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

function testFile(filename) {
    const html = fs.readFileSync(filename, 'utf8');
    const virtualConsole = new jsdom.VirtualConsole();
    
    virtualConsole.on("error", () => {
        console.error(`[${filename}] Error:`, ...arguments);
    });
    virtualConsole.on("warn", () => {
        console.warn(`[${filename}] Warn:`, ...arguments);
    });
    virtualConsole.on("info", () => {
        console.info(`[${filename}] Info:`, ...arguments);
    });
    virtualConsole.on("dir", () => {
        console.dir(`[${filename}] Dir:`, ...arguments);
    });
    virtualConsole.on("jsdomError", (e) => {
        console.error(`[${filename}] JSDOM Error:`, e);
    });

    try {
        const dom = new JSDOM(html, { 
            virtualConsole, 
            runScripts: "dangerously"
        });
        console.log(`[${filename}] Loaded successfully without syntax exceptions.`);
    } catch(e) {
        console.error(`[${filename}] Exception during load:`, e);
    }
}

const files = fs.readdirSync('.');
const f1 = files.find(f => f.endsWith('html.txt') && !f.startsWith('!'));
const f2 = files.find(f => f.startsWith('!DOCTYPE'));

console.log("Testing:", f1);
testFile(f1);

console.log("Testing:", f2);
testFile(f2);

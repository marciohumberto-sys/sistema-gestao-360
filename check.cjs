const fs = require('fs');

function check() {
    const transcript = fs.readFileSync('C:\\Users\\marci\\.gemini\\antigravity-ide\\brain\\6f44cbff-d078-4c37-ad90-a99c7f83a129\\.system_generated\\logs\\transcript_full.jsonl', 'utf8');
    const lines = transcript.split('\n');
    let found = false;
    for (const l of lines) {
        if (l.includes('1897') || l.includes('111432')) {
            console.log("MATCH:", l.substring(0, 200));
            found = true;
        }
    }
    if (!found) console.log("NO MATCH");
}
check();

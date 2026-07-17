const fs = require('fs');

function check() {
    const transcript = fs.readFileSync('C:\\Users\\marci\\.gemini\\antigravity-ide\\brain\\6f44cbff-d078-4c37-ad90-a99c7f83a129\\.system_generated\\logs\\transcript_full.jsonl', 'utf8');
    const lines = transcript.split('\n');
    for (const l of lines) {
        if (l.includes('"step_index":6599')) {
            const data = JSON.parse(l);
            console.log("Step 6599:");
            console.log(data.content.substring(0, 500));
        }
        if (l.includes('"step_index":6512')) {
            const data = JSON.parse(l);
            console.log("Step 6512:");
            console.log(data.content.substring(0, 500));
        }
    }
}
check();

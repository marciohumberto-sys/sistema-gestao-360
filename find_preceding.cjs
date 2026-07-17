const fs = require('fs');

function find() {
    const transcript = fs.readFileSync('C:\\Users\\marci\\.gemini\\antigravity-ide\\brain\\6f44cbff-d078-4c37-ad90-a99c7f83a129\\.system_generated\\logs\\transcript_full.jsonl', 'utf8');
    const lines = transcript.split('\n');
    let lastPlanner = null;
    
    for (const l of lines) {
        if (l.includes('"type":"PLANNER_RESPONSE"')) {
            lastPlanner = l;
        }
        if (l.includes('"step_index":5711')) {
            console.log("Preceding planner:");
            const data = JSON.parse(lastPlanner);
            console.log(JSON.stringify(data, null, 2).substring(0, 2000));
            fs.writeFileSync('C:\\Users\\marci\\OneDrive\\Documentos\\Antigravity\\GPI\\step_5711_planner.json', JSON.stringify(data, null, 2));
            break;
        }
    }
}
find();

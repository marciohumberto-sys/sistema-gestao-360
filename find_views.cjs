const fs = require('fs');

function findViews() {
    const transcript = fs.readFileSync('C:\\Users\\marci\\.gemini\\antigravity-ide\\brain\\6f44cbff-d078-4c37-ad90-a99c7f83a129\\.system_generated\\logs\\transcript_full.jsonl', 'utf8');
    const lines = transcript.split('\n');
    let blocks = [];
    for (const l of lines) {
        if (!l.includes('LaboratorioConfiguracoes.jsx')) continue;
        if (l.includes('"type":"VIEW_FILE"')) {
            const data = JSON.parse(l);
            if (data.status === 'DONE' && data.content && data.content.includes('Showing lines')) {
                const match = data.content.match(/Showing lines (\d+) to (\d+)/);
                if (match) {
                    blocks.push({
                        step: data.step_index,
                        start: parseInt(match[1]),
                        end: parseInt(match[2]),
                        // snippet: data.content.substring(0, 150)
                    });
                }
            }
        }
    }
    console.log(blocks);
}
findViews();

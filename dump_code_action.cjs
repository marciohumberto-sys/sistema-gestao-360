const fs = require('fs');

function dump() {
    const transcript = fs.readFileSync('C:\\Users\\marci\\.gemini\\antigravity-ide\\brain\\6f44cbff-d078-4c37-ad90-a99c7f83a129\\.system_generated\\logs\\transcript_full.jsonl', 'utf8');
    const lines = transcript.split('\n');
    for (const l of lines) {
        if (!l.includes('LaboratorioConfiguracoes.jsx')) continue;
        
        if (l.includes('"type":"CODE_ACTION"')) {
            const data = JSON.parse(l);
            console.log(JSON.stringify(data, null, 2));
            break;
        }
    }
}
dump();

const fs = require('fs');

function check() {
    const transcript = fs.readFileSync('C:\\Users\\marci\\.gemini\\antigravity-ide\\brain\\6f44cbff-d078-4c37-ad90-a99c7f83a129\\.system_generated\\logs\\transcript_full.jsonl', 'utf8');
    const lines = transcript.split('\n');
    let maxLen = 0;
    let maxLine = '';
    
    for (const l of lines) {
        if (!l.includes('LaboratorioConfiguracoes.jsx')) continue;
        
        if (l.length > 10000) {
            console.log("Found line length:", l.length);
            const data = JSON.parse(l);
            console.log("Step:", data.step_index, "Type:", data.type);
            if (l.length > maxLen) {
                maxLen = l.length;
                maxLine = l;
            }
        }
    }
    
    if (maxLen > 0) {
        const data = JSON.parse(maxLine);
        fs.writeFileSync('C:\\Users\\marci\\OneDrive\\Documentos\\Antigravity\\GPI\\recovered_chunk.json', JSON.stringify(data, null, 2));
        console.log("Wrote max line to recovered_chunk.json");
    }
}
check();

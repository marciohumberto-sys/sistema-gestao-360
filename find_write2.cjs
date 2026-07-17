const fs = require('fs');

function findFullContent() {
    const transcript = fs.readFileSync('C:\\Users\\marci\\.gemini\\antigravity-ide\\brain\\6f44cbff-d078-4c37-ad90-a99c7f83a129\\.system_generated\\logs\\transcript_full.jsonl', 'utf8');
    const lines = transcript.split('\n');
    for (const l of lines) {
        if (!l.includes('LaboratorioConfiguracoes.jsx')) continue;
        
        // Find write_to_file tools in PLANNER_RESPONSE
        if (l.includes('"type":"PLANNER_RESPONSE"')) {
            const data = JSON.parse(l);
            if (data.tool_calls) {
                for (const t of data.tool_calls) {
                    if (t.name === 'default_api:write_to_file') {
                        if (t.arguments && t.arguments.TargetFile && t.arguments.TargetFile.includes('LaboratorioConfiguracoes.jsx')) {
                            console.log("Found write_to_file at step:", data.step_index);
                            console.log("Code length:", t.arguments.CodeContent.length);
                            fs.writeFileSync('C:\\Users\\marci\\OneDrive\\Documentos\\Antigravity\\GPI\\recovered_configuracoes.jsx', t.arguments.CodeContent);
                            console.log("Written to recovered_configuracoes.jsx");
                            return;
                        }
                    }
                }
            }
        }
    }
    console.log("Not found via write_to_file.");
}
findFullContent();

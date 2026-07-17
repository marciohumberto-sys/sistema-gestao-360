const fs = require('fs');

function check() {
    const transcript = fs.readFileSync('C:\\Users\\marci\\.gemini\\antigravity-ide\\brain\\6f44cbff-d078-4c37-ad90-a99c7f83a129\\.system_generated\\logs\\transcript_full.jsonl', 'utf8');
    const lines = transcript.split('\n');
    for (const l of lines) {
        if (!l.includes('LaboratorioConfiguracoes.jsx')) continue;
        if (l.includes('"type":"WRITE_TO_FILE"') || l.includes('"type":"REPLACE_FILE_CONTENT"') || l.includes('MULTI_REPLACE') || l.includes('write_to_file') || l.includes('replace_file_content')) {
            const data = JSON.parse(l);
            if (data.source === 'MODEL' && data.type !== 'PLANNER_RESPONSE') {
                console.log("Found modify step:", data.step_index, data.type);
            }
            if (data.source === 'MODEL' && data.type === 'PLANNER_RESPONSE') {
                // Check if it's calling a tool on it
                if (data.tool_calls) {
                    for (const t of data.tool_calls) {
                        if (t.name === 'default_api:replace_file_content' || t.name === 'default_api:write_to_file') {
                            if (JSON.stringify(t.arguments).includes('LaboratorioConfiguracoes.jsx')) {
                                console.log("Found tool call at step:", data.step_index, t.name);
                            }
                        }
                    }
                }
            }
        }
    }
}
check();

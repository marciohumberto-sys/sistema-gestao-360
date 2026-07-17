const fs = require('fs');

function check() {
    const transcript = fs.readFileSync('C:\\Users\\marci\\.gemini\\antigravity-ide\\brain\\6f44cbff-d078-4c37-ad90-a99c7f83a129\\.system_generated\\logs\\transcript_full.jsonl', 'utf8');
    const lines = transcript.split('\n');
    let maxLen = 0;
    for (const l of lines) {
        if (!l.includes('LaboratorioConfiguracoes.jsx')) continue;
        
        if (l.includes('"type":"PLANNER_RESPONSE"')) {
            const data = JSON.parse(l);
            if (data.tool_calls) {
                for (const t of data.tool_calls) {
                    if (t.name === 'default_api:replace_file_content' || t.name === 'default_api:multi_replace_file_content' || t.name === 'default_api:write_to_file') {
                        if (t.arguments && JSON.stringify(t.arguments).includes('LaboratorioConfiguracoes.jsx')) {
                            console.log("Step:", data.step_index, "Tool:", t.name);
                            const len = JSON.stringify(t.arguments).length;
                            console.log("Length:", len);
                            if (len > maxLen) {
                                maxLen = len;
                                fs.writeFileSync('C:\\Users\\marci\\OneDrive\\Documentos\\Antigravity\\GPI\\max_call.json', JSON.stringify(t.arguments, null, 2));
                            }
                        }
                    }
                }
            }
        }
    }
}
check();

const fs = require('fs');

function getWrite() {
    const transcript = fs.readFileSync('C:\\Users\\marci\\.gemini\\antigravity-ide\\brain\\6f44cbff-d078-4c37-ad90-a99c7f83a129\\.system_generated\\logs\\transcript_full.jsonl', 'utf8');
    const lines = transcript.split('\n');
    let maxContent = '';
    
    for (const l of lines) {
        if (!l.includes('LaboratorioConfiguracoes.jsx')) continue;
        if (l.includes('"type":"PLANNER_RESPONSE"')) {
            const data = JSON.parse(l);
            if (data.tool_calls) {
                for (const t of data.tool_calls) {
                    if (t.name === 'default_api:write_to_file' && t.arguments && t.arguments.TargetFile && t.arguments.TargetFile.includes('LaboratorioConfiguracoes.jsx')) {
                        if (t.arguments.CodeContent.length > maxContent.length) {
                            maxContent = t.arguments.CodeContent;
                        }
                    }
                    // Also check for replace_file_content if it replaced the whole file? No, replace_file_content has ReplacementContent
                    if ((t.name === 'default_api:replace_file_content' || t.name === 'default_api:multi_replace_file_content') && t.arguments && JSON.stringify(t.arguments).includes('LaboratorioConfiguracoes.jsx')) {
                        console.log("Found replace at step:", data.step_index);
                    }
                }
            }
        }
    }
    
    if (maxContent) {
        fs.writeFileSync('C:\\Users\\marci\\OneDrive\\Documentos\\Antigravity\\GPI\\recovered_configuracoes.jsx', maxContent);
        console.log("Recovered write_to_file! Length:", maxContent.length);
    } else {
        console.log("No write_to_file found.");
    }
}
getWrite();

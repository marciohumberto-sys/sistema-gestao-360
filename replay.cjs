const fs = require('fs');

function replay() {
    // Start with the 305 line file.
    // Ensure we have a fresh copy
    
    // First, let's load the transcript
    const transcript = fs.readFileSync('C:\\Users\\marci\\.gemini\\antigravity-ide\\brain\\6f44cbff-d078-4c37-ad90-a99c7f83a129\\.system_generated\\logs\\transcript_full.jsonl', 'utf8');
    const lines = transcript.split('\n');
    
    let actions = [];
    
    for (const l of lines) {
        if (!l.includes('LaboratorioConfiguracoes.jsx')) continue;
        if (l.includes('"type":"PLANNER_RESPONSE"')) {
            const data = JSON.parse(l);
            if (data.tool_calls) {
                for (const t of data.tool_calls) {
                    if (t.name === 'default_api:write_to_file' && t.arguments && t.arguments.TargetFile && t.arguments.TargetFile.includes('LaboratorioConfiguracoes.jsx')) {
                        actions.push({ type: 'write', content: t.arguments.CodeContent, step: data.step_index });
                    }
                    if (t.name === 'default_api:replace_file_content' && t.arguments && t.arguments.TargetFile && t.arguments.TargetFile.includes('LaboratorioConfiguracoes.jsx')) {
                        actions.push({ type: 'replace', target: t.arguments.TargetContent, repl: t.arguments.ReplacementContent, step: data.step_index });
                    }
                    if (t.name === 'default_api:multi_replace_file_content' && t.arguments && t.arguments.TargetFile && t.arguments.TargetFile.includes('LaboratorioConfiguracoes.jsx')) {
                        actions.push({ type: 'multi', chunks: t.arguments.ReplacementChunks, step: data.step_index });
                    }
                }
            }
        }
    }
    
    // We also know that some CODE_ACTION from the IDE might not be in PLANNER_RESPONSE if it was an automatic quick fix, 
    // but the agent didn't use quick fixes, it used tools.
    // Wait, let's just replay what we found.
    
    let fileContent = '';
    let successCount = 0;
    
    // The very first action should be a write or replace.
    // But wait, the file already existed as 305 lines.
    fileContent = fs.readFileSync('C:\\Users\\marci\\OneDrive\\Documentos\\Antigravity\\GPI\\src\\pages\\laboratorio\\LaboratorioConfiguracoes.jsx', 'utf8');
    
    for (const action of actions) {
        // Skip any actions from my own failed attempts (after step 6400 for example, where I started Phase 3)
        // Let's only replay up to step 6442 (the start of my Phase 3 block).
        if (action.step > 6400) continue; 
        
        if (action.type === 'write') {
            fileContent = action.content;
            successCount++;
        } else if (action.type === 'replace') {
            if (fileContent.includes(action.target)) {
                fileContent = fileContent.replace(action.target, action.repl);
                successCount++;
            } else {
                console.log("Failed to match target in replace at step", action.step);
            }
        } else if (action.type === 'multi') {
            let chunkSuccess = true;
            let tempContent = fileContent;
            for (const chunk of action.chunks) {
                if (tempContent.includes(chunk.TargetContent)) {
                    tempContent = tempContent.replace(chunk.TargetContent, chunk.ReplacementContent);
                } else {
                    console.log("Failed to match chunk target in multi at step", action.step);
                    chunkSuccess = false;
                }
            }
            if (chunkSuccess) {
                fileContent = tempContent;
                successCount++;
            }
        }
    }
    
    console.log(`Applied ${successCount} out of ${actions.length} actions.`);
    fs.writeFileSync('C:\\Users\\marci\\OneDrive\\Documentos\\Antigravity\\GPI\\recovered_configuracoes.jsx', fileContent);
    console.log("Wrote recovered file to recovered_configuracoes.jsx, length:", fileContent.length);
}
replay();

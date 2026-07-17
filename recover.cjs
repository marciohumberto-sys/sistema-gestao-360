const fs = require('fs');
const readline = require('readline');

async function recover() {
    const transcript_path = 'C:\\Users\\marci\\.gemini\\antigravity-ide\\brain\\6f44cbff-d078-4c37-ad90-a99c7f83a129\\.system_generated\\logs\\transcript_full.jsonl';
    
    let best_content = null;
    
    const rl = readline.createInterface({
        input: fs.createReadStream(transcript_path),
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (line.includes('LaboratorioConfiguracoes.jsx')) {
            try {
                const data = JSON.parse(line);
                if (data.tool_calls) {
                    for (const call of data.tool_calls) {
                        if (call.name === 'default_api:write_to_file' || call.name === 'default_api:replace_file_content' || call.name === 'default_api:multi_replace_file_content') {
                            const args = call.arguments;
                            if (args.TargetFile && args.TargetFile.includes('LaboratorioConfiguracoes.jsx')) {
                                if (call.name === 'default_api:write_to_file' && args.CodeContent) {
                                    best_content = args.CodeContent;
                                }
                            }
                        }
                    }
                }
            } catch (e) {}
        }
    }

    if (best_content) {
        fs.writeFileSync('recover_configuracoes.jsx', best_content, 'utf8');
        console.log("Recovered from write_to_file with length:", best_content.length);
    } else {
        console.log("Not found write_to_file");
    }
}

recover();

const fs = require('fs');

function makePatch() {
    const content = fs.readFileSync('all_diffs.txt', 'utf8');
    const blocks = content.split('--- STEP');
    
    let out = '';
    
    for (const block of blocks) {
        if (!block.trim()) continue;
        
        const diffs = block.match(/\[diff_block_start\]([\s\S]*?)\[diff_block_end\]/g);
        if (diffs) {
            for (const d of diffs) {
                let diffText = d.replace(/\[diff_block_start\]\n?/, '').replace(/\n?\[diff_block_end\]/, '').trim();
                if (diffText) {
                    out += "--- a/src/pages/laboratorio/LaboratorioConfiguracoes.jsx\n";
                    out += "+++ b/src/pages/laboratorio/LaboratorioConfiguracoes.jsx\n";
                    out += diffText + '\n\n';
                }
            }
        }
    }
    
    fs.writeFileSync('recover.patch', out);
    console.log("Wrote recover.patch");
}
makePatch();

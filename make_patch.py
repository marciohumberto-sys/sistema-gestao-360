import re

def make_patch():
    with open('all_diffs.txt', 'r', encoding='utf-8') as f:
        content = f.read()

    blocks = content.split('--- STEP')
    
    with open('recover.patch', 'w', encoding='utf-8') as out:
        for block in blocks:
            if not block.strip(): continue
            
            # Extract diff blocks
            diffs = re.findall(r'\[diff_block_start\](.*?)\[diff_block_end\]', block, re.DOTALL)
            for diff in diffs:
                diff = diff.strip()
                if diff:
                    out.write("--- a/src/pages/laboratorio/LaboratorioConfiguracoes.jsx\n")
                    out.write("+++ b/src/pages/laboratorio/LaboratorioConfiguracoes.jsx\n")
                    # Ensure lines end correctly
                    lines = diff.split('\n')
                    for line in lines:
                        out.write(line + '\n')
                    out.write('\n')

if __name__ == '__main__':
    make_patch()

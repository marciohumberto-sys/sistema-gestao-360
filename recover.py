import json

def recover():
    transcript_path = r"C:\Users\marci\.gemini\antigravity-ide\brain\6f44cbff-d078-4c37-ad90-a99c7f83a129\.system_generated\logs\transcript_full.jsonl"
    
    best_content = None
    
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            if 'LaboratorioConfiguracoes.jsx' in line and 'TOOL_RESPONSE' in line:
                try:
                    data = json.loads(line)
                    if data.get('type') == 'TOOL_RESPONSE':
                        content = data.get('content', '')
                        if 'Showing lines 1 to 18' in content or 'Showing lines 1 to 19' in content or 'Showing lines 1 to 2000' in content:
                            best_content = content
                except Exception:
                    pass

    if best_content:
        # The content has a header, e.g. "Showing lines 1 to 1897\nThe following code has been modified to include a line number before every line... \n1: import React..."
        lines = best_content.split('\n')
        code_lines = []
        parsing = False
        for l in lines:
            if parsing:
                if l.startswith('The above content'):
                    break
                # Remove the line number prefix, e.g. "123: "
                idx = l.find(': ')
                if idx != -1 and l[:idx].isdigit():
                    code_lines.append(l[idx+2:])
                else:
                    code_lines.append(l)
            else:
                if 'The following code has been modified to include a line number' in l:
                    parsing = True
        
        with open('recover_configuracoes.jsx', 'w', encoding='utf-8') as out:
            out.write('\n'.join(code_lines))
        print("Recovered with length:", len('\n'.join(code_lines)))
    else:
        print("Not found")

if __name__ == '__main__':
    recover()

import os

files = {
    'src/pages/laboratorio/LaboratorioConferencia.css': '.lab-conf-container',
    'src/pages/laboratorio/LaboratorioLaudos.css': '.lab-laudos-container'
}

for path, container in files.items():
    with open(path, 'r', encoding='latin1') as f:
        content = f.read()

    if 'Conferencia' in path:
        old_part = f"""{container} .lab-filters-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
    align-items: flex-end;
}}

{container} .lab-filters-grid > * {{
    min-width: 0;
}}

@media (min-width: 1024px) {{
    {container} .lab-filters-grid {{
        grid-template-columns: 0.9fr 0.9fr 1.8fr 1.1fr 1.9fr 130px;
    }}
}}"""
    else:
        old_part = f"""{container} .lab-filters-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 1rem;
    align-items: flex-end;
}}

{container} .lab-filters-grid > * {{
    min-width: 0;
}}

@media (min-width: 1024px) {{
    {container} .lab-filters-grid {{
        grid-template-columns: 1fr 1.1fr 1.8fr 1.4fr 1.3fr 140px;
    }}
}}"""

    new_part = f"""{container} .lab-filters-grid {{
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    align-items: end;
    width: 100%;
}}

{container} .lab-filters-grid > * {{
    min-width: 0;
}}

@media (min-width: 768px) {{
    {container} .lab-filters-grid {{
        grid-template-columns: 1fr 1fr 1fr;
    }}
}}

@media (min-width: 1200px) {{
    {container} .lab-filters-grid {{
        grid-template-columns: 145px 180px minmax(200px, 1fr) 175px 175px 145px;
        gap: 12px;
    }}
}}

@media (min-width: 1400px) {{
    {container} .lab-filters-grid {{
        grid-template-columns: 160px 210px minmax(260px, 1fr) 220px 220px 160px;
        gap: 16px;
    }}
}}"""

    if old_part in content:
        content = content.replace(old_part, new_part)
        with open(path, 'w', encoding='latin1') as f:
            f.write(content)
        print(f"Replaced in {{path}}")
    else:
        print(f"Not found in {{path}}")

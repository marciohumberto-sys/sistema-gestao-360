const fs = require('fs');

const file = 'src/pages/ContractDetails.jsx';
let text = fs.readFileSync(file, 'utf8');
let lines = text.split('\n');

const trStartIdx = lines.findIndex(l => l.includes('{expandedItemId === item.id && ('));
const trEndIdx = lines.findIndex((l, i) => i > trStartIdx && l.includes('                                                            }'));

if (trStartIdx === -1 || trEndIdx === -1) {
    console.error('Could not find TR block start or end');
    process.exit(1);
}

const innerStartIdx = lines.findIndex((l, i) => i > trStartIdx && i < trEndIdx && l.includes("<div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9' }}>"));
const innerEndIdx = lines.findIndex((l, i) => i > innerStartIdx && i < trEndIdx && l.includes("                                                                                </div>"));

if (innerStartIdx === -1 || innerEndIdx === -1) {
    console.error('Could not find inner boundaries');
    process.exit(1);
}

const rateioLines = lines.slice(innerStartIdx, innerEndIdx + 1);

lines.splice(trStartIdx, trEndIdx - trStartIdx + 1);

const modalItemIdx = lines.findIndex(l => l.includes('{/* Modal Item */}'));

if (modalItemIdx === -1) {
    console.error('Could not find Modal Item');
    process.exit(1);
}

const modalLines = [
    `            {/* Modal Rateio */}`,
    `            {`,
    `                expandedItemId && (() => {`,
    `                    const item = items.find(i => i.id === expandedItemId);`,
    `                    if (!item) return null;`,
    ``,
    `                    return (`,
    `                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,37,64,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }} onClick={() => setExpandedItemId(null)}>`,
    `                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', maxWidth: '720px', maxHeight: '90vh', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 40px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>`,
    `                                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>`,
    ...rateioLines,
    `                                </div>`,
    `                            </div>`,
    `                        </div>`,
    `                    );`,
    `                })()`,
    `            }`,
    ``
];

lines.splice(modalItemIdx, 0, ...modalLines);

fs.writeFileSync(file, lines.join('\n'));
console.log('Successfully applied array displacement.');

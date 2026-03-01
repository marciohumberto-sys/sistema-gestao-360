const fs = require('fs');
const file = 'src/pages/ContractDetails.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const sIdx = lines.findIndex(l => l.includes('{expandedItemId === item.id && ('));
const eIdx = lines.findIndex((l, i) => i > sIdx && l.trim() === '}' && lines[i + 1] && lines[i + 1].includes('</React.Fragment>'));

if (sIdx === -1 || eIdx === -1) {
    console.error('Boundaries not found');
    process.exit(1);
}

// Find the header of the Rateio
const innerStartIdx = lines.findIndex((l, i) => i > sIdx && i < eIdx && l.includes("<div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9' }}>"));

// Find the very last IIFE closure within the Rateio inline block
const allIIFEs = lines.reduce((acc, l, i) => {
    if (i > innerStartIdx && i < eIdx && l.includes('})()}')) {
        acc.push(i);
    }
    return acc;
}, []);

const innerEndIdx = allIIFEs[allIIFEs.length - 1];

if (innerStartIdx === -1 || innerEndIdx === -1) {
    console.error('Inner boundaries not found');
    process.exit(1);
}

const rateioLines = lines.slice(innerStartIdx, innerEndIdx + 1);

// We still need to close the `padding: '1.5rem 2rem'` content body wrapper!
// So let's add an explicit `</div>` to the extracted rateioLines!
rateioLines.push('                                                                                 </div>');

lines.splice(sIdx, eIdx - sIdx + 1);

const modalItemIdx = lines.findIndex(l => l.includes('{/* Modal Item */}'));

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
console.log('Successfully applied accurate array displacement, catching both IIFEs.');

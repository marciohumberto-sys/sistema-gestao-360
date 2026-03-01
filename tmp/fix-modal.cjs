const fs = require('fs');
const file = 'src/pages/ContractDetails.jsx';
let code = fs.readFileSync(file, 'utf8');
const lines = code.split('\n');

const startIndex = lines.findIndex(l => l.includes('{expandedItemId === item.id && ('));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.trim() === '})');

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find boundaries: start ' + startIndex + ' end ' + endIndex);
    process.exit(1);
}

const headerIndex = lines.findIndex((l, i) => i > startIndex && i < endIndex && l.includes("borderBottom: '1px solid #f1f5f9'"));
const footerIndex = lines.findIndex((l, i) => i > startIndex && i < endIndex && l.includes("borderTop: '1px solid #e2e8f0'"));

if (headerIndex === -1 || footerIndex === -1) {
    console.error('Could not find header or footer: header ' + headerIndex + ' footer ' + footerIndex);
    process.exit(1);
}

const rateioBody = lines.slice(headerIndex + 11, footerIndex).join('\n');
const rateioFooter = lines.slice(footerIndex, endIndex - 5).join('\n');

lines.splice(startIndex, endIndex - startIndex, '');

const modalItemIndex = lines.findIndex(l => l.includes('{/* Modal Item */}'));
if (modalItemIndex === -1) {
    console.error('Could not find Modal Item marker');
    process.exit(1);
}

const newModal = `
            {/* Modal Rateio */}
            {
                expandedItemId && (() => {
                    const item = items.find(i => i.id === expandedItemId);
                    if (!item) return null;

                    return (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,37,64,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }} onClick={() => setExpandedItemId(null)}>
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', maxWidth: '720px', maxHeight: '90vh', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ background: '#e0f2fe', padding: '0.5rem', borderRadius: '8px', color: '#0284c7' }}>
                                                <Landmark size={20} />
                                            </div>
                                            <div>
                                                <h4 style={{ margin: '0 0 0.125rem 0', color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Rateio Institucional — Item {item.item_number || 'X'}</h4>
                                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Distribua as quantidades do item pelas secretarias beneficiadas</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ overflowY: 'auto', flex: 1 }}>
${rateioBody}
                                </div>
${rateioFooter}
                            </div>
                        </div>
                    );
                })()
            }
`;

lines.splice(modalItemIndex, 0, newModal);
fs.writeFileSync(file, lines.join('\n'));
console.log('Success extracting Rateio Modal. Replaced and inserted successfully.');

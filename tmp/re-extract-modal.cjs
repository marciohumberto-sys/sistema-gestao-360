const fs = require('fs');
let code = fs.readFileSync('src/pages/ContractDetails.jsx', 'utf8');

const inlineStart = code.indexOf('{expandedItemId === item.id && (\\n                                                                <tr className="expanded-row-panel"');
const inlineEnd = code.indexOf('                                                })\\n                                            )}\\n                                        </tbody>');

if (inlineStart === -1 || inlineEnd === -1) {
    console.error('Could not find boundaries');
    process.exit(1);
}

const headerStart = code.indexOf("<div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9' }}>", inlineStart);
const headerEnd = code.indexOf("<div style={{ padding: '1.5rem 2rem' }}>", headerStart);

const footerStart = code.indexOf("<div style={{ padding: '1.25rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>", headerEnd);
const footerEnd = code.indexOf('                                                                                </div>\\n                                                                            </div>\\n                                                                        </div>\\n                                                                    </td>\\n                                                                </tr>', footerStart);

if (headerStart === -1 || headerEnd === -1 || footerStart === -1 || footerEnd === -1) {
    console.error('Could not find parts');
    process.exit(1);
}

let rateioBody = code.substring(headerEnd, footerStart);
let rateioFooterText = code.substring(footerStart, footerEnd);
// rateioFooterText is missing the closing </div> for the footer itself! We must add it.
rateioFooterText += "\\n                                                                                </div>";

const inlineReplaceStr = code.substring(inlineStart, inlineEnd);

code = code.replace(inlineReplaceStr, '                                                })\\n                                            )}\\n                                        </tbody>');

const modalItemStart = code.indexOf('{/* Modal Item */}');

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
${rateioFooterText}
                            </div>
                        </div>
                    );
                })()
            }
`;

code = code.substring(0, modalItemStart) + newModal + code.substring(modalItemStart);

fs.writeFileSync('src/pages/ContractDetails.jsx', code);
console.log('Success completely replacing Rateio inline with Modal');

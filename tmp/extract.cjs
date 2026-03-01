const fs = require('fs');
let code = fs.readFileSync('src/pages/ContractDetails.jsx', 'utf8');

// Find the boundaries of the rateio inline block we want to remove
const startTag = '{expandedItemId === item.id && (\\n                                                                <tr className="expanded-row-panel" style={{ background: \\'#f8fafc\\' }}>';
const endTag = '                                                })\\n                                            )}\\n                                        </tbody>';

const sIdx = code.indexOf(startTag);
const eIdx = code.indexOf(endTag, sIdx);

if (sIdx === -1 || eIdx === -1) {
    console.error('Boundaries not found');
    process.exit(1);
}

// Find the inner rateio logic we want to preserve
// It starts at the title bar
const innerStartStr = "<div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9' }}>\\n                                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>";
let innerStart = code.indexOf(innerStartStr, sIdx);
if (innerStart === -1) {
    // try a fuzzy match
    innerStart = code.indexOf("Rateio Institucional — Item {item.item_number || 'X'}</h4>", sIdx);
    // Rewind back to the padding div
    innerStart = code.lastIndexOf("<div style={{ padding: '1.5rem 2rem", innerStart);
}

const innerEndStr = "                                                                                         return (\\n                                                                                             <button\\n                                                                                                 className=\\"cd-btn - primary\\"";
let innerEnd = code.indexOf(innerEndStr, innerStart);
if (innerEnd === -1) {
    innerEnd = code.indexOf("{isSavingAllocations ? 'Salvando...' : 'Salvar Rateio'}\\n                                                                                             </button>\\n                                                                                         )", innerStart);
    innerEnd += "{isSavingAllocations ? 'Salvando...' : 'Salvar Rateio'}\\n                                                                                             </button>\\n                                                                                         )".length;
    // Walk forward past the closing divs from the original nested structure
    // actually, let's just grab up to that closing parenthesis of the IIFE
    innerEnd = code.indexOf("})()}", innerEnd) + 5;
}

if (innerStart === -1 || innerEnd === -1) {
    console.error('Inner boundaries not found');
    process.exit(1);
}

let rateioLogic = code.substring(innerStart, innerEnd);

// Wrap this preserved logic in our new Modal skeleton
const modalString = `
            {/* Modal Rateio */}
            {
                expandedItemId && (() => {
                    const item = items.find(i => i.id === expandedItemId);
                    if (!item) return null;

                    return (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,37,64,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }} onClick={() => setExpandedItemId(null)}>
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', maxWidth: '720px', maxHeight: '90vh', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 40px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
${rateioLogic}
                                </div>
                            </div>
                        </div>
                    );
                })()
            }
`;

// Build the new file contents
// Replace the inline TR block with just the closing map tag
let newCode = code.substring(0, sIdx) + '                                                })\\n                                            )}\\n                                        </tbody>' + code.substring(eIdx + endTag.length);

// Insert the modalString right before Modal Item
const modalItemIdx = newCode.indexOf('{/* Modal Item */}');
newCode = newCode.substring(0, modalItemIdx) + modalString + '\\n\\n            ' + newCode.substring(modalItemIdx);

fs.writeFileSync('src/pages/ContractDetails.jsx', newCode);
console.log('Successfully re-wrote ContractDetails.jsx to extract Rateio Modal');

const fs = require('fs');

const file = 'src/pages/ContractDetails.jsx';
let code = fs.readFileSync(file, 'utf8');

const sIdx = code.indexOf('{expandedItemId === item.id && (\\n                                                                <tr className="expanded-row-panel" style={{ background: \\'#f8fafc\\' }}>');

// `exactEnd` should be the closing `}` of `{expandedItemId...}`.
// The code looks like:
//                                                                 </tr>
//                                                             )
//                                                             }
//                                                         </React.Fragment>
const eIdxPattern = "                                                            }\\n                                                        </React.Fragment>";
const eIdx = code.indexOf(eIdxPattern, sIdx);

// Let's get the interior of the Rateio.
const innerStartStr = "<div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9' }}>";
let innerStart = code.indexOf(innerStartStr, sIdx);

// The end of the IIFE is `})()}`
const innerEndStr = "})()}";
let innerEnd = code.indexOf(innerEndStr, innerStart) + innerEndStr.length;

let rateioLogic = code.substring(innerStart, innerEnd);

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

// Splice it out
let newCode = code.substring(0, sIdx) + '                                                        </React.Fragment>' + code.substring(eIdx + eIdxPattern.length);

// Insert at modal item
const modalItemIdx = newCode.indexOf('{/* Modal Item */}');
newCode = newCode.substring(0, modalItemIdx) + modalString + '\\n\\n            ' + newCode.substring(modalItemIdx);

fs.writeFileSync(file, newCode);
console.log('Done!');

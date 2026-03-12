
function getNextOfNumber(existingOfs, year) {
    let nextSequence = 1;
    if (existingOfs && existingOfs.length > 0) {
        const yearStr = String(year);
        const sequences = existingOfs
            .map(of => {
                const num = of.number || '';
                
                if (num.includes(yearStr)) {
                    // IF pattern OF-2026-0001
                    if (num.startsWith(`OF-${yearStr}-`)) {
                        const parts = num.split('-');
                        return parseInt(parts[2], 10);
                    }
                    
                    // IF pattern 0001/2026
                    if (num.endsWith(`/${yearStr}`)) {
                        const principal = num.split('/')[0];
                        if (principal.length > 4 && principal.startsWith(yearStr)) {
                            return parseInt(principal.substring(yearStr.length), 10);
                        }
                        return parseInt(principal, 10);
                    }
                }
                return 0;
            })
            .filter(n => !isNaN(n) && n > 0);
        
        if (sequences.length > 0) {
            nextSequence = Math.max(...sequences) + 1;
        }
    }

    const paddedSequence = String(nextSequence).padStart(4, '0');
    return `OF-${year}-${paddedSequence}`;
}

const testCases = [
    { name: "Empty case", ofs: [], year: 2026, expected: "OF-2026-0001" },
    { name: "Old pattern 0001/2026", ofs: [{ number: "0001/2026" }], year: 2026, expected: "OF-2026-0002" },
    { name: "Erroneous pattern 20260003/2026", ofs: [{ number: "20260003/2026" }], year: 2026, expected: "OF-2026-0004" },
    { name: "Mixed patterns", ofs: [{ number: "0001/2026" }, { number: "20260003/2026" }, { number: "OF-2026-0005" }], year: 2026, expected: "OF-2026-0006" },
    { name: "Different year", ofs: [{ number: "0001/2025" }], year: 2026, expected: "OF-2026-0001" },
    { name: "Multiple digit sequence", ofs: [{ number: "OF-2026-0010" }], year: 2026, expected: "OF-2026-0011" }
];

testCases.forEach(tc => {
    const result = getNextOfNumber(tc.ofs, tc.year);
    if (result === tc.expected) {
        console.log(`PASS: ${tc.name}`);
    } else {
        console.log(`FAIL: ${tc.name} - Expected: ${tc.expected}, Got: ${result}`);
    }
});

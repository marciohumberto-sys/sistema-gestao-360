const fs = require('fs');
const path = 'src/index.css';
let content = fs.readFileSync(path, 'latin1');

const cssToAppend = `
/* HIDE SPINNERS FOR NUMBER INPUTS IN RESULTS */
.lab-result-number-input::-webkit-inner-spin-button,
.lab-result-number-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.lab-result-number-input {
    -moz-appearance: textfield;
}
`;

if (!content.includes('.lab-result-number-input')) {
    fs.writeFileSync(path, content + "\n" + cssToAppend, 'latin1');
    console.log("CSS added to src/index.css");
} else {
    console.log("CSS already present");
}

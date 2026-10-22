// Turkish translations: { "English text": "Türkçe metin" }.
// The parts are merged here; missing entries are listed by
// `node tools/i18n/check.mjs --list` (English is shown for any of them).

import part1 from "./tr/part1.js";
import part2 from "./tr/part2.js";
import part3 from "./tr/part3.js";
import part4 from "./tr/part4.js";
import part5 from "./tr/part5.js";
import part6 from "./tr/part6.js";
import part7 from "./tr/part7.js";
import part8 from "./tr/part8.js";

const tr = { ...part1, ...part2, ...part3, ...part4, ...part5, ...part6, ...part7, ...part8 };

export default tr;

const buffer = "some data";
const rx = /([\d,]+)\s+tokens\b/g;
let matches = [...buffer.matchAll(rx)];
console.log(matches.length);

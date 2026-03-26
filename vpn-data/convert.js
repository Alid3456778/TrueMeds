// const fs = require("fs");
// const path = require('path');

// // const input = fs.readFileSync("ipv4.txt", "utf8");
// // This builds the absolute path: C:\Git\Webiste_Land\ipv4.txt
// const filePath = path.join(__dirname, 'ipv4.txt');
// try {
//     let input = fs.readFileSync(filePath, 'utf8');
//     console.log(input);
// } catch (err) {
//     console.error("Could not find the file at:", filePath);
// }

// const jsonArray = input
//   .split(/\r?\n/)
//   .map(line => line.trim())
//   .filter(line => line.length > 0);

// fs.writeFileSync(
//   "vpn_ips.json",
//   JSON.stringify(jsonArray, null, 2)
// );

// console.log("✅ ipv4.txt converted to vpn_ips.json");
const fs = require("fs");
const path = require('path');

// 1. Correct the path: 
// If ipv4.txt is in the folder ABOVE 'vpn-data', use '..'
// If it is in the SAME folder, keep it as 'ipv4.txt'
const filePath = path.join(__dirname, 'datacenters.txt');

let input = "";

try {
    input = fs.readFileSync(filePath, 'utf8');
} catch (err) {
    console.error("❌ Error: Could not find the file at:", filePath);
    process.exit(1); // Stop the script if the file is missing
}

// 2. Process the data (input is now accessible here)
const jsonArray = input
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line.length > 0);

// 3. Write the output
try {
    fs.writeFileSync(
      path.join(__dirname, "vpn_ips.json"),
      JSON.stringify(jsonArray, null, 2)
    );
    console.log("✅ ipv4.txt converted to vpn_ips.json");
} catch (err) {
    console.error("❌ Error writing JSON file:", err.message);
}

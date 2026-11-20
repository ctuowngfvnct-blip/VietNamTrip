// Chạy: npm run validate:data [-- --strict] [-- --verbose]
// Thoát mã 1 nếu có lỗi (CI sẽ đỏ), mã 0 nếu chỉ có cảnh báo.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateData, formatReport } from "../src/VietNamTrip.Core/dataValidator.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const verbose = args.includes("--verbose");

const files = {
    provinces: "data/provinces.json",
    pois: "data/pois.json",
    edges: "data/edges.json",
    context: "data/context.json",
    boundaries: "data/boundaries.geojson"
};

const data = {};
const parseErrors = [];

for (const [key, relative] of Object.entries(files)) {
    const full = path.join(root, relative);
    if (!fs.existsSync(full)) {
        data[key] = null; // thiếu file: validator sẽ báo cảnh báo
        continue;
    }
    try {
        data[key] = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (err) {
        data[key] = null;
        parseErrors.push({
            level: "error",
            code: "JSON_INVALID",
            where: relative,
            message: `Không đọc được JSON: ${err.message}`
        });
    }
}

const result = validateData(data, {
    strict,
    fileExists: (p) => fs.existsSync(path.join(root, p))
});

// File JSON hỏng đã được báo riêng, nên bỏ cảnh báo "thiếu file" trùng cho file đó.
const brokenFiles = new Set(parseErrors.map((e) => path.basename(e.where, path.extname(e.where))));
result.warnings = result.warnings.filter((w) => !(w.code === "FILE_MISSING" && brokenFiles.has(w.where)));
result.errors = [...parseErrors, ...result.errors.filter((e) => !(e.code === "FILE_MISSING" && brokenFiles.has(e.where)))];

console.log(strict ? "Kiểm tra dữ liệu (chế độ strict)\n" : "Kiểm tra dữ liệu\n");
console.log(formatReport(result, { verbose }));
console.log(`\nTổng: ${result.errors.length} lỗi, ${result.warnings.length} cảnh báo.`);

process.exit(result.errors.length > 0 ? 1 : 0);

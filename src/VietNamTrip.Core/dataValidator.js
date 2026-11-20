// Kiểm tra dữ liệu theo docs/schema.md và BR-11.3.
// Hàm thuần: nhận dữ liệu đã đọc sẵn, trả về danh sách lỗi và cảnh báo.
// Không đọc file, không gọi mạng, để test được dễ.

const POI_TYPES = [
    "attraction", "restaurant", "lodging", "hospital",
    "pharmacy", "transport_hub", "shop", "experience"
];
const TERRAINS = ["forest", "coast", "island", "delta", "mountain", "urban", "karst"];
const DIFFICULTIES = ["easy", "moderate", "hard"];
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const PROVINCE_REQUIRED = [
    "id", "name", "terrain_primary", "map_color", "center", "bbox",
    "puzzle_image", "is_demo", "source", "last_verified"
];
const POI_REQUIRED = [
    "id", "name", "province_id", "type", "lat", "lon",
    "opening_hours", "price_vnd", "tags", "source", "last_verified"
];

const ID_PATTERN = /^[a-z0-9_]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RANGES_PATTERN = /^\d{2}:\d{2}-\d{2}:\d{2}(,\d{2}:\d{2}-\d{2}:\d{2})*$/;

const DUPLICATE_POI_METERS = 100;
const STALE_DAYS = 365;

// ---------- hàm phụ ----------

export function normalizeName(text) {
    return String(text)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "d")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

export function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isStr = (v) => typeof v === "string" && v.trim() !== "";
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function parseDate(text) {
    if (!DATE_PATTERN.test(text)) return null;
    const d = new Date(`${text}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function toMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

// ---------- hàm chính ----------

/**
 * @param {{provinces, pois, edges, context, boundaries}} data  (mỗi phần có thể là null nếu file chưa có)
 * @param {{today?: Date, fileExists?: (path:string)=>boolean, strict?: boolean}} options
 * @returns {{errors: Issue[], warnings: Issue[]}}
 *
 * Lỗi (error): làm CI đỏ.
 * Cảnh báo "soft": thiếu dữ liệu hoặc lệch chuẩn; chế độ strict biến thành lỗi.
 * Cảnh báo "stale": dữ liệu cũ hơn 12 tháng (BR 11.2); chỉ gắn cờ, không bao giờ thành lỗi.
 */
export function validateData(data, options = {}) {
    const today = options.today ?? new Date();
    const issues = [];

    const error = (code, where, message) =>
        issues.push({ level: "error", code, where, message });
    const soft = (code, where, message) =>
        issues.push({ level: "warning", soft: true, code, where, message });
    const stale = (where, message) =>
        issues.push({ level: "warning", soft: false, code: "STALE", where, message });

    const provinces = data.provinces ?? null;
    const pois = data.pois ?? null;
    const edges = data.edges ?? null;
    const context = data.context ?? null;
    const boundaries = data.boundaries ?? null;

    for (const [name, value] of Object.entries({ provinces, pois, edges, context, boundaries })) {
        if (value === null) {
            soft("FILE_MISSING", name, `Chưa có dữ liệu "${name}" nên bỏ qua phần kiểm tra này.`);
        } else if (name !== "boundaries" && !Array.isArray(value)) {
            error("NOT_ARRAY", name, `"${name}" phải là một mảng.`);
        }
    }

    const provinceById = new Map();
    const poiById = new Map();

    // Kiểm tra ngày xác minh, dùng chung cho tỉnh và POI.
    const checkVerified = (where, value) => {
        if (value === null) {
            soft("NULL_VALUE", where, "last_verified chưa điền.");
            return;
        }
        const date = typeof value === "string" ? parseDate(value) : null;
        if (!date) {
            error("BAD_DATE", where, `last_verified "${value}" không đúng dạng YYYY-MM-DD.`);
            return;
        }
        const ageDays = (today.getTime() - date.getTime()) / 86400000;
        if (ageDays > STALE_DAYS) {
            stale(where, `Dữ liệu xác minh từ ${value}, cũ hơn 12 tháng, cần kiểm lại.`);
        }
    };

    // ---------- provinces ----------
    if (Array.isArray(provinces)) {
        provinces.forEach((p, i) => {
            const where = `provinces[${i}]${isStr(p?.id) ? ` (${p.id})` : ""}`;
            if (!isObj(p)) {
                error("NOT_OBJECT", where, "Phần tử phải là object.");
                return;
            }
            for (const field of PROVINCE_REQUIRED) {
                if (!(field in p)) error("MISSING_FIELD", where, `Thiếu trường bắt buộc "${field}".`);
            }
            if (!isStr(p.id) || !ID_PATTERN.test(p.id)) {
                error("BAD_ID", where, `id "${p.id}" phải là chữ thường không dấu, nối bằng gạch dưới.`);
            } else if (provinceById.has(p.id)) {
                error("DUPLICATE_ID", where, `id tỉnh "${p.id}" bị trùng.`);
            } else {
                provinceById.set(p.id, p);
            }
            if ("name" in p && !isStr(p.name)) error("BAD_VALUE", where, "name phải là chuỗi không rỗng.");

            for (const field of ["terrain_primary", "terrain_secondary"]) {
                const v = p[field];
                if (v != null && !TERRAINS.includes(v)) {
                    soft("TERRAIN_UNKNOWN", where,
                        `${field} "${v}" không nằm trong danh sách của schema (${TERRAINS.join(", ")}).`);
                }
            }
            if ("map_color" in p && !(typeof p.map_color === "string" && /^#[0-9a-fA-F]{6}$/.test(p.map_color))) {
                error("BAD_COLOR", where, `map_color "${p.map_color}" phải có dạng #RRGGBB.`);
            }
            if ("center" in p) {
                const ok = Array.isArray(p.center) && p.center.length === 2 && p.center.every(isNum);
                if (!ok) error("BAD_VALUE", where, "center phải là [vĩ độ, kinh độ].");
            }
            if ("bbox" in p) {
                const b = p.bbox;
                const ok =
                    Array.isArray(b) && b.length === 4 && b.every(isNum) && b[0] < b[2] && b[1] < b[3];
                if (!ok) error("BAD_BBOX", where, "bbox phải là [minLon, minLat, maxLon, maxLat] với min nhỏ hơn max.");
            }
            if ("is_demo" in p && typeof p.is_demo !== "boolean") {
                error("BAD_VALUE", where, "is_demo phải là true hoặc false.");
            }
            if (isStr(p.puzzle_image) && options.fileExists && !options.fileExists(p.puzzle_image)) {
                soft("IMAGE_MISSING", where, `Không thấy ảnh puzzle "${p.puzzle_image}".`);
            }
            if ("source" in p && !isStr(p.source)) soft("NULL_VALUE", where, "source chưa điền.");
            if ("last_verified" in p) checkVerified(where, p.last_verified);
        });
    }

    // ---------- pois ----------
    if (Array.isArray(pois)) {
        pois.forEach((p, i) => {
            const where = `pois[${i}]${isStr(p?.id) ? ` (${p.id})` : ""}`;
            if (!isObj(p)) {
                error("NOT_OBJECT", where, "Phần tử phải là object.");
                return;
            }
            for (const field of POI_REQUIRED) {
                if (!(field in p)) error("MISSING_FIELD", where, `Thiếu trường bắt buộc "${field}".`);
            }
            if (!isStr(p.id)) {
                error("BAD_ID", where, "id phải là chuỗi không rỗng.");
            } else if (poiById.has(p.id)) {
                error("DUPLICATE_ID", where, `id POI "${p.id}" bị trùng.`);
            } else {
                poiById.set(p.id, p);
            }
            if ("name" in p && !isStr(p.name)) error("BAD_VALUE", where, "name phải là chuỗi không rỗng.");

            const province = provinceById.get(p.province_id);
            if ("province_id" in p) {
                if (Array.isArray(provinces) && !province) {
                    error("UNKNOWN_PROVINCE", where, `province_id "${p.province_id}" không có trong provinces.json.`);
                }
            }
            if ("type" in p && !POI_TYPES.includes(p.type)) {
                error("BAD_TYPE", where, `type "${p.type}" không hợp lệ (${POI_TYPES.join(", ")}).`);
            }
            if ("tags" in p && !(Array.isArray(p.tags) && p.tags.every((t) => typeof t === "string"))) {
                error("BAD_VALUE", where, "tags phải là mảng chuỗi.");
            }

            // Toạ độ: BR-11.3, phải nằm trong khung của tỉnh.
            if ("lat" in p && "lon" in p) {
                if (p.lat === null && p.lon === null) {
                    soft("NULL_VALUE", where, "Chưa có toạ độ (lat, lon).");
                } else if (!isNum(p.lat) || !isNum(p.lon)) {
                    error("BAD_COORD", where, "lat và lon phải cùng là số (hoặc cùng để null).");
                } else if (province && Array.isArray(province.bbox) && province.bbox.length === 4) {
                    const [minLon, minLat, maxLon, maxLat] = province.bbox;
                    const inside = p.lon >= minLon && p.lon <= maxLon && p.lat >= minLat && p.lat <= maxLat;
                    if (!inside) {
                        error("OUT_OF_BBOX", where,
                            `Toạ độ (${p.lat}, ${p.lon}) nằm ngoài khung của tỉnh ${p.province_id}.`);
                    }
                }
            }

            // Giá: BR-11.3, số dương.
            if ("price_vnd" in p) {
                if (p.price_vnd === null) soft("NULL_VALUE", where, "Chưa có giá (price_vnd).");
                else if (!isNum(p.price_vnd) || p.price_vnd <= 0) {
                    error("BAD_PRICE", where, `price_vnd "${p.price_vnd}" phải là số dương (VND).`);
                }
            }

            if (p.popularity != null && !(isNum(p.popularity) && p.popularity >= 0 && p.popularity <= 1)) {
                error("BAD_POPULARITY", where, `popularity "${p.popularity}" phải nằm trong khoảng 0 đến 1.`);
            }

            // Giờ mở cửa: BR-11.3, phải nhất quán.
            if ("opening_hours" in p) {
                if (p.opening_hours === null) {
                    soft("NULL_VALUE", where, "Chưa có giờ mở cửa.");
                } else if (!isObj(p.opening_hours)) {
                    error("BAD_HOURS", where, "opening_hours phải là object theo thứ (mon..sun).");
                } else {
                    let anyNull = false;
                    for (const day of DAYS) {
                        const v = p.opening_hours[day];
                        if (v === undefined) {
                            error("BAD_HOURS", where, `opening_hours thiếu ngày "${day}".`);
                        } else if (v === null) {
                            anyNull = true;
                        } else if (v !== "closed") {
                            if (typeof v !== "string" || !TIME_RANGES_PATTERN.test(v)) {
                                error("BAD_HOURS", where, `Giờ ${day} "${v}" sai dạng (ví dụ 07:00-17:00).`);
                            } else {
                                for (const range of v.split(",")) {
                                    const [from, to] = range.split("-");
                                    const f = toMinutes(from);
                                    const t = toMinutes(to);
                                    if (f >= t || t > 24 * 60 || f < 0) {
                                        error("BAD_HOURS", where, `Giờ ${day} "${range}" có giờ đóng không sau giờ mở.`);
                                    }
                                }
                            }
                        }
                    }
                    if (anyNull) soft("NULL_VALUE", where, "Giờ mở cửa còn ô chưa điền.");
                }
            }

            if (p.type === "attraction") {
                const vm = p.visit_minutes;
                if (vm == null) {
                    soft("NULL_VALUE", where, "Điểm tham quan chưa có visit_minutes.");
                } else if (!(isObj(vm) && isNum(vm.short) && isNum(vm.long) && vm.short > 0 && vm.short <= vm.long)) {
                    error("BAD_VISIT", where, "visit_minutes phải có short và long là số dương, short không lớn hơn long.");
                }
                if (p.difficulty == null) soft("NULL_VALUE", where, "Điểm tham quan chưa có difficulty.");
            }
            if (p.difficulty != null && !DIFFICULTIES.includes(p.difficulty)) {
                error("BAD_VALUE", where, `difficulty "${p.difficulty}" phải là easy, moderate hoặc hard.`);
            }

            if ("source" in p && !isStr(p.source)) soft("NULL_VALUE", where, "source chưa điền.");
            if ("last_verified" in p) checkVerified(where, p.last_verified);
        });

        // POI trùng: cùng tên (bỏ dấu) trong cùng tỉnh, và gần nhau hoặc chưa có toạ độ.
        const seen = new Map();
        for (const p of poiById.values()) {
            if (!isStr(p.name)) continue;
            const key = `${p.province_id}|${normalizeName(p.name)}`;
            if (!seen.has(key)) seen.set(key, []);
            seen.get(key).push(p);
        }
        for (const group of seen.values()) {
            for (let a = 0; a < group.length; a++) {
                for (let b = a + 1; b < group.length; b++) {
                    const x = group[a];
                    const y = group[b];
                    const hasCoords = isNum(x.lat) && isNum(x.lon) && isNum(y.lat) && isNum(y.lon);
                    const meters = hasCoords ? haversineMeters(x.lat, x.lon, y.lat, y.lon) : null;
                    if (meters === null || meters <= DUPLICATE_POI_METERS) {
                        error("DUPLICATE_POI", `pois (${x.id}, ${y.id})`,
                            `Hai POI trùng nhau: "${x.name}"${meters === null ? " (chưa có toạ độ để phân biệt)" : ` cách nhau ${Math.round(meters)} m`}.`);
                    }
                }
            }
        }
    }

    // ---------- edges ----------
    if (Array.isArray(edges)) {
        const directed = new Map();
        edges.forEach((e, i) => {
            const where = `edges[${i}]`;
            if (!isObj(e)) {
                error("NOT_OBJECT", where, "Phần tử phải là object.");
                return;
            }
            for (const field of ["from", "to", "minutes", "km", "cost_vnd"]) {
                if (!(field in e)) error("MISSING_FIELD", where, `Thiếu trường "${field}".`);
            }
            if (Array.isArray(pois)) {
                for (const end of ["from", "to"]) {
                    if (e[end] !== undefined && !poiById.has(e[end])) {
                        error("UNKNOWN_POI", where, `"${end}" = "${e[end]}" không có trong pois.json.`);
                    }
                }
            }
            if (e.from !== undefined && e.from === e.to) {
                error("SELF_EDGE", where, `Cạnh nối "${e.from}" với chính nó.`);
            }
            for (const field of ["minutes", "km", "cost_vnd"]) {
                if (field in e && !(isNum(e[field]) && e[field] >= 0)) {
                    error("BAD_VALUE", where, `${field} "${e[field]}" phải là số không âm.`);
                }
            }
            const key = `${e.from}>${e.to}`;
            if (directed.has(key)) {
                error("EDGE_DUPLICATE", where, `Cạnh ${e.from} → ${e.to} bị lặp.`);
            } else {
                directed.set(key, e);
            }
        });

        const reported = new Set();
        for (const [key, e] of directed) {
            const reverse = directed.get(`${e.to}>${e.from}`);
            if (!reverse) continue;
            const pairKey = [e.from, e.to].sort().join("|");
            if (reported.has(pairKey)) continue;
            reported.add(pairKey);
            const same = reverse.minutes === e.minutes && reverse.km === e.km && reverse.cost_vnd === e.cost_vnd;
            if (!same) {
                error("EDGE_CONFLICT", `edges (${e.from}, ${e.to})`,
                    "Hai chiều của cùng một cạnh có số liệu khác nhau.");
            } else {
                soft("EDGE_BOTH_DIRECTIONS", `edges (${e.from}, ${e.to})`,
                    "Cạnh vô hướng đang lưu hai lần (schema yêu cầu lưu một lần).");
            }
        }
    }

    // ---------- context ----------
    if (Array.isArray(context)) {
        const seenContext = new Set();
        context.forEach((c, i) => {
            const where = `context[${i}]`;
            if (!isObj(c)) {
                error("NOT_OBJECT", where, "Phần tử phải là object.");
                return;
            }
            if (Array.isArray(provinces) && !provinceById.has(c.province_id)) {
                error("UNKNOWN_PROVINCE", where, `province_id "${c.province_id}" không có trong provinces.json.`);
            }
            if (!(Number.isInteger(c.month) && c.month >= 1 && c.month <= 12)) {
                error("BAD_MONTH", where, `month "${c.month}" phải là số nguyên từ 1 đến 12.`);
            }
            const key = `${c.province_id}|${c.month}`;
            if (seenContext.has(key)) error("DUPLICATE_ID", where, `Tỉnh ${c.province_id} tháng ${c.month} bị lặp.`);
            seenContext.add(key);
            if (c.avg_temp_c != null && !isNum(c.avg_temp_c)) error("BAD_VALUE", where, "avg_temp_c phải là số.");
            if (c.rain_mm != null && !(isNum(c.rain_mm) && c.rain_mm >= 0)) {
                error("BAD_VALUE", where, "rain_mm phải là số không âm.");
            }
            const empty = ["season", "storm_flood_risk", "crowd_level", "price_level"].filter((f) => c[f] == null);
            if (empty.length) soft("NULL_VALUE", where, `Chưa điền: ${empty.join(", ")}.`);
        });
    }

    // ---------- boundaries ----------
    if (boundaries !== null) {
        const collections = Array.isArray(boundaries) ? boundaries : [boundaries];
        const features = collections.flatMap((fc) => (isObj(fc) && Array.isArray(fc.features) ? fc.features : []));
        if (features.length === 0) {
            error("BAD_GEOJSON", "boundaries", "Không tìm thấy feature nào trong boundaries.geojson.");
        }
        const featureIds = new Set();
        features.forEach((f, i) => {
            const where = `boundaries[${i}]`;
            const id = f?.properties?.id;
            if (!isStr(id)) {
                error("BAD_GEOJSON", where, "Feature thiếu properties.id.");
                return;
            }
            if (featureIds.has(id)) error("DUPLICATE_ID", where, `properties.id "${id}" bị lặp.`);
            featureIds.add(id);
            const type = f?.geometry?.type;
            if (type !== "Polygon" && type !== "MultiPolygon") {
                error("BAD_GEOJSON", where, `geometry của "${id}" phải là Polygon hoặc MultiPolygon.`);
            }
            if (Array.isArray(provinces) && !provinceById.has(id)) {
                error("BOUNDARY_ID_MISMATCH", where, `properties.id "${id}" không khớp tỉnh nào trong provinces.json.`);
            }
        });
        if (Array.isArray(provinces)) {
            for (const id of provinceById.keys()) {
                if (!featureIds.has(id)) {
                    error("BOUNDARY_ID_MISMATCH", "boundaries", `Tỉnh "${id}" không có ranh giới trong boundaries.geojson.`);
                }
            }
        }
    }

    // Chế độ strict: cảnh báo "soft" trở thành lỗi. Cảnh báo STALE thì không bao giờ.
    if (options.strict) {
        for (const issue of issues) {
            if (issue.level === "warning" && issue.soft) issue.level = "error";
        }
    }

    return {
        errors: issues.filter((x) => x.level === "error"),
        warnings: issues.filter((x) => x.level === "warning")
    };
}

// Gom các vấn đề cùng loại để báo cáo gọn.
export function formatReport(result, { verbose = false, perGroup = 3 } = {}) {
    const lines = [];
    const section = (title, list) => {
        if (list.length === 0) return;
        lines.push(`${title} (${list.length})`);
        const groups = new Map();
        for (const issue of list) {
            if (!groups.has(issue.code)) groups.set(issue.code, []);
            groups.get(issue.code).push(issue);
        }
        for (const [code, group] of groups) {
            lines.push(`  [${code}] ${group.length} chỗ`);
            const shown = verbose ? group : group.slice(0, perGroup);
            for (const issue of shown) lines.push(`    - ${issue.where}: ${issue.message}`);
            if (shown.length < group.length) {
                lines.push(`    ... và ${group.length - shown.length} chỗ nữa (thêm --verbose để xem hết)`);
            }
        }
    };
    section("LỖI", result.errors);
    section("CẢNH BÁO", result.warnings);
    if (lines.length === 0) lines.push("Dữ liệu hợp lệ, không có cảnh báo.");
    return lines.join("\n");
}

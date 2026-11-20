import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    validateData,
    formatReport,
    normalizeName,
    haversineMeters
} from "../../src/VietNamTrip.Core/dataValidator.js";

const TODAY = new Date("2026-11-20T00:00:00Z");

// Bộ dữ liệu nhỏ, hợp lệ hoàn toàn. Mỗi test sửa đúng một chỗ.
function makeData() {
    const hours = Object.fromEntries(
        ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, "07:00-17:00"])
    );
    return {
        provinces: [
            {
                id: "lam_dong",
                name: "Lâm Đồng",
                terrain_primary: "mountain",
                terrain_secondary: "forest",
                map_color: "#708090",
                center: [11.69, 107.98],
                bbox: [107.2, 10.48, 108.96, 12.81],
                puzzle_image: "picture/lamdong.webp",
                is_demo: true,
                source: "https://example.com",
                last_verified: "2026-10-18"
            }
        ],
        pois: [
            {
                id: "puppy_farm",
                name: "Puppy Farm",
                province_id: "lam_dong",
                type: "attraction",
                lat: 11.9,
                lon: 108.4,
                opening_hours: hours,
                visit_minutes: { short: 60, long: 120 },
                price_vnd: 120000,
                tags: ["outdoor"],
                difficulty: "easy",
                popularity: 0.5,
                source: "https://example.com",
                last_verified: "2026-10-18"
            },
            {
                id: "nam_nuong",
                name: "Nậm Nướng Đà Lạt",
                province_id: "lam_dong",
                type: "restaurant",
                lat: 11.95,
                lon: 108.45,
                opening_hours: hours,
                visit_minutes: { short: 60, long: 90 },
                price_vnd: 90000,
                tags: ["restaurant"],
                difficulty: null,
                popularity: null,
                source: "https://example.com",
                last_verified: "2026-10-18"
            }
        ],
        edges: [{ from: "puppy_farm", to: "nam_nuong", minutes: 16, km: 7.4, cost_vnd: 0 }],
        context: [
            {
                province_id: "lam_dong",
                month: 1,
                avg_temp_c: 17.5,
                rain_mm: 15,
                season: "dry",
                storm_flood_risk: "low",
                crowd_level: "high",
                price_level: "peak"
            }
        ],
        boundaries: [
            {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        properties: { id: "lam_dong" },
                        geometry: { type: "Polygon", coordinates: [[[107, 10], [108, 10], [108, 11], [107, 10]]] }
                    }
                ]
            }
        ]
    };
}

const run = (data, options = {}) => validateData(data, { today: TODAY, ...options });
const codes = (list) => list.map((x) => x.code);

describe("validateData: dữ liệu hợp lệ", () => {
    it("không có lỗi và không có cảnh báo", () => {
        const result = run(makeData(), { fileExists: () => true });
        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([]);
    });

    it("chấp nhận boundaries là một FeatureCollection đơn", () => {
        const data = makeData();
        data.boundaries = data.boundaries[0];
        expect(run(data).errors).toEqual([]);
    });
});

describe("validateData: toạ độ (BR-11.3)", () => {
    it("báo lỗi khi toạ độ nằm ngoài bbox của tỉnh", () => {
        const data = makeData();
        data.pois[0].lat = 21.0;
        const result = run(data);
        expect(codes(result.errors)).toContain("OUT_OF_BBOX");
    });

    it("chấp nhận toạ độ nằm đúng trên biên bbox", () => {
        const data = makeData();
        data.pois[0].lon = 107.2;
        expect(run(data).errors).toEqual([]);
    });

    it("chỉ cảnh báo khi chưa có toạ độ", () => {
        const data = makeData();
        data.pois[0].lat = null;
        data.pois[0].lon = null;
        const result = run(data);
        expect(result.errors).toEqual([]);
        expect(codes(result.warnings)).toContain("NULL_VALUE");
    });

    it("báo lỗi khi chỉ có lat mà thiếu lon", () => {
        const data = makeData();
        data.pois[0].lon = null;
        expect(codes(run(data).errors)).toContain("BAD_COORD");
    });
});

describe("validateData: giá (BR-11.3)", () => {
    it.each([0, -5000, "120000", NaN])("báo lỗi khi price_vnd = %s", (value) => {
        const data = makeData();
        data.pois[0].price_vnd = value;
        expect(codes(run(data).errors)).toContain("BAD_PRICE");
    });

    it("chỉ cảnh báo khi chưa có giá", () => {
        const data = makeData();
        data.pois[0].price_vnd = null;
        const result = run(data);
        expect(result.errors).toEqual([]);
        expect(codes(result.warnings)).toContain("NULL_VALUE");
    });

    it("báo lỗi khi popularity ngoài khoảng 0 đến 1", () => {
        const data = makeData();
        data.pois[0].popularity = 1.5;
        expect(codes(run(data).errors)).toContain("BAD_POPULARITY");
    });
});

describe("validateData: POI trùng (BR-11.3)", () => {
    it("báo lỗi khi cùng tên (khác dấu, khác hoa thường) và cách nhau dưới 100 m", () => {
        const data = makeData();
        data.pois.push({ ...data.pois[0], id: "puppy_farm_2", name: "PUPPY FARM", lat: 11.9003 });
        expect(codes(run(data).errors)).toContain("DUPLICATE_POI");
    });

    it("không báo lỗi khi cùng tên nhưng cách xa nhau", () => {
        const data = makeData();
        data.pois.push({ ...data.pois[0], id: "puppy_farm_2", lat: 12.5 });
        expect(codes(run(data).errors)).not.toContain("DUPLICATE_POI");
    });

    it("báo lỗi khi cùng tên và chưa có toạ độ để phân biệt", () => {
        const data = makeData();
        data.pois.push({ ...data.pois[0], id: "puppy_farm_2", lat: null, lon: null });
        data.pois[0].lat = null;
        data.pois[0].lon = null;
        expect(codes(run(data).errors)).toContain("DUPLICATE_POI");
    });

    it("báo lỗi khi id POI bị trùng", () => {
        const data = makeData();
        data.pois.push({ ...data.pois[1], name: "Quán khác" });
        expect(codes(run(data).errors)).toContain("DUPLICATE_ID");
    });
});

describe("validateData: tham chiếu giữa các file", () => {
    it("báo lỗi khi province_id của POI không tồn tại", () => {
        const data = makeData();
        data.pois[0].province_id = "khong_co";
        expect(codes(run(data).errors)).toContain("UNKNOWN_PROVINCE");
    });

    it("báo lỗi khi cạnh trỏ tới POI không có", () => {
        const data = makeData();
        data.edges[0].to = "ma_khong_co";
        expect(codes(run(data).errors)).toContain("UNKNOWN_POI");
    });

    it("báo lỗi khi context trỏ tới tỉnh không có hoặc tháng sai", () => {
        const data = makeData();
        data.context[0].province_id = "khong_co";
        data.context[0].month = 13;
        const found = codes(run(data).errors);
        expect(found).toContain("UNKNOWN_PROVINCE");
        expect(found).toContain("BAD_MONTH");
    });

    it("báo lỗi khi id ranh giới không khớp tỉnh", () => {
        const data = makeData();
        data.boundaries[0].features[0].properties.id = "lam-dong";
        const found = run(data).errors;
        expect(codes(found)).toContain("BOUNDARY_ID_MISMATCH");
        // Báo cả hai chiều: id lạ trong ranh giới, và tỉnh thiếu ranh giới.
        expect(found.filter((e) => e.code === "BOUNDARY_ID_MISMATCH")).toHaveLength(2);
    });

    it("báo lỗi khi id tỉnh dùng gạch ngang thay vì gạch dưới", () => {
        const data = makeData();
        data.provinces[0].id = "lam-dong";
        expect(codes(run(data).errors)).toContain("BAD_ID");
    });
});

describe("validateData: cạnh (edges)", () => {
    it("báo lỗi khi cạnh bị lặp cùng chiều", () => {
        const data = makeData();
        data.edges.push({ ...data.edges[0] });
        expect(codes(run(data).errors)).toContain("EDGE_DUPLICATE");
    });

    it("chỉ cảnh báo khi cạnh lưu hai chiều với số liệu giống nhau", () => {
        const data = makeData();
        data.edges.push({ from: "nam_nuong", to: "puppy_farm", minutes: 16, km: 7.4, cost_vnd: 0 });
        const result = run(data);
        expect(result.errors).toEqual([]);
        expect(codes(result.warnings)).toContain("EDGE_BOTH_DIRECTIONS");
    });

    it("báo lỗi khi hai chiều có số liệu khác nhau", () => {
        const data = makeData();
        data.edges.push({ from: "nam_nuong", to: "puppy_farm", minutes: 30, km: 7.4, cost_vnd: 0 });
        expect(codes(run(data).errors)).toContain("EDGE_CONFLICT");
    });

    it("báo lỗi khi cạnh nối POI với chính nó hoặc có số âm", () => {
        const data = makeData();
        data.edges.push({ from: "puppy_farm", to: "puppy_farm", minutes: -1, km: 1, cost_vnd: 0 });
        const found = codes(run(data).errors);
        expect(found).toContain("SELF_EDGE");
        expect(found).toContain("BAD_VALUE");
    });
});

describe("validateData: giờ mở cửa", () => {
    it("chấp nhận nhiều khoảng giờ, 'closed' và 24:00", () => {
        const data = makeData();
        data.pois[0].opening_hours.mon = "11:00-14:00,17:00-22:00";
        data.pois[0].opening_hours.tue = "closed";
        data.pois[0].opening_hours.wed = "00:00-24:00";
        expect(run(data).errors).toEqual([]);
    });

    it.each(["7h-17h", "17:00-07:00", "09:00-09:00", "25:00-26:00"])(
        "báo lỗi khi giờ là %s", (value) => {
            const data = makeData();
            data.pois[0].opening_hours.mon = value;
            expect(codes(run(data).errors)).toContain("BAD_HOURS");
        }
    );

    it("báo lỗi khi thiếu một ngày trong tuần", () => {
        const data = makeData();
        delete data.pois[0].opening_hours.sun;
        expect(codes(run(data).errors)).toContain("BAD_HOURS");
    });

    it("chỉ cảnh báo khi giờ còn null", () => {
        const data = makeData();
        data.pois[0].opening_hours.mon = null;
        const result = run(data);
        expect(result.errors).toEqual([]);
        expect(codes(result.warnings)).toContain("NULL_VALUE");
    });
});

describe("validateData: cấu trúc và schema", () => {
    it("báo lỗi khi POI thiếu hẳn một trường bắt buộc", () => {
        const data = makeData();
        delete data.pois[0].source;
        expect(codes(run(data).errors)).toContain("MISSING_FIELD");
    });

    it("báo lỗi khi type không hợp lệ", () => {
        const data = makeData();
        data.pois[0].type = "cinema";
        expect(codes(run(data).errors)).toContain("BAD_TYPE");
    });

    it("báo lỗi khi bbox sai thứ tự", () => {
        const data = makeData();
        data.provinces[0].bbox = [108.9, 12.8, 107.2, 10.4];
        expect(codes(run(data).errors)).toContain("BAD_BBOX");
    });

    it("báo lỗi khi map_color sai dạng", () => {
        const data = makeData();
        data.provinces[0].map_color = "xanh";
        expect(codes(run(data).errors)).toContain("BAD_COLOR");
    });

    it("báo lỗi khi điểm tham quan có visit_minutes short lớn hơn long", () => {
        const data = makeData();
        data.pois[0].visit_minutes = { short: 200, long: 100 };
        expect(codes(run(data).errors)).toContain("BAD_VISIT");
    });

    it("chỉ cảnh báo khi tên địa hình ngoài danh sách của schema", () => {
        const data = makeData();
        data.provinces[0].terrain_primary = "plains";
        const result = run(data);
        expect(result.errors).toEqual([]);
        expect(codes(result.warnings)).toContain("TERRAIN_UNKNOWN");
    });

    it("chỉ cảnh báo khi ảnh puzzle không tồn tại", () => {
        const result = run(makeData(), { fileExists: () => false });
        expect(result.errors).toEqual([]);
        expect(codes(result.warnings)).toContain("IMAGE_MISSING");
    });
});

describe("validateData: dữ liệu cũ (BR 11.2)", () => {
    it("gắn cờ khi last_verified cũ hơn 12 tháng, không làm đỏ", () => {
        const data = makeData();
        data.pois[0].last_verified = "2025-01-01";
        const result = run(data);
        expect(result.errors).toEqual([]);
        expect(codes(result.warnings)).toContain("STALE");
    });

    it("không gắn cờ khi vừa đủ trong 12 tháng", () => {
        const data = makeData();
        data.pois[0].last_verified = "2025-11-21";
        expect(codes(run(data).warnings)).not.toContain("STALE");
    });

    it("báo lỗi khi last_verified sai dạng ngày", () => {
        const data = makeData();
        data.pois[0].last_verified = "20/11/2026";
        expect(codes(run(data).errors)).toContain("BAD_DATE");
    });
});

describe("validateData: file thiếu và chế độ strict", () => {
    it("file thiếu chỉ là cảnh báo, các file còn lại vẫn được kiểm", () => {
        const data = makeData();
        data.edges = null;
        data.pois[0].price_vnd = -1;
        const result = run(data);
        expect(codes(result.warnings)).toContain("FILE_MISSING");
        expect(codes(result.errors)).toEqual(["BAD_PRICE"]);
    });

    it("strict biến cảnh báo thiếu dữ liệu thành lỗi", () => {
        const data = makeData();
        data.edges = null;
        data.pois[0].price_vnd = null;
        const result = run(data, { strict: true });
        expect(codes(result.errors)).toEqual(expect.arrayContaining(["FILE_MISSING", "NULL_VALUE"]));
    });

    it("strict không biến cảnh báo dữ liệu cũ thành lỗi", () => {
        const data = makeData();
        data.pois[0].last_verified = "2024-01-01";
        const result = run(data, { strict: true });
        expect(result.errors).toEqual([]);
        expect(codes(result.warnings)).toContain("STALE");
    });
});

describe("hàm phụ", () => {
    it("normalizeName bỏ dấu, đổi đ, hạ chữ thường", () => {
        expect(normalizeName("  Đà   Lạt ")).toBe("da lat");
        expect(normalizeName("Nậm Nướng")).toBe("nam nuong");
    });

    it("haversineMeters ra khoảng cách hợp lý", () => {
        expect(haversineMeters(10, 106, 10, 106)).toBe(0);
        // 1 độ vĩ độ ≈ 111 km
        expect(haversineMeters(10, 106, 11, 106)).toBeGreaterThan(110000);
        expect(haversineMeters(10, 106, 11, 106)).toBeLessThan(112000);
    });

    it("formatReport gom theo loại và báo dữ liệu sạch", () => {
        expect(formatReport({ errors: [], warnings: [] })).toContain("hợp lệ");
        const text = formatReport({
            errors: [1, 2, 3, 4, 5].map((n) => ({ code: "BAD_PRICE", where: `pois[${n}]`, message: "x" })),
            warnings: []
        });
        expect(text).toContain("LỖI (5)");
        expect(text).toContain("và 2 chỗ nữa");
    });
});

describe("dữ liệu thật trong data/", () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const read = (name) => {
        const full = path.join(root, "data", name);
        return fs.existsSync(full) ? JSON.parse(fs.readFileSync(full, "utf8")) : null;
    };

    it("không có lỗi (cảnh báo thì được)", () => {
        const result = validateData(
            {
                provinces: read("provinces.json"),
                pois: read("pois.json"),
                edges: read("edges.json"),
                context: read("context.json"),
                boundaries: read("boundaries.geojson")
            },
            { today: new Date(), fileExists: (p) => fs.existsSync(path.join(root, p)) }
        );
        expect(result.errors).toEqual([]);
    });
});

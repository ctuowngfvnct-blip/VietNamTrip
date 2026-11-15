import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    vi
} from "vitest";

import {
    getUnlockedProvinceIds,
    completeProvince,
    saveProgress,
    loadProgress
} from "../../src/VietNamTrip.Core/progress.js";

beforeEach(() => {
    const storage = new Map();

    vi.stubGlobal("localStorage", {
        setItem(key, value) {
            storage.set(key, String(value));
        },

        getItem(key) {
            return storage.has(key) ? storage.get(key) : null;
        },

        removeItem(key) {
            storage.delete(key);
        },

        clear() {
            storage.clear();
        }
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

const provinces = [
    { id: "lam_dong", name: "Lâm Đồng" },
    { id: "tuyen_quang", name: "Tuyên Quang" },
    { id: "cao_bang", name: "Cao Bằng" }
];

describe("Province Progress Tests", () => {

    it("should unlock Lam Dong by default", () => {
        const unlocked = getUnlockedProvinceIds(provinces);

        expect(unlocked).toEqual(["lam_dong"]);
    });

    it("should unlock Tuyen Quang after completing Lam Dong", () => {
        const unlocked = getUnlockedProvinceIds(
            provinces,
            ["lam_dong"]
        );

        expect(unlocked).toEqual(["lam_dong", "tuyen_quang"]);
    });

    it("should unlock Cao Bang after completing Tuyen Quang", () => {
        const unlocked = getUnlockedProvinceIds(
            provinces,
            ["lam_dong", "tuyen_quang"]
        );

        expect(unlocked).toEqual([
            "lam_dong",
            "tuyen_quang",
            "cao_bang"
        ]);
    });

    it("should not unlock the next province before completing the current one", () => {
        const unlocked = getUnlockedProvinceIds(
            provinces,
            []
        );

        expect(unlocked).toEqual(["lam_dong"]);
    });
    it("should add a completed province", () => {
        const completed = completeProvince(
            "lam_dong",
            []
        );

        expect(completed).toEqual(["lam_dong"]);
    });

    it("should not add a province twice", () => {
        const completed = completeProvince(
            "lam_dong",
            ["lam_dong"]
        );

        expect(completed).toEqual(["lam_dong"]);
    });

    it("should save and load completed provinces", () => {
        const completed = ["lam_dong", "tuyen_quang"];

        saveProgress(completed);

        const loaded = loadProgress();

        expect(loaded).toEqual(completed);
    });

    it("should return an empty array when no progress is saved", () => {
        const loaded = loadProgress();

        expect(loaded).toEqual([]);
    });

    it("should return an empty array when saved data is invalid", () => {
        localStorage.setItem("vietnamtrip_progress", "invalid-json");

        const loaded = loadProgress();

        expect(loaded).toEqual([]);
    });

    it("should return an empty array when saved data is not an array", () => {
        localStorage.setItem(
            "vietnamtrip_progress",
            JSON.stringify({ progress: "hello" })
        );

        const loaded = loadProgress();

        expect(loaded).toEqual([]);
    });
});
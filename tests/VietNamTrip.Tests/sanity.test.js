import { describe, it, expect } from "vitest";

// Test mẫu để kiểm tra môi trường. Sẽ xoá khi có test thật.
describe("sanity", () => {
 it("chạy được", () => {
 expect(1 + 1).toBe(2);
 });
});

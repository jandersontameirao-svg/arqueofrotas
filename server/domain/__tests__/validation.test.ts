import { describe, it, expect } from "vitest";
import { decodePhoto } from "../evidence";
import { itemTotal } from "../money";
import { csvCell, csvDocument } from "../reports";
import { png } from "./fixtures";
describe("Evidence, monetary and export boundaries", () => {
  it("accepts data URLs and raw base64 and derives the MIME from content", () => {
    expect(decodePhoto(png).mimeType).toBe("image/png");
    expect(
      decodePhoto(`data:image/png;base64,${png}`, "../foto.png").fileName
    ).not.toContain("/");
    expect(() => decodePhoto(`data:image/jpeg;base64,${png}`)).toThrow();
    expect(() => decodePhoto("bm90LWFuLWltYWdl")).toThrow();
  });
  it("calculates decimal totals without trusting a client-supplied sum", () => {
    expect(itemTotal("3", "0.10")).toBe("0.30");
    expect(itemTotal("0.50", "0.01")).toBe("0.01");
    for (const value of ["-1", "NaN", "1e3", "2.001"])
      expect(() => itemTotal(value, "1.00")).toThrow();
    expect(() => itemTotal("2", "10", "10")).toThrow();
  });
  it("escapes separators, newlines, quotes and spreadsheet formulas", () => {
    expect(csvCell("=CMD()")).toBe('"\'=CMD()"');
    expect(
      csvDocument([{ name: "A;B", description: '"teste"\nlinha' }])
    ).toContain('"A;B"');
    expect(csvDocument([{ name: "ação" }]).charCodeAt(0)).toBe(0xfeff);
  });
});

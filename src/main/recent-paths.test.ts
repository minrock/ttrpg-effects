import { describe, expect, it } from "vitest";
import { addRecentPath, removeRecentPath } from "./recent-paths";

describe("recent paths", () => {
  it("adds the newest path first and removes duplicates", () => {
    expect(addRecentPath(["/a.ttrpgscene", "/b.ttrpgscene"], "/b.ttrpgscene")).toEqual([
      "/b.ttrpgscene",
      "/a.ttrpgscene"
    ]);
  });

  it("keeps only the configured maximum amount of paths", () => {
    expect(addRecentPath(["/1", "/2", "/3", "/4", "/5"], "/6")).toEqual([
      "/6",
      "/1",
      "/2",
      "/3",
      "/4"
    ]);
  });

  it("removes broken paths", () => {
    expect(removeRecentPath(["/a", "/b", "/c"], "/b")).toEqual(["/a", "/c"]);
  });
});

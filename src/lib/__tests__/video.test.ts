import { describe, expect, it } from "vitest";

import { lerLinkVideo, urlCapa, urlPlayer } from "../video";

describe("links de vídeo", () => {
  it("reconhece os formatos do YouTube", () => {
    for (const link of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "youtube.com/shorts/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ]) {
      expect(lerLinkVideo(link)).toMatchObject({ origem: "youtube", id: "dQw4w9WgXcQ" });
    }
  });
  it("Drive: só arquivo; pasta, documento e outros sites não", () => {
    expect(lerLinkVideo("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/view?usp=sharing")).toMatchObject({
      origem: "drive",
      id: "1AbCdEfGhIjKlMnOpQrStUv",
    });
    expect(lerLinkVideo("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUv")).toBeNull();
    expect(lerLinkVideo("https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUv/edit")).toBeNull();
    expect(lerLinkVideo("https://vimeo.com/123")).toBeNull();
    expect(lerLinkVideo("https://www.youtube.com/watch?v=curto")).toBeNull();
    expect(lerLinkVideo("")).toBeNull();
  });
  it("player e capa ficam no site (embed), com a resourcekey do Drive quando houver", () => {
    const yt = { origem: "youtube" as const, origemId: "dQw4w9WgXcQ", link: "" };
    expect(urlPlayer(yt)).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&playsinline=1");
    expect(urlCapa(yt)).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    const drive = { origem: "drive" as const, origemId: "1AbCdEfGhIjKlMnOpQrStUv", link: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/view?resourcekey=0-xyz" };
    expect(urlPlayer(drive)).toBe("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/preview?resourcekey=0-xyz");
  });
});

describe("formato", () => {
  it("YouTube Shorts é em pé", async () => {
    const { ehShorts } = await import("../video");
    expect(ehShorts({ origem: "youtube", link: "https://youtube.com/shorts/dQw4w9WgXcQ" })).toBe(true);
    expect(ehShorts({ origem: "youtube", link: "https://youtu.be/dQw4w9WgXcQ" })).toBe(false);
    expect(ehShorts({ origem: "drive", link: "https://drive.google.com/file/d/x/view" })).toBe(false);
  });
});

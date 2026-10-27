import { describe, expect, it } from "vitest";

import { lerLinkDrive, urlBaixar } from "../drive";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz_-123";

describe("lerLinkDrive", () => {
  it.each([
    [`https://drive.google.com/file/d/${ID}/view?usp=sharing`, "arquivo"],
    [`https://drive.google.com/file/d/${ID}/view?usp=drive_link`, "arquivo"],
    [`https://drive.google.com/file/u/1/d/${ID}/view`, "arquivo"],
    [`https://drive.google.com/open?id=${ID}`, "arquivo"],
    [`https://drive.google.com/uc?id=${ID}&export=download`, "arquivo"],
    [`drive.google.com/file/d/${ID}/view`, "arquivo"],
    [`  https://drive.google.com/file/d/${ID}/view  `, "arquivo"],
    [`https://drive.google.com/drive/folders/${ID}?usp=sharing`, "pasta"],
    [`https://drive.google.com/drive/u/0/folders/${ID}`, "pasta"],
    [`https://docs.google.com/document/d/${ID}/edit?usp=sharing`, "documento"],
    [`https://docs.google.com/spreadsheets/d/${ID}/edit`, "documento"],
    [`https://docs.google.com/presentation/d/${ID}/edit`, "documento"],
  ])("%s → %s", (link, tipo) => {
    expect(lerLinkDrive(link)).toMatchObject({ tipo, id: ID });
  });

  it.each([
    "",
    "não é link",
    `https://example.com/file/d/${ID}/view`,
    `https://drive.google.com.golpe.com/file/d/${ID}/view`,
    "https://drive.google.com/file/d/curto/view",
    "https://drive.google.com/drive/my-drive",
    "javascript:alert(1)",
  ])("rejeita %s", (link) => {
    expect(lerLinkDrive(link)).toBeNull();
  });
});

describe("urlBaixar", () => {
  it("gera download direto só para arquivos, mantendo a resourcekey", () => {
    const link = `https://drive.google.com/file/d/${ID}/view?resourcekey=0-abc`;
    expect(urlBaixar({ link, tipoDrive: "arquivo", driveId: ID })).toBe(
      `https://drive.google.com/uc?export=download&id=${ID}&resourcekey=0-abc`,
    );
    expect(urlBaixar({ link, tipoDrive: "pasta", driveId: ID })).toBeNull();
  });
});

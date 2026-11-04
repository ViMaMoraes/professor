import { afterEach, describe, expect, it, vi } from "vitest";

import { buscarVideoDrive } from "../video-drive";

afterEach(() => vi.unstubAllGlobals());

describe("vídeo do Drive pelo player do site", () => {
  const video = { origemId: "1AbCdEfGhIjKlMnOpQrStUv", link: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/view?resourcekey=0-xyz" };

  it("repassa o trecho pedido (avançar/voltar) e devolve para tocar", async () => {
    let chamada: { url: string; headers: Headers } | undefined;
    vi.stubGlobal("fetch", async (url: URL, init: RequestInit) => {
      chamada = { url: url.toString(), headers: new Headers(init.headers) };
      return new Response("pedaço", {
        status: 206,
        headers: {
          "content-type": "video/mp4",
          "content-range": "bytes 0-5/1000",
          "content-length": "6",
          "content-disposition": 'attachment; filename="aula.mp4"',
          "x-guploader-uploadid": "interno",
        },
      });
    });
    const r = await buscarVideoDrive(video, new Request("https://site/api/videos/1/arquivo", { headers: { range: "bytes=0-5" } }), "CHAVE");
    expect(chamada!.url).toBe(
      "https://www.googleapis.com/drive/v3/files/1AbCdEfGhIjKlMnOpQrStUv?alt=media&supportsAllDrives=true&key=CHAVE",
    );
    expect(chamada!.headers.get("range")).toBe("bytes=0-5");
    expect(chamada!.headers.get("x-goog-drive-resource-keys")).toBe("1AbCdEfGhIjKlMnOpQrStUv/0-xyz");
    expect(r.status).toBe(206);
    expect(r.headers.get("content-type")).toBe("video/mp4");
    expect(r.headers.get("content-range")).toBe("bytes 0-5/1000");
    expect(r.headers.get("accept-ranges")).toBe("bytes");
    expect(r.headers.get("content-disposition")).toBe("inline"); // toca em vez de baixar
    expect(r.headers.get("x-guploader-uploadid")).toBeNull(); // só os cabeçalhos necessários
    expect(await r.text()).toBe("pedaço");
  });

  it("arquivo não público ou inexistente: 404, sem repassar a mensagem do Google", async () => {
    vi.stubGlobal("fetch", async () => new Response('{"error":{"message":"key=CHAVE inválida"}}', { status: 403 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await buscarVideoDrive(video, new Request("https://site/x"), "CHAVE");
    expect(r.status).toBe(404);
    expect(await r.text()).toBe("");
  });
});

describe("vídeo do Drive sem conexão", () => {
  it("falha de rede vira 502 (o player volta para o modo do Drive)", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("network");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await buscarVideoDrive({ origemId: "1AbCdEfGhIjKlMnOpQrStUv", link: "x" }, new Request("https://site/x"), "CHAVE");
    expect(r.status).toBe(502);
  });
});

describe("vídeo do Drive sem a chave do Google", () => {
  const video = { origemId: "1AbCdEfGhIjKlMnOpQrStUv", link: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/view?resourcekey=0-xyz" };

  it("usa o endereço público de download, com o trecho pedido", async () => {
    let chamada: { url: string; headers: Headers } | undefined;
    vi.stubGlobal("fetch", async (url: URL, init: RequestInit) => {
      chamada = { url: url.toString(), headers: new Headers(init.headers) };
      return new Response("pedaço", { status: 206, headers: { "content-type": "video/mp4", "content-range": "bytes 0-5/1000" } });
    });
    const r = await buscarVideoDrive(video, new Request("https://site/x", { headers: { range: "bytes=0-5" } }), null);
    expect(chamada!.url).toBe(
      "https://drive.usercontent.google.com/download?id=1AbCdEfGhIjKlMnOpQrStUv&export=download&confirm=t&resourcekey=0-xyz",
    );
    expect(chamada!.headers.get("range")).toBe("bytes=0-5");
    expect(r.status).toBe(206);
    expect(r.headers.get("content-type")).toBe("video/mp4");
  });

  it("arquivo não público volta como página do Google: 404 (o player usa o do Drive)", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>Faça login</html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await buscarVideoDrive(video, new Request("https://site/x"), null);
    expect(r.status).toBe(404);
    expect(await r.text()).toBe("");
  });
});

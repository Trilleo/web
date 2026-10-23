import { describe, expect, it } from "vitest";
import {
  microsoftViewerUrl,
  nameFromDisposition,
  nameFromUrl,
  parseLink,
  resolveLink,
} from "./links";

const resolved = (input: string) => {
  const url = parseLink(input);
  if (typeof url === "string") throw new Error(url);
  return resolveLink(url);
};

describe("parseLink", () => {
  it("takes http(s) addresses, adding https:// when it's missing", () => {
    expect(String(parseLink("example.com/a.pdf"))).toBe(
      "https://example.com/a.pdf",
    );
    expect(String(parseLink("  http://example.com/x  "))).toBe(
      "http://example.com/x",
    );
  });

  it("refuses other schemes, empty input and nonsense", () => {
    expect(parseLink("")).toBe("empty");
    expect(parseLink("javascript:alert(1)")).toBe("protocol");
    expect(parseLink("file:///etc/passwd")).toBe("protocol");
    expect(parseLink("ftp://example.com/a")).toBe("protocol");
    expect(parseLink("https://")).toBe("invalid");
    expect(parseLink(`https://example.com/${"a".repeat(5000)}`)).toBe(
      "too-long",
    );
  });

  it("drops credentials from the address", () => {
    expect(String(parseLink("https://me:secret@example.com/a.pdf"))).toBe(
      "https://example.com/a.pdf",
    );
  });
});

describe("resolveLink", () => {
  it("opens GitHub, GitLab and Bitbucket file pages as their raw file", () => {
    expect(
      resolved("https://github.com/Trilleo/TownyMenu/blob/main/README.md").url,
    ).toBe(
      "https://raw.githubusercontent.com/Trilleo/TownyMenu/main/README.md",
    );
    expect(resolved("https://gist.github.com/someone/abc123").url).toBe(
      "https://gist.githubusercontent.com/someone/abc123/raw",
    );
    expect(
      resolved("https://gitlab.com/group/project/-/blob/main/docs/a.md").url,
    ).toBe("https://gitlab.com/group/project/-/raw/main/docs/a.md");
    expect(resolved("https://bitbucket.org/team/repo/src/main/a.txt").url).toBe(
      "https://bitbucket.org/team/repo/raw/main/a.txt",
    );
  });

  it("asks Dropbox, Google and OneDrive for the file instead of the page", () => {
    expect(resolved("https://www.dropbox.com/s/abc/report.pdf?dl=0").url).toBe(
      "https://www.dropbox.com/s/abc/report.pdf?dl=1",
    );
    expect(
      resolved("https://docs.google.com/document/d/AbC_123/edit").url,
    ).toBe("https://docs.google.com/document/d/AbC_123/export?format=docx");
    expect(
      resolved("https://docs.google.com/spreadsheets/d/AbC/edit#gid=0").url,
    ).toContain("format=xlsx");
    expect(resolved("https://drive.google.com/file/d/XyZ_9/view").url).toBe(
      "https://drive.usercontent.google.com/download?id=XyZ_9&export=download",
    );
    expect(resolved("https://1drv.ms/b/s!abc").url).toBe(
      "https://1drv.ms/b/s!abc?download=1",
    );
  });

  it("leaves other links alone and says which were rewritten", () => {
    const plain = resolved("https://example.com/a.pdf");
    expect(plain.url).toBe("https://example.com/a.pdf");
    expect(plain.rewrittenFrom).toBeNull();
    expect(resolved("https://github.com/Trilleo").rewrittenFrom).toBeNull();
    expect(
      resolved("https://github.com/a/b/blob/main/c.md").rewrittenFrom,
    ).toBe("GitHub file");
  });
});

describe("file names", () => {
  it("reads them from the address and from Content-Disposition", () => {
    expect(nameFromUrl("https://example.com/docs/Q3%20report.pdf")).toBe(
      "Q3 report.pdf",
    );
    expect(nameFromUrl("https://example.com/download")).toBeNull();
    expect(nameFromDisposition('attachment; filename="plan.docx"')).toBe(
      "plan.docx",
    );
    expect(
      nameFromDisposition(
        "attachment; filename=x.pdf; filename*=UTF-8''%E6%8A%A5%E5%91%8A.pdf",
      ),
    ).toBe("报告.pdf");
    expect(nameFromDisposition(null)).toBeNull();
    expect(nameFromDisposition("inline; FILENAME = plain.txt ")).toBe(
      "plain.txt",
    );
    expect(nameFromDisposition("attachment; filename*=bad")).toBeNull();
    expect(
      nameFromDisposition(
        "attachment; filename*=UTF-8''%E0%A4%A; filename=ok.pdf",
      ),
    ).toBe("ok.pdf");
  });

  it("reads hostile headers quickly", () => {
    const start = performance.now();
    nameFromDisposition(`filename*=${" ".repeat(100_000)}x`);
    nameFromDisposition(`filename=${'"'.repeat(100_000)}`);
    expect(performance.now() - start).toBeLessThan(100);
  });
});

it("builds Microsoft's viewer address with the link encoded", () => {
  expect(microsoftViewerUrl("https://example.com/a b.docx")).toBe(
    "https://view.officeapps.live.com/op/embed.aspx?src=https%3A%2F%2Fexample.com%2Fa%20b.docx",
  );
});

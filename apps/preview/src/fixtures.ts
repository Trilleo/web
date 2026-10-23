/**
 * Small documents written in code for the tests (Office, OpenDocument, EPUB): just
 * the parts the readers look at.
 */
import { strToU8, zipSync } from "fflate";

const NS_P =
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export function zip(
  files: Record<string, string | Uint8Array>,
): Uint8Array<ArrayBuffer> {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, value] of Object.entries(files))
    entries[name] = typeof value === "string" ? strToU8(value) : value;
  return new Uint8Array(zipSync(entries, { level: 0 }));
}

/** A 1×1 PNG. */
export const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (char) => char.charCodeAt(0),
);

/** Two slides: a title placeholder (positioned by its layout) and a picture. */
export function pptx(): Uint8Array<ArrayBuffer> {
  return zip({
    "[Content_Types].xml": "<Types/>",
    "ppt/presentation.xml": `<p:presentation ${NS_P}><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`,
    "ppt/_rels/presentation.xml.rels": `<Relationships><Relationship Id="rId2" Type="${REL}/slide" Target="slides/slide1.xml"/><Relationship Id="rId3" Type="${REL}/slide" Target="slides/slide2.xml"/></Relationships>`,
    "ppt/slides/slide1.xml": `<p:sld ${NS_P}><p:cSld><p:spTree>
      <p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr/>
        <p:txBody><a:bodyPr/><a:p><a:pPr algn="ctr"/><a:r><a:rPr b="1" sz="4400"/><a:t>Quarterly plan</a:t></a:r></a:p></p:txBody></p:sp>
      <p:sp><p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="609600" y="3429000"/><a:ext cx="6096000" cy="1371600"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:p><a:pPr><a:buChar char="•"/></a:pPr><a:r><a:t>Ship the preview tool</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree></p:cSld></p:sld>`,
    "ppt/slides/_rels/slide1.xml.rels": `<Relationships><Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId9" Type="${REL}/notesSlide" Target="../notesSlides/notesSlide1.xml"/></Relationships>`,
    "ppt/slideLayouts/slideLayout1.xml": `<p:sldLayout ${NS_P}><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="1219200" y="685800"/><a:ext cx="9753600" cy="1143000"/></a:xfrm></p:spPr></p:sp></p:spTree></p:cSld></p:sldLayout>`,
    "ppt/notesSlides/notesSlide1.xml": `<p:notes ${NS_P}><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="Notes"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:p><a:r><a:t>Mention the deadline.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>`,
    "ppt/slides/slide2.xml": `<p:sld ${NS_P}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="0E0E0E"/></a:solidFill></p:bgPr></p:bg><p:spTree>
      <p:pic><p:nvPicPr><p:cNvPr id="4" name="Chart" descr="A chart"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId5"/></p:blipFill>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="6096000" cy="3429000"/></a:xfrm></p:spPr></p:pic>
    </p:spTree></p:cSld></p:sld>`,
    "ppt/slides/_rels/slide2.xml.rels": `<Relationships><Relationship Id="rId5" Type="${REL}/image" Target="../media/image1.png"/></Relationships>`,
    "ppt/media/image1.png": PNG,
  });
}

export function docx(): Uint8Array<ArrayBuffer> {
  return zip({
    "[Content_Types].xml": "<Types/>",
    "word/document.xml":
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>',
  });
}

export function xlsx(): Uint8Array<ArrayBuffer> {
  return zip({
    "[Content_Types].xml": "<Types/>",
    "xl/workbook.xml": "<workbook/>",
  });
}

export function odt(): Uint8Array<ArrayBuffer> {
  return zip({
    mimetype: "application/vnd.oasis.opendocument.text",
    "content.xml": `<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:xlink="http://www.w3.org/1999/xlink"><office:body><office:text>
      <text:h text:outline-level="1">Minutes</text:h>
      <text:p>Present:<text:s text:c="2"/>everyone<text:tab/>(late: none)</text:p>
      <text:list><text:list-item><text:p>Budget</text:p></text:list-item><text:list-item><text:p>Hiring</text:p></text:list-item></text:list>
      <table:table><table:table-row><table:table-cell><text:p>A1</text:p></table:table-cell><table:table-cell><text:p>B1</text:p></table:table-cell></table:table-row></table:table>
      <text:p><draw:frame><draw:image xlink:href="Pictures/a.png"/></draw:frame></text:p>
    </office:text></office:body></office:document-content>`,
    "Pictures/a.png": PNG,
  });
}

export function epub(): Uint8Array<ArrayBuffer> {
  return zip({
    mimetype: "application/epub+zip",
    "META-INF/container.xml":
      '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>',
    "OEBPS/content.opf": `<package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>A Short Book</dc:title><dc:creator>Ann Author</dc:creator></metadata>
      <manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="c1" href="text/one.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="text/two.xhtml" media-type="application/xhtml+xml"/><item id="img" href="images/a.png" media-type="image/png"/></manifest>
      <spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>`,
    "OEBPS/nav.xhtml":
      '<html xmlns="http://www.w3.org/1999/xhtml"><body><nav><ol><li><a href="text/one.xhtml">Beginnings</a></li><li><a href="text/two.xhtml#top">Endings</a></li></ol></nav></body></html>',
    "OEBPS/text/one.xhtml":
      '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>One</h1><p>See <a href="two.xhtml">the end</a>.</p><img src="../images/a.png" alt="A dot"/><script>alert(1)</script></body></html>',
    "OEBPS/text/two.xhtml":
      '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Two</h1><p>The end.</p></body></html>',
    "OEBPS/images/a.png": PNG,
  });
}

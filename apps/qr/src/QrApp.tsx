import { downloadBlob } from "@trilleo/tool-kit";
import {
  Button,
  Choice,
  CopyButton,
  Field,
  ToolSection,
  fieldClasses,
} from "@trilleo/ui";
import { MotionConfig } from "motion/react";
import { useMemo, useState } from "react";
import {
  KINDS,
  emptyContent,
  payload,
  type Content,
  type ContentKind,
  type Security,
} from "./content";
import {
  CORRECTIONS,
  drawQr,
  makeQr,
  modulesPath,
  qrSvg,
  type Correction,
  type QrStyle,
} from "./render";

/** Ink and the site's accent; QR codes are always drawn on a light ground. */
const COLORS = [
  { value: "#0e0e0e", label: "Ink" },
  { value: "#e5470f", label: "Orange" },
] as const;

/** The code's light ground (not a theme color: codes stay dark on light). */
const WHITE = "#ffffff";

const PNG_SIZES = [256, 512, 1024, 2048] as const;

export function QrApp() {
  const [content, setContent] = useState<Content>(emptyContent("url"));
  const [correction, setCorrection] = useState<Correction>("M");
  const [margin, setMargin] = useState(4);
  const [foreground, setForeground] = useState<string>(COLORS[0].value);
  const [transparent, setTransparent] = useState(false);
  const [pngSize, setPngSize] = useState<number>(1024);

  const text = payload(content);
  const style: QrStyle = {
    margin,
    foreground,
    background: transparent ? null : WHITE,
  };
  const qr = useMemo(() => {
    if (!text) return null;
    try {
      return makeQr(text, correction);
    } catch {
      return "too-long" as const;
    }
  }, [text, correction]);
  const code = qr && qr !== "too-long" ? qr : null;
  const side = code ? code.size + margin * 2 : 0;
  const svg = code ? qrSvg(code, style) : "";
  // Lighter than ink, so some cameras need a moment longer.
  const lowContrast = foreground !== COLORS[0].value;

  const edit = (patch: Partial<Content>) => {
    setContent((current) => ({ ...current, ...patch }) as Content);
  };

  const downloadSvg = () => {
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "qr-code.svg");
  };

  const downloadPng = () => {
    if (!code) return;
    const canvas = document.createElement("canvas");
    drawQr(canvas, code, style, pngSize);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, "qr-code.png");
    }, "image/png");
  };

  const input = `${fieldClasses} h-11 px-3`;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-10 md:gap-12">
        <ToolSection number="01" title="Content">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-12">
            <div className="flex flex-col gap-6">
              <Choice
                legend="What's in the code"
                value={content.kind}
                options={KINDS.map(({ kind, label }) => ({
                  value: kind,
                  label,
                }))}
                onChange={(kind: ContentKind) => {
                  setContent(emptyContent(kind));
                }}
              />

              {content.kind === "url" && (
                <Field
                  label="Link"
                  hint="https:// is added if you leave it out."
                >
                  {(props) => (
                    <input
                      {...props}
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      placeholder="www.trilleo.net"
                      value={content.url}
                      onChange={(event) => {
                        edit({ url: event.target.value });
                      }}
                      className={input}
                    />
                  )}
                </Field>
              )}

              {content.kind === "text" && (
                <Field label="Text">
                  {(props) => (
                    <textarea
                      {...props}
                      rows={4}
                      value={content.text}
                      onChange={(event) => {
                        edit({ text: event.target.value });
                      }}
                      className={`${fieldClasses} p-3`}
                    />
                  )}
                </Field>
              )}

              {content.kind === "wifi" && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Field label="Network name">
                    {(props) => (
                      <input
                        {...props}
                        autoComplete="off"
                        value={content.ssid}
                        onChange={(event) => {
                          edit({ ssid: event.target.value });
                        }}
                        className={input}
                      />
                    )}
                  </Field>
                  <Field label="Security">
                    {(props) => (
                      <select
                        {...props}
                        value={content.security}
                        onChange={(event) => {
                          edit({ security: event.target.value as Security });
                        }}
                        className={input}
                      >
                        <option value="WPA">WPA / WPA2 / WPA3</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">None (open)</option>
                      </select>
                    )}
                  </Field>
                  {content.security !== "nopass" && (
                    <Field
                      label="Password"
                      hint="It's only put in the code, never sent anywhere."
                    >
                      {(props) => (
                        <input
                          {...props}
                          type="text"
                          autoComplete="off"
                          spellCheck={false}
                          value={content.password}
                          onChange={(event) => {
                            edit({ password: event.target.value });
                          }}
                          className={input}
                        />
                      )}
                    </Field>
                  )}
                  <label className="inline-flex items-center gap-2 self-center">
                    <input
                      type="checkbox"
                      className="size-4 accent-accent"
                      checked={content.hidden}
                      onChange={(event) => {
                        edit({ hidden: event.target.checked });
                      }}
                    />
                    Hidden network
                  </label>
                </div>
              )}

              {content.kind === "email" && (
                <div className="flex flex-col gap-6">
                  <Field label="To">
                    {(props) => (
                      <input
                        {...props}
                        type="email"
                        autoComplete="off"
                        value={content.to}
                        onChange={(event) => {
                          edit({ to: event.target.value });
                        }}
                        className={input}
                      />
                    )}
                  </Field>
                  <Field label="Subject">
                    {(props) => (
                      <input
                        {...props}
                        value={content.subject}
                        onChange={(event) => {
                          edit({ subject: event.target.value });
                        }}
                        className={input}
                      />
                    )}
                  </Field>
                  <Field label="Message">
                    {(props) => (
                      <textarea
                        {...props}
                        rows={3}
                        value={content.body}
                        onChange={(event) => {
                          edit({ body: event.target.value });
                        }}
                        className={`${fieldClasses} p-3`}
                      />
                    )}
                  </Field>
                </div>
              )}

              {(content.kind === "phone" || content.kind === "sms") && (
                <div className="flex flex-col gap-6">
                  <Field
                    label="Phone number"
                    hint="Include the country code, e.g. +86."
                  >
                    {(props) => (
                      <input
                        {...props}
                        type="tel"
                        autoComplete="off"
                        value={content.number}
                        onChange={(event) => {
                          edit({ number: event.target.value });
                        }}
                        className={input}
                      />
                    )}
                  </Field>
                  {content.kind === "sms" && (
                    <Field label="Message">
                      {(props) => (
                        <textarea
                          {...props}
                          rows={3}
                          value={content.message}
                          onChange={(event) => {
                            edit({ message: event.target.value });
                          }}
                          className={`${fieldClasses} p-3`}
                        />
                      )}
                    </Field>
                  )}
                </div>
              )}
            </div>

            <figure className="flex flex-col gap-3 xl:sticky xl:top-6 xl:self-start">
              {/* The preview shows the code's real colors (not theme colors): a white
                  ground unless it's transparent. */}
              <div
                className="flex aspect-square w-full max-w-80 items-center justify-center border border-ink bg-fig"
                style={
                  code && !transparent ? { backgroundColor: WHITE } : undefined
                }
              >
                {code ? (
                  <svg
                    viewBox={`0 0 ${String(side)} ${String(side)}`}
                    shapeRendering="crispEdges"
                    className="size-full"
                    role="img"
                    aria-label={`QR code for: ${text}`}
                  >
                    <path
                      fill={foreground}
                      d={modulesPath(code.modules, margin)}
                    />
                  </svg>
                ) : (
                  <p className="max-w-48 p-4 text-center text-sm text-muted">
                    {qr === "too-long"
                      ? "That's more than one QR code can hold. Shorten it, or lower the error correction."
                      : "Your code appears here."}
                  </p>
                )}
              </div>
              <figcaption className="type-label text-muted" aria-live="polite">
                {code
                  ? `Version ${String(code.version)} · ${String(code.size)}×${String(code.size)} modules · ${String(new TextEncoder().encode(text).length)} bytes`
                  : " "}
              </figcaption>
            </figure>
          </div>
        </ToolSection>

        <ToolSection number="02" title="Look">
          <div className="flex flex-col gap-6">
            <Choice
              legend="Error correction"
              value={correction}
              options={CORRECTIONS}
              onChange={setCorrection}
            />
            <p className="-mt-3 text-sm text-muted">
              How much of the code can be damaged or covered and still scan.
              Higher means a denser code.
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Choice
                legend="Color"
                value={foreground}
                options={COLORS}
                onChange={setForeground}
              />
              <Choice
                legend="Background"
                value={transparent ? "none" : "white"}
                options={[
                  { value: "white", label: "White" },
                  { value: "none", label: "Transparent" },
                ]}
                onChange={(value) => {
                  setTransparent(value === "none");
                }}
              />
            </div>
            {lowContrast && (
              <p className="border-l-2 border-accent pl-4">
                Orange is lighter than ink, so some scanners find it harder to
                read. Test it before printing, or raise the error correction.
              </p>
            )}
            <Field
              label={`Margin: ${String(margin)} module${margin === 1 ? "" : "s"}`}
              hint="Scanners need a light border; the standard asks for 4."
            >
              {(props) => (
                <input
                  {...props}
                  type="range"
                  min={0}
                  max={8}
                  value={margin}
                  onChange={(event) => {
                    setMargin(Number(event.target.value));
                  }}
                  className="h-11 max-w-sm accent-accent"
                />
              )}
            </Field>
          </div>
        </ToolSection>

        <ToolSection number="03" title="Save">
          <div className="flex flex-col gap-6">
            <Choice
              legend="PNG size"
              value={pngSize}
              options={PNG_SIZES.map((size) => ({
                value: size,
                label: `${String(size)} px`,
              }))}
              onChange={setPngSize}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!code} onClick={downloadPng}>
                Download PNG
              </Button>
              <Button
                variant="secondary"
                disabled={!code}
                onClick={downloadSvg}
              >
                Download SVG
              </Button>
              {code && (
                <CopyButton
                  value={svg}
                  label="Copy SVG markup"
                  className="h-11 px-4"
                />
              )}
            </div>
            {text && (
              <div className="flex flex-col gap-1.5">
                <span className="type-label text-muted">Encoded text</span>
                <code className="font-mono text-sm break-all">{text}</code>
              </div>
            )}
          </div>
        </ToolSection>
      </div>
    </MotionConfig>
  );
}

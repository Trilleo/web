import { FileUpload } from "@trilleo/storage/react";
import { useState } from "react";

export interface BundleUploadProps {
  /** BUNDLE_LIMITS.maxBytes, in MB, for the hint. */
  maxMegabytes: number;
}

/**
 * Uploading CHUNITHM bundles on /admin/chunithm/import/: straight to storage
 * (private, purpose "chunithm-import"); the page lists them once they're checked.
 */
export default function BundleUpload({ maxMegabytes }: BundleUploadProps) {
  const [uploaded, setUploaded] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <FileUpload
        purpose="chunithm-import"
        visibility="private"
        multiple
        accept=".zip"
        title="Drop bundles"
        hint={`chunithm-bundle-….zip from the bundling script, up to ${String(maxMegabytes)} MB each.`}
        onUploaded={() => {
          setUploaded((n) => n + 1);
        }}
      />
      {uploaded > 0 && (
        <p role="status">
          <a href="/admin/chunithm/import/" className="group">
            <span className="link-wipe">Reload the page</span>
          </a>{" "}
          to import {uploaded === 1 ? "the new bundle" : "the new bundles"}.
        </p>
      )}
    </div>
  );
}

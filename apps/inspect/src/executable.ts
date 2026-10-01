/** What a program file's header says: the format, CPU, word size and more. */
export interface ExecutableInfo {
  format: "ELF" | "PE" | "Mach-O";
  architecture: string;
  bits: 32 | 64 | null;
  /** Byte order. */
  endian: "little" | "big";
  /** ELF: Executable / Shared object…; PE: GUI / Console…; Mach-O: Executable / Dylib… */
  kind: string | null;
  /** PE only: the link time stamped in the header. */
  built: Date | null;
}

const ELF_MACHINES: Readonly<Record<number, string>> = {
  3: "x86",
  8: "MIPS",
  20: "PowerPC",
  21: "PowerPC 64",
  40: "ARM",
  62: "x86-64",
  183: "ARM64",
  243: "RISC-V",
  258: "LoongArch",
};

const ELF_TYPES: Readonly<Record<number, string>> = {
  1: "Relocatable object",
  2: "Executable",
  3: "Shared object or PIE executable",
  4: "Core dump",
};

const PE_MACHINES: Readonly<Record<number, string>> = {
  0x14c: "x86",
  0x8664: "x86-64",
  0x1c0: "ARM",
  0x1c4: "ARM (Thumb-2)",
  0xaa64: "ARM64",
  0x200: "Itanium",
  0x5064: "RISC-V 64",
};

const PE_SUBSYSTEMS: Readonly<Record<number, string>> = {
  1: "Native (driver)",
  2: "Windows GUI",
  3: "Windows console",
  10: "EFI application",
  11: "EFI boot driver",
  12: "EFI runtime driver",
};

const MACHO_CPUS: Readonly<Record<number, string>> = {
  7: "x86",
  0x01000007: "x86-64",
  12: "ARM",
  0x0100000c: "ARM64",
  18: "PowerPC",
  0x01000012: "PowerPC 64",
};

const MACHO_TYPES: Readonly<Record<number, string>> = {
  1: "Object file",
  2: "Executable",
  6: "Dynamic library",
  8: "Bundle",
};

function elf(view: DataView): ExecutableInfo {
  const bits = view.getUint8(4) === 2 ? 64 : 32;
  const little = view.getUint8(5) === 1;
  const type = view.getUint16(16, little);
  const machine = view.getUint16(18, little);
  return {
    format: "ELF",
    architecture: ELF_MACHINES[machine] ?? `Machine ${String(machine)}`,
    bits,
    endian: little ? "little" : "big",
    kind: ELF_TYPES[type] ?? null,
    built: null,
  };
}

function pe(view: DataView): ExecutableInfo | null {
  const header = view.getUint32(0x3c, true);
  if (header + 24 > view.byteLength || view.getUint32(header, true) !== 0x4550)
    return null; // A DOS program, with no "PE\0\0" header.
  const machine = view.getUint16(header + 4, true);
  const timestamp = view.getUint32(header + 8, true);
  const characteristics = view.getUint16(header + 22, true);
  const optional = header + 24;
  let bits: 32 | 64 | null = null;
  let subsystem: string | null = null;
  if (optional + 70 <= view.byteLength) {
    const magic = view.getUint16(optional, true);
    bits = magic === 0x20b ? 64 : magic === 0x10b ? 32 : null;
    subsystem = PE_SUBSYSTEMS[view.getUint16(optional + 68, true)] ?? null;
  }
  const dll = (characteristics & 0x2000) !== 0;
  return {
    format: "PE",
    architecture: PE_MACHINES[machine] ?? `Machine 0x${machine.toString(16)}`,
    bits,
    endian: "little",
    kind: dll ? `DLL${subsystem ? ` (${subsystem})` : ""}` : subsystem,
    // Reproducible builds put a hash here instead of a time; skip obvious nonsense.
    built:
      timestamp > 631152000 && timestamp < Date.now() / 1000 + 86400 * 365
        ? new Date(timestamp * 1000)
        : null,
  };
}

function macho(view: DataView): ExecutableInfo {
  const magic = view.getUint32(0, false);
  const little = magic === 0xcefaedfe || magic === 0xcffaedfe;
  const bits = magic === 0xfeedfacf || magic === 0xcffaedfe ? 64 : 32;
  const cpu = view.getUint32(4, little);
  const type = view.getUint32(12, little);
  return {
    format: "Mach-O",
    architecture: MACHO_CPUS[cpu] ?? `CPU ${String(cpu)}`,
    bits,
    endian: little ? "little" : "big",
    kind: MACHO_TYPES[type] ?? null,
    built: null,
  };
}

/** Reads ELF, PE (Windows) and thin Mach-O headers from a file's first bytes. */
export function readExecutable(bytes: Uint8Array): ExecutableInfo | null {
  if (bytes.length < 64) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint32(0, false);
  if (magic === 0x7f454c46) return elf(view);
  if (bytes[0] === 0x4d && bytes[1] === 0x5a) return pe(view);
  if ([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe].includes(magic))
    return macho(view);
  return null;
}

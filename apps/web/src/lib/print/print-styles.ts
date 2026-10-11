/** Shared CSS for 80mm thermal printers (receipt + kitchen). */
export const PRINT_80MM_STYLES = `
@page { size: 80mm auto; margin: 2mm; }
* { box-sizing: border-box; }
body {
  font-family: system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.35;
  color: #000;
  margin: 0;
  padding: 0;
  width: 76mm;
}
h1 { font-size: 16px; margin: 0 0 4px; text-align: center; }
.meta { text-align: center; margin-bottom: 8px; }
hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
.line { display: flex; justify-content: space-between; gap: 4px; }
.line-name { flex: 1; }
.mods { font-size: 11px; padding-inline-start: 8px; }
.bold { font-weight: 700; }
.right { text-align: end; }
`;

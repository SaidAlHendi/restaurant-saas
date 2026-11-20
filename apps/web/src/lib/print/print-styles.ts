/** Shared CSS for 80mm thermal printers (receipt + kitchen). */
export const PRINT_80MM_STYLES = `
@page { size: 80mm auto; margin: 2mm; }
* { box-sizing: border-box; }
body {
  font-family: system-ui, 'Segoe UI', Tahoma, 'Noto Sans Arabic', 'Noto Naskh Arabic', Arial, sans-serif;
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

/* Receipt only: everything lives under .rcpt so the kitchen ticket keeps its own look. */
.rcpt { padding: 2mm 0 0; }
.rcpt .head { text-align: center; padding-bottom: 6px; }
.rcpt h1 { font-size: 20px; font-weight: 800; letter-spacing: .01em; margin: 0 0 3px; }
.rcpt .meta { margin: 0 0 2px; font-size: 11px; }
.rcpt .order-no {
  margin: 6px 0 5px;
  padding: 5px 0;
  background: #000;
  color: #fff;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: .04em;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.rcpt .when { display: flex; justify-content: space-between; gap: 6px; font-size: 11px; margin-bottom: 6px; }
.rcpt hr.solid { border-top: 1px solid #000; margin: 6px 0; }
.rcpt .items { padding: 2px 0; }
.rcpt .item { padding: 3px 0; border-bottom: 1px dotted #000; }
.rcpt .item:last-child { border-bottom: 0; }
.rcpt .item .line { font-weight: 700; font-size: 13px; align-items: baseline; }
.rcpt .qty { display: inline-block; min-width: 2.4ch; }
.rcpt .mods { font-size: 11px; padding-inline-start: 2.4ch; }
.rcpt .num { font-variant-numeric: tabular-nums; white-space: nowrap; direction: ltr; unicode-bidi: isolate; }
.rcpt .sums { font-size: 12px; padding-bottom: 4px; }
.rcpt .grand {
  display: flex; justify-content: space-between; align-items: baseline; gap: 6px;
  border-top: 2px solid #000; border-bottom: 2px solid #000;
  padding: 5px 0; margin: 2px 0 6px;
  font-size: 17px; font-weight: 800;
}
.rcpt .pay { font-size: 12px; padding-bottom: 4px; }
.rcpt .pay hr { margin: 3px 0; }
.rcpt .foot { text-align: center; font-size: 11px; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #000; }
.rcpt .cut { height: 8mm; }
`;

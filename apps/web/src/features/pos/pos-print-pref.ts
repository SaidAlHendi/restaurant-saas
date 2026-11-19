const KEY = 'pos.printAdditions';

/** Whether "Send to kitchen" on an existing order also prints the additions ticket (default: yes). */
export function readPrintAdditions(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function writePrintAdditions(value: boolean): void {
  try {
    localStorage.setItem(KEY, value ? 'on' : 'off');
  } catch {
    // private mode: the preference just won't persist
  }
}

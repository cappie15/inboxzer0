/**
 * Incremental line-based parser for IMAP server responses (RFC 3501 §2.2).
 * Handles literals ({N}\r\n<N raw bytes>) by treating them as part of the
 * logical line they were announced on, so a single FETCH response spanning
 * a header-literal still comes out as one entry from `feed()`.
 *
 * Pure/synchronous and free of any socket dependency so it can run under
 * plain Node for testing as well as inside the React Native runtime.
 */
export class ImapStreamParser {
  private buffer = '';
  private currentLine = '';
  private literalRemaining: number | null = null;

  feed(chunk: string): string[] {
    this.buffer += chunk;
    const lines: string[] = [];

    for (;;) {
      if (this.literalRemaining !== null) {
        if (this.buffer.length < this.literalRemaining) {
          return lines;
        }
        const literalData = this.buffer.slice(0, this.literalRemaining);
        this.buffer = this.buffer.slice(this.literalRemaining);
        this.currentLine += literalData;
        this.literalRemaining = null;
        continue;
      }

      const idx = this.buffer.indexOf('\r\n');
      if (idx === -1) {
        return lines;
      }

      const segment = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);
      this.currentLine += segment;

      const literalMatch = /\{(\d+)\}$/.exec(segment);
      if (literalMatch) {
        this.literalRemaining = parseInt(literalMatch[1], 10);
        this.currentLine += '\r\n';
        continue;
      }

      lines.push(this.currentLine);
      this.currentLine = '';
    }
  }
}

import TcpSockets from 'react-native-tcp-socket';
import { ImapStreamParser } from './imapStreamParser';
import { ImapCredentials } from '../../utils/types';

export interface ImapFetchedMessage {
  uid: number;
  flags: string[];
  headerBlock: string;
}

interface CommandResult {
  status: 'OK' | 'NO' | 'BAD';
  statusLine: string;
  untagged: string[];
}

interface PendingCommand {
  tag: string;
  untagged: string[];
  resolve: (statusLine: string) => void;
  reject: (err: Error) => void;
  awaitingContinuation?: boolean;
  onContinuation?: () => void;
}

const COMMAND_TIMEOUT_MS = 20000;
const CONNECT_TIMEOUT_MS = 15000;

function quoteImapString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function utf8ByteLength(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.codePointAt(i);
    if (code === undefined) continue;
    if (code > 0xffff) i++; // surrogate pair — already counted as one codePoint
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

function parseStatus(statusLine: string): 'OK' | 'NO' | 'BAD' {
  const match = /^\S+\s+(OK|NO|BAD)/i.exec(statusLine);
  const status = match?.[1]?.toUpperCase();
  return status === 'OK' || status === 'NO' || status === 'BAD' ? status : 'BAD';
}

/**
 * Parses a single "* <seq> FETCH (...)" logical line for the specific shape
 * this client always requests: UID, FLAGS and one header-fields literal.
 * This is intentionally narrow (not a general IMAP FETCH parser) since we
 * control the exact command that produced it.
 */
export function parseFetchLine(line: string): ImapFetchedMessage | null {
  const literalMatch = /\{(\d+)\}\r\n/.exec(line);
  if (!literalMatch || literalMatch.index === undefined) return null;

  const size = parseInt(literalMatch[1], 10);
  const startIdx = literalMatch.index + literalMatch[0].length;
  const headerBlock = line.slice(startIdx, startIdx + size);

  const uidMatch = /\bUID (\d+)/.exec(line);
  const flagsMatch = /FLAGS \(([^)]*)\)/.exec(line);
  if (!uidMatch) return null;

  return {
    uid: parseInt(uidMatch[1], 10),
    flags: flagsMatch ? flagsMatch[1].split(/\s+/).filter(Boolean) : [],
    headerBlock,
  };
}

/**
 * Minimal IMAP4rev1 client over TLS, scoped to what InboxZer0 needs:
 * connect, login, select INBOX, fetch recent headers+flags, mark
 * read/unread, and move a message to another mailbox (archive).
 *
 * This is deliberately not a full IMAP implementation (no IDLE, no
 * multi-command pipelining, no general-purpose response parsing) — it only
 * needs to work against the shape of commands it issues itself.
 */
export class ImapClient {
  private socket: ReturnType<typeof TcpSockets.connectTLS> | null = null;
  private parser = new ImapStreamParser();
  private tagCounter = 0;
  private pending: PendingCommand | null = null;
  private greeted = false;
  private greetingHandlers: { resolve: () => void; reject: (err: Error) => void } | null =
    null;

  constructor(private readonly credentials: ImapCredentials) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        fn();
      };

      const timeoutId = setTimeout(() => {
        finish(() => reject(new Error('IMAP-verbinding time-out')));
      }, CONNECT_TIMEOUT_MS);

      this.greetingHandlers = {
        resolve: () => finish(resolve),
        reject: (err) => finish(() => reject(err)),
      };

      try {
        this.socket = TcpSockets.connectTLS({
          host: this.credentials.host,
          port: this.credentials.port,
          tls: this.credentials.useSsl,
        });
      } catch (err) {
        finish(() => reject(err instanceof Error ? err : new Error(String(err))));
        return;
      }

      this.socket.setEncoding('utf8');

      this.socket.on('data', (chunk: unknown) => {
        const text = typeof chunk === 'string' ? chunk : String(chunk);
        const lines = this.parser.feed(text);
        for (const line of lines) {
          this.handleLine(line);
        }
      });

      this.socket.on('error', (err: Error) => {
        finish(() => reject(err));
        this.pending?.reject(err);
      });

      this.socket.on('close', () => {
        this.pending?.reject(new Error('IMAP-verbinding is gesloten'));
      });
    });
  }

  private handleLine(line: string): void {
    if (this.pending) {
      if (this.pending.awaitingContinuation && line.startsWith('+')) {
        this.pending.awaitingContinuation = false;
        this.pending.onContinuation?.();
        return;
      }
      const tagPrefix = `${this.pending.tag} `;
      if (line.startsWith(tagPrefix)) {
        const completed = this.pending;
        this.pending = null;
        completed.resolve(line);
        return;
      }
      this.pending.untagged.push(line);
      return;
    }

    if (!this.greeted) {
      this.greeted = true;
      if (/^\*\s+BYE/i.test(line)) {
        this.greetingHandlers?.reject(new Error(`Server weigerde verbinding: ${line}`));
      } else {
        this.greetingHandlers?.resolve();
      }
      return;
    }
    // Unsolicited server message outside of a command — ignored in this
    // minimal client (no IDLE/EXISTS-change handling).
  }

  private sendCommand(command: string): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Niet verbonden met de IMAP-server'));
        return;
      }
      if (this.pending) {
        reject(new Error('Er loopt al een IMAP-commando'));
        return;
      }

      const tag = `A${++this.tagCounter}`;
      const untagged: string[] = [];

      const timeoutId = setTimeout(() => {
        this.pending = null;
        reject(new Error(`IMAP-commando time-out: ${command}`));
      }, COMMAND_TIMEOUT_MS);

      this.pending = {
        tag,
        untagged,
        resolve: (statusLine) => {
          clearTimeout(timeoutId);
          resolve({ status: parseStatus(statusLine), statusLine, untagged });
        },
        reject: (err) => {
          clearTimeout(timeoutId);
          reject(err);
        },
      };

      this.socket.write(`${tag} ${command}\r\n`);
    });
  }

  /**
   * Like `sendCommand`, but the command is expected to trigger a server
   * "+ " continuation request before the tagged response — used for
   * commands that send a client literal (e.g. APPEND).
   */
  private sendCommandExpectingContinuation(
    command: string,
    onContinue: () => void
  ): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Niet verbonden met de IMAP-server'));
        return;
      }
      if (this.pending) {
        reject(new Error('Er loopt al een IMAP-commando'));
        return;
      }

      const tag = `A${++this.tagCounter}`;
      const untagged: string[] = [];

      const timeoutId = setTimeout(() => {
        this.pending = null;
        reject(new Error(`IMAP-commando time-out: ${command}`));
      }, COMMAND_TIMEOUT_MS);

      this.pending = {
        tag,
        untagged,
        awaitingContinuation: true,
        onContinuation: onContinue,
        resolve: (statusLine) => {
          clearTimeout(timeoutId);
          resolve({ status: parseStatus(statusLine), statusLine, untagged });
        },
        reject: (err) => {
          clearTimeout(timeoutId);
          reject(err);
        },
      };

      this.socket.write(`${tag} ${command}\r\n`);
    });
  }

  async login(): Promise<void> {
    const result = await this.sendCommand(
      `LOGIN ${quoteImapString(this.credentials.username)} ${quoteImapString(
        this.credentials.password
      )}`
    );
    if (result.status !== 'OK') {
      throw new Error(`IMAP-login mislukt: ${result.statusLine}`);
    }
  }

  async selectMailbox(mailboxName = 'INBOX'): Promise<{ exists: number }> {
    const result = await this.sendCommand(`SELECT ${quoteImapString(mailboxName)}`);
    if (result.status !== 'OK') {
      throw new Error(`Kon mailbox "${mailboxName}" niet selecteren: ${result.statusLine}`);
    }
    const existsLine = result.untagged.find((line) => /^\*\s+\d+\s+EXISTS/i.test(line));
    const exists = existsLine ? parseInt(/^\*\s+(\d+)\s+EXISTS/i.exec(existsLine)![1], 10) : 0;
    return { exists };
  }

  /** Fetches UID, flags and a small set of headers for the most recent `count` messages. */
  async fetchRecentHeaders(exists: number, count: number): Promise<ImapFetchedMessage[]> {
    if (exists <= 0) return [];
    const from = Math.max(1, exists - count + 1);
    const range = `${from}:${exists}`;
    const result = await this.sendCommand(
      `FETCH ${range} (UID FLAGS BODY.PEEK[HEADER.FIELDS (FROM TO CC BCC SUBJECT DATE)])`
    );
    if (result.status !== 'OK') {
      throw new Error(`FETCH mislukt: ${result.statusLine}`);
    }
    return result.untagged
      .map((line) => parseFetchLine(line))
      .filter((msg): msg is ImapFetchedMessage => msg !== null);
  }

  async setSeen(uid: number, seen: boolean): Promise<void> {
    const flagOp = seen ? '+FLAGS' : '-FLAGS';
    const result = await this.sendCommand(`UID STORE ${uid} ${flagOp} (\\Seen)`);
    if (result.status !== 'OK') {
      throw new Error(`Kon gelezen-status niet bijwerken: ${result.statusLine}`);
    }
  }

  /** Moves a message to another mailbox, using MOVE if supported, else COPY+STORE\Deleted+EXPUNGE. */
  async moveToFolder(uid: number, folderName: string): Promise<void> {
    const moveResult = await this.sendCommand(`UID MOVE ${uid} ${quoteImapString(folderName)}`);
    if (moveResult.status === 'OK') return;

    const copyResult = await this.sendCommand(`UID COPY ${uid} ${quoteImapString(folderName)}`);
    if (copyResult.status !== 'OK') {
      throw new Error(`Kon bericht niet kopiëren naar "${folderName}": ${copyResult.statusLine}`);
    }
    const storeResult = await this.sendCommand(`UID STORE ${uid} +FLAGS (\\Deleted)`);
    if (storeResult.status !== 'OK') {
      throw new Error(`Kon bericht niet als verwijderd markeren: ${storeResult.statusLine}`);
    }
    const expungeResult = await this.sendCommand('EXPUNGE');
    if (expungeResult.status !== 'OK') {
      throw new Error(`EXPUNGE mislukt: ${expungeResult.statusLine}`);
    }
  }

  /** Appends a raw RFC822 message to a mailbox (e.g. saving a draft). */
  async appendMessage(
    mailboxName: string,
    rawMessage: string,
    flags: string[] = []
  ): Promise<void> {
    const byteLength = utf8ByteLength(rawMessage);
    const flagsPart = flags.length > 0 ? ` (${flags.join(' ')})` : '';
    const command = `APPEND ${quoteImapString(mailboxName)}${flagsPart} {${byteLength}}`;

    const result = await this.sendCommandExpectingContinuation(command, () => {
      this.socket?.write(`${rawMessage}\r\n`);
    });
    if (result.status !== 'OK') {
      throw new Error(`APPEND naar "${mailboxName}" mislukt: ${result.statusLine}`);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.sendCommand('LOGOUT');
    } finally {
      this.disconnect();
    }
  }

  disconnect(): void {
    this.socket?.destroy();
    this.socket = null;
  }
}

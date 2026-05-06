import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  randomUUID,
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
} from 'node:crypto';
import { dirname, join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import WebSocket from 'ws';

export interface OpenClawResponse {
  output: string;
  metadata?: {
    tokens_used?: number;
    cost?: number;
    status?: string;
    [key: string]: unknown;
  };
}

interface DeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

interface GatewayEnvelope {
  type?: string;
  id?: string;
  ok?: boolean;
  event?: string;
  payload?: Record<string, unknown>;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

interface GatewayWaitPayload {
  status?: string;
  error?: string;
  yielded?: unknown;
}

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  private readonly gatewayUrl: string;
  private readonly gatewayToken: string;
  private readonly agentId: string;
  private readonly clientId: string;
  private readonly requestScopes: string[];
  private readonly requestTimeoutMs: number;
  private readonly identityPath: string;

  constructor(private readonly configService: ConfigService) {
    const rawGatewayUrl =
      this.configService.getOrThrow<string>('OPENCLAW_API_URL');
    const configuredToken = this.resolveGatewayToken();

    if (!configuredToken) {
      throw new Error(
        'OpenClaw gateway auth token is required. Set OPENCLAW_GATEWAY_TOKEN (or OPENCLAW_GATEWAY_AUTH_TOKEN/OPENCLAW_API_KEY).',
      );
    }

    if (configuredToken === 'replace_with_a_shared_gateway_token') {
      throw new Error(
        'OPENCLAW_GATEWAY_TOKEN is still set to the placeholder value. Replace it with your real shared gateway token.',
      );
    }

    this.gatewayUrl = this.normalizeGatewayUrl(rawGatewayUrl);
    this.gatewayToken = configuredToken;
    this.agentId = this.configService.get<string>('OPENCLAW_AGENT_ID', 'main');
    this.clientId = this.configService.get<string>(
      'OPENCLAW_GATEWAY_CLIENT_ID',
      'gateway-client',
    );
    this.requestScopes = this.normalizeScopes(
      this.configService.get<string>(
        'OPENCLAW_GATEWAY_REQUEST_SCOPES',
        'operator.write',
      ),
    );
    this.requestTimeoutMs = Number(
      this.configService.get<number>('OPENCLAW_GATEWAY_TIMEOUT_MS', 30000),
    );
    this.identityPath = this.configService.get<string>(
      'OPENCLAW_GATEWAY_IDENTITY_PATH',
      join(process.cwd(), '.openclaw', 'device.json'),
    );
  }

  private resolveGatewayToken(): string | null {
    const candidates = [
      this.configService.get<string>('OPENCLAW_GATEWAY_TOKEN'),
      this.configService.get<string>('OPENCLAW_GATEWAY_AUTH_TOKEN'),
      this.configService.get<string>('OPENCLAW_API_KEY'),
    ];

    for (const candidate of candidates) {
      const token = this.sanitizeToken(candidate);

      if (token) {
        return token;
      }
    }

    return null;
  }

  private sanitizeToken(value: string | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    // Support secrets copied with surrounding single/double quotes.
    const unwrapped = trimmed.replace(/^(['"])(.*)\1$/, '$2').trim();
    return unwrapped || null;
  }

  /**
   * Executes a prompt via OpenCLAW Gateway API.
   * @param userId Internal UUID of the user.
   * @param prompt User's input prompt.
   * @returns OpenCLAW response containing output and metadata.
   */
  async executeJob(userId: string, prompt: string): Promise<OpenClawResponse> {
    const sessionId = `user_${userId}`;

    this.logger.log(
      `Forwarding job for user ${userId} to OpenClaw Gateway (Session: ${sessionId})`,
    );

    try {
      return await this.runGatewayAgent(sessionId, prompt);
    } catch (error) {
      throw this.mapOpenClawError(error, userId);
    }
  }

  private async runGatewayAgent(
    sessionId: string,
    prompt: string,
  ): Promise<OpenClawResponse> {
    const identity = await this.loadOrCreateDeviceIdentity();
    const clientPlatform = process.platform;
    const canonicalSessionKey = this.buildCanonicalSessionKey(sessionId);

    return await new Promise<OpenClawResponse>((resolve, reject) => {
      const socket = new WebSocket(this.gatewayUrl);
      let settled = false;
      let connectComplete = false;
      let agentAccepted = false;
      let previewRequested = false;
      let activeRunId: string | null = null;
      let waitPayload: GatewayWaitPayload | null = null;

      const timer = setTimeout(() => {
        finalizeError(
          new GatewayTimeoutException(
            'Agent service timed out while waiting for OpenClaw Gateway',
          ),
        );
      }, this.requestTimeoutMs);

      const cleanup = () => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        socket.removeAllListeners();
        socket.close();
      };

      const finalizeSuccess = (value: OpenClawResponse) => {
        cleanup();
        resolve(value);
      };

      const finalizeError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const send = (message: Record<string, unknown>) => {
        socket.send(JSON.stringify(message));
      };

      socket.on('error', (error) => {
        finalizeError(error);
      });

      socket.on('close', () => {
        if (!settled) {
          finalizeError(
            new ServiceUnavailableException(
              'OpenClaw Gateway closed the connection before the run completed',
            ),
          );
        }
      });

      socket.on('message', (raw) => {
        let message: GatewayEnvelope;

        try {
          message = JSON.parse(String(raw)) as GatewayEnvelope;
        } catch {
          return;
        }

        if (
          message.type === 'event' &&
          message.event === 'connect.challenge' &&
          !connectComplete
        ) {
          const nonce = String(message.payload?.nonce ?? '');
          const signedAt = Date.now();
          const signaturePayload = this.buildDeviceAuthPayload({
            identity,
            nonce,
            signedAt,
            platform: clientPlatform,
            deviceFamily: '',
          });

          send({
            type: 'req',
            id: 'connect',
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: this.clientId,
                version: 'zamunda-api',
                platform: clientPlatform,
                mode: 'backend',
              },
              caps: [],
              role: 'operator',
              scopes: this.requestScopes,
              auth: {
                token: this.gatewayToken,
              },
              device: {
                id: identity.deviceId,
                publicKey: this.publicKeyRawBase64UrlFromPem(
                  identity.publicKeyPem,
                ),
                signature: this.signDevicePayload(
                  identity.privateKeyPem,
                  signaturePayload,
                ),
                signedAt,
                nonce,
              },
            },
          });
          return;
        }

        if (message.type !== 'res') {
          return;
        }

        if (message.id === 'connect') {
          if (message.ok !== true) {
            finalizeError(this.createGatewayRpcError(message.error));
            return;
          }

          connectComplete = true;
          send({
            type: 'req',
            id: 'agent',
            method: 'agent',
            params: {
              agentId: this.agentId,
              sessionKey: sessionId,
              message: prompt,
              idempotencyKey: randomUUID(),
            },
          });
          return;
        }

        if (message.id === 'agent') {
          const runId = this.extractRunId(message);

          if (runId && !agentAccepted) {
            agentAccepted = true;
            activeRunId = runId;
            send({
              type: 'req',
              id: 'wait',
              method: 'agent.wait',
              params: {
                runId,
                timeoutMs: this.requestTimeoutMs,
              },
            });
            return;
          }

          if (!agentAccepted && message.ok !== true) {
            finalizeError(this.createGatewayRpcError(message.error));
          }
          return;
        }

        if (message.id === 'wait') {
          if (message.ok !== true) {
            finalizeError(this.createGatewayRpcError(message.error));
            return;
          }

          waitPayload = (message.payload ?? {}) as GatewayWaitPayload;

          if (waitPayload.status === 'timeout') {
            finalizeError(
              new GatewayTimeoutException(
                'OpenClaw Gateway did not finish the run before the wait deadline',
              ),
            );
            return;
          }

          if (!previewRequested) {
            previewRequested = true;
            send({
              type: 'req',
              id: 'preview',
              method: 'sessions.preview',
              params: {
                keys: [canonicalSessionKey],
                limit: 12,
                maxChars: 4000,
              },
            });
          }
          return;
        }

        if (message.id === 'preview') {
          if (message.ok !== true) {
            finalizeError(this.createGatewayRpcError(message.error));
            return;
          }

          const output = this.extractAssistantOutput(message.payload);

          if (!output && waitPayload?.status === 'error') {
            finalizeError(
              new BadGatewayException(
                waitPayload.error ??
                  'OpenClaw Gateway could not complete the run successfully',
              ),
            );
            return;
          }

          const tokensUsed = this.extractTokenUsage(waitPayload?.yielded);

          finalizeSuccess({
            output,
            metadata: {
              tokens_used: tokensUsed,
              status: waitPayload?.status,
              runId: activeRunId,
            },
          });
        }
      });
    });
  }

  private buildCanonicalSessionKey(sessionKey: string): string {
    return `agent:${this.agentId}:${sessionKey}`;
  }

  private normalizeGatewayUrl(rawUrl: string): string {
    const url = new URL(rawUrl);

    if (url.protocol === 'http:') {
      url.protocol = 'ws:';
    } else if (url.protocol === 'https:') {
      url.protocol = 'wss:';
    }

    return url.toString();
  }

  private normalizeScopes(rawScopes: string): string[] {
    const scopes = new Set(
      rawScopes
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean),
    );

    if (scopes.has('operator.admin')) {
      scopes.add('operator.read');
      scopes.add('operator.write');
    } else if (scopes.has('operator.write')) {
      scopes.add('operator.read');
    }

    return [...scopes].sort();
  }

  private async loadOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
    try {
      const existing = JSON.parse(
        await readFile(this.identityPath, 'utf8'),
      ) as Record<string, unknown>;

      if (
        existing.version === 1 &&
        typeof existing.deviceId === 'string' &&
        typeof existing.publicKeyPem === 'string' &&
        typeof existing.privateKeyPem === 'string'
      ) {
        return {
          deviceId: existing.deviceId,
          publicKeyPem: existing.publicKeyPem,
          privateKeyPem: existing.privateKeyPem,
        };
      }
    } catch {
      // Fall through to create a new identity.
    }

    await mkdir(dirname(this.identityPath), { recursive: true });

    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const publicKeyPem = publicKey.export({
      type: 'spki',
      format: 'pem',
    }) as string;
    const privateKeyPem = privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    }) as string;
    const deviceId = createHash('sha256')
      .update(this.derivePublicKeyRaw(publicKeyPem))
      .digest('hex');

    await writeFile(
      this.identityPath,
      `${JSON.stringify(
        {
          version: 1,
          deviceId,
          publicKeyPem,
          privateKeyPem,
          createdAtMs: Date.now(),
        },
        null,
        2,
      )}\n`,
      { mode: 0o600 },
    );

    return {
      deviceId,
      publicKeyPem,
      privateKeyPem,
    };
  }

  private derivePublicKeyRaw(publicKeyPem: string): Buffer {
    const spki = createPublicKey(publicKeyPem).export({
      type: 'spki',
      format: 'der',
    }) as Buffer;

    if (
      spki.length === ED25519_SPKI_PREFIX.length + 32 &&
      spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
    ) {
      return spki.subarray(ED25519_SPKI_PREFIX.length);
    }

    return spki;
  }

  private publicKeyRawBase64UrlFromPem(publicKeyPem: string): string {
    return this.base64UrlEncode(this.derivePublicKeyRaw(publicKeyPem));
  }

  private signDevicePayload(privateKeyPem: string, payload: string): string {
    return this.base64UrlEncode(
      sign(null, Buffer.from(payload, 'utf8'), createPrivateKey(privateKeyPem)),
    );
  }

  private buildDeviceAuthPayload(params: {
    identity: DeviceIdentity;
    nonce: string;
    signedAt: number;
    platform: string;
    deviceFamily: string;
  }): string {
    return [
      'v3',
      params.identity.deviceId,
      this.clientId,
      'backend',
      'operator',
      this.requestScopes.join(','),
      String(params.signedAt),
      this.gatewayToken,
      params.nonce,
      params.platform,
      params.deviceFamily,
    ].join('|');
  }

  private base64UrlEncode(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/g, '');
  }

  private extractRunId(message: GatewayEnvelope): string | null {
    const payloadRunId = message.payload?.runId;
    if (typeof payloadRunId === 'string' && payloadRunId.trim()) {
      return payloadRunId;
    }

    return null;
  }

  private extractAssistantOutput(
    payload: Record<string, unknown> | undefined,
  ): string {
    const previews = Array.isArray(payload?.previews) ? payload.previews : [];
    const firstPreview = previews[0] as
      | { items?: Array<{ role?: string; text?: string }> }
      | undefined;
    const items = Array.isArray(firstPreview?.items) ? firstPreview.items : [];
    const collected: string[] = [];

    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];

      if (item?.role === 'user') {
        break;
      }

      if (item?.role === 'assistant' && typeof item.text === 'string') {
        collected.unshift(item.text.trim());
      }
    }

    return collected.filter(Boolean).join('\n\n').trim();
  }

  private extractTokenUsage(value: unknown): number | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const candidate = value as Record<string, unknown>;

    if (typeof candidate.tokens_used === 'number') {
      return candidate.tokens_used;
    }

    if (typeof candidate.tokensUsed === 'number') {
      return candidate.tokensUsed;
    }

    if (
      candidate.usage &&
      typeof candidate.usage === 'object' &&
      candidate.usage !== null
    ) {
      const usage = candidate.usage as Record<string, unknown>;

      if (typeof usage.totalTokens === 'number') {
        return usage.totalTokens;
      }
    }

    return undefined;
  }

  private createGatewayRpcError(error: GatewayEnvelope['error']): Error {
    const code = error?.code;
    const detailsCode =
      typeof error?.details?.code === 'string' ? error.details.code : undefined;
    const message = error?.message ?? 'OpenClaw Gateway rejected the request';

    if (code === 'NOT_PAIRED' || detailsCode === 'PAIRING_REQUIRED') {
      return new ServiceUnavailableException(
        'OpenClaw Gateway requires device pairing before the API can run jobs. Approve the pending device request in OpenClaw Control UI, then retry.',
      );
    }

    if (
      code === 'AUTH_TOKEN_MISMATCH' ||
      code === 'AUTH_TOKEN_MISSING' ||
      detailsCode === 'DEVICE_AUTH_SIGNATURE_INVALID'
    ) {
      return new ServiceUnavailableException(
        'OpenClaw Gateway authentication failed. Verify OPENCLAW_GATEWAY_TOKEN and the persisted device identity.',
      );
    }

    if (code === 'UNAVAILABLE') {
      return new ServiceUnavailableException(message);
    }

    return new BadGatewayException(message);
  }

  private mapOpenClawError(error: unknown, userId: string): Error {
    if (this.isKnownGatewayError(error)) {
      this.logger.error(
        `OpenClaw Gateway request failed for user ${userId}: ${error.message}`,
      );
      return error;
    }

    if (error instanceof Error) {
      this.logger.error(
        `OpenClaw Gateway execution failed for user ${userId}: ${error.message}`,
      );
      return new ServiceUnavailableException(
        'Agent service is currently unavailable',
      );
    }

    this.logger.error(
      `OpenClaw Gateway execution failed for user ${userId}: unexpected error`,
    );
    return new ServiceUnavailableException(
      'Agent service is currently unavailable',
    );
  }

  private isKnownGatewayError(error: unknown): error is Error {
    return (
      error instanceof GatewayTimeoutException ||
      error instanceof ServiceUnavailableException ||
      error instanceof BadGatewayException
    );
  }
}

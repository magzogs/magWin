import { z } from 'zod';

/**
 * JSON-lines contract with native/MagWinHelper. Keep in sync with
 * native/MagWinHelper/Sources/HelperCore/Protocol.swift and
 * docs/docs/architecture/helper-protocol.md.
 */
export const HELPER_PROTOCOL_VERSION = 1;

/** Swift omits nil optionals; normalise missing and null to null. */
const nullableString = z
  .string()
  .nullish()
  .transform((value) => value ?? null);

export const rectDto = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const pointDto = z.object({ x: z.number(), y: z.number() });

export const helloResult = z.object({
  protocolVersion: z.number(),
  pid: z.number(),
  accessibility: z.boolean(),
});

export const permissionResult = z.object({
  accessibility: z.boolean(),
  screenRecording: z.boolean(),
});

export const displaysResult = z.object({
  displays: z.array(
    z.object({
      id: z.number(),
      uuid: z.string(),
      name: z.string(),
      frame: rectDto,
      visibleFrame: rectDto,
      isMain: z.boolean(),
    }),
  ),
});

export const topologyResult = z.object({
  displays: z.array(
    z.object({
      displayUuid: z.string(),
      currentSpaceId: z.number(),
      spaces: z.array(
        z.object({
          id: z.number(),
          uuid: nullableString,
          kind: z.enum(['desktop', 'fullscreen', 'other']),
        }),
      ),
    }),
  ),
});

export const switchResult = z.object({ method: z.string(), steps: z.number() });

const bindingDto = z.object({ keyCode: z.number(), modifiers: z.number(), enabled: z.boolean() });

export const hotkeysResult = z.object({
  switchToDesktop: z.array(z.object({ number: z.number(), binding: bindingDto })),
  moveLeft: bindingDto.nullish(),
  moveRight: bindingDto.nullish(),
});

export const windowsResult = z.object({
  windows: z.array(
    z.object({
      id: z.number(),
      pid: z.number(),
      bundleId: nullableString,
      appName: z.string(),
      title: nullableString,
      frame: rectDto,
      isOnScreen: z.boolean(),
      spaceIds: z.array(z.number()),
    }),
  ),
});

export const frameResult = z.object({ frame: rectDto });

export const emptyResult = z.object({});

export const appsResult = z.object({
  apps: z.array(
    z.object({
      pid: z.number(),
      bundleId: nullableString,
      name: z.string(),
      path: nullableString,
      isHidden: z.boolean(),
    }),
  ),
});

export const launchResult = z.object({ pid: z.number() });

export const edgeHoverEvent = z.object({
  windowId: z.number(),
  pid: z.number(),
  bundleId: nullableString,
  appName: z.string(),
  frame: rectDto,
  edge: z.enum(['top', 'bottom', 'left', 'right']),
  point: pointDto,
});

export const edgeBlockedEvent = z.object({ reason: z.string() });

export const logEvent = z.object({ level: z.string(), message: z.string() });

export const responseEnvelope = z.union([
  z.object({ id: z.number(), ok: z.literal(true), result: z.unknown() }),
  z.object({
    id: z.number(),
    ok: z.literal(false),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
]);

export const eventEnvelope = z.object({ event: z.string(), data: z.unknown() });

export const HelperEvents = {
  edgeHover: 'edge.hover',
  edgeBlocked: 'edge.blocked',
  log: 'log',
} as const;

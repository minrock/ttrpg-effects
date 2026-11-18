import { serviceDicePublicStateSchema, serviceDiceStateSchema, type ServiceDicePublicState, type ServiceDiceState } from "./service-dice";

export const SERVICE_DICE_FIXTURE_IDS = Object.freeze({
  author: "11111111-1111-4111-8111-111111111111",
  roll: "22222222-2222-4222-8222-222222222222",
  context: "33333333-3333-4333-8333-333333333333"
});

const result = {
  groups: [{ id: "fire", damageType: "fire", formula: "1d6 + 3", dice: [{ id: "fire:d6:0", type: "d6", value: 4, parts: [4] }], modifier: 3, total: 7 }],
  poolTotal: 7,
  d20: null
} as const;

export const serviceDicePublicFixture: ServiceDicePublicState = serviceDicePublicStateSchema.parse({
  version: 1,
  sequence: 4,
  serverTime: 1000,
  selfPublicId: SERVICE_DICE_FIXTURE_IDS.author,
  publishedContext: { token: SERVICE_DICE_FIXTURE_IDS.context, sceneId: "published-scene", mapId: "published-map", label: "Mesa publicada" },
  occupancy: { rollId: SERVICE_DICE_FIXTURE_IDS.roll, author: { kind: "player", publicId: SERVICE_DICE_FIXTURE_IDS.author, alias: "Ana", discriminator: 2 }, phase: "settled", createdAt: 900, expiresAt: null },
  presentation: null,
  history: {
    revision: 4,
    total: 1,
    offset: 0,
    limit: 10,
    entries: [{
      id: SERVICE_DICE_FIXTURE_IDS.roll,
      author: { kind: "player", publicId: SERVICE_DICE_FIXTURE_IDS.author, alias: "Ana", discriminator: 2 },
      visibility: "public",
      context: { token: SERVICE_DICE_FIXTURE_IDS.context, sceneId: "published-scene", mapId: "published-map", label: "Mesa publicada" },
      selection: { groups: [{ id: "fire", damageType: "fire", dice: { d6: 1 }, modifier: 3 }], includeD20: false, d20Modifier: 0, appearance: { color: "ruby", material: "resin" }, force: 1, d20: null },
      createdAt: 900,
      settledAt: 1000,
      status: "complete",
      result
    }]
  }
});

export const serviceDicePlayerFixture: ServiceDiceState = serviceDiceStateSchema.parse({ audience: "player", public: serviceDicePublicFixture });

export const serviceDiceFailureFixture: ServiceDicePublicState = serviceDicePublicStateSchema.parse({
  ...serviceDicePublicFixture,
  sequence: 5,
  occupancy: null,
  history: {
    ...serviceDicePublicFixture.history,
    revision: 5,
    entries: [{ ...serviceDicePublicFixture.history.entries[0], status: "failed", result: null }]
  }
});

export const serviceDiceDmFixture: ServiceDiceState = serviceDiceStateSchema.parse({
  audience: "dm",
  public: { ...serviceDicePublicFixture, selfPublicId: null },
  private: {
    context: { token: "dm-private-context", sceneId: "draft-scene", mapId: "draft-map", sceneName: "Borrador privado", mapName: "Mapa privado" },
    occupancy: null,
    presentation: null,
    history: {
      revision: 8,
      total: 2,
      offset: 0,
      limit: 10,
      entries: [
        ...serviceDicePublicFixture.history.entries,
        { ...serviceDiceFailureFixture.history.entries[0], id: "55555555-5555-4555-8555-555555555555", author: { kind: "dm" }, visibility: "hidden", context: { token: "dm-private-context", sceneId: "draft-scene", mapId: "draft-map", sceneName: "Borrador privado", mapName: "Mapa privado" } }
      ]
    }
  }
});

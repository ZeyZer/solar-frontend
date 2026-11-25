import { analyseSolarTargetBuildings } from "./solarRoofApi";

test("forwards the abort signal without adding it to the roof analysis body", async () => {
  const originalFetch = global.fetch;
  const controller = new AbortController();
  const solarTargetBuildings = [{ latitude: 51, longitude: 0 }];
  const result = { summary: { uniqueBuildingsReturned: 1 } };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => result });

  try {
    await expect(analyseSolarTargetBuildings({
      solarTargetBuildings,
      signal: controller.signal,
    })).resolves.toEqual(result);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/solar-roof\/building-insights\/batch$/);
    expect(options.method).toBe("POST");
    expect(options.signal).toBe(controller.signal);
    expect(JSON.parse(options.body)).toEqual({
      requiredQuality: "BASE",
      includeDetectedArrays: false,
      propertyType: "unknown",
      propertyBoundary: null,
      solarTargetBuildings,
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("records headers, body reading and parsing without changing the result", async () => {
  const originalFetch = global.fetch;
  const originalEntries = performance.getEntriesByName;
  const id = "ac2585ac-ab31-4e13-ac9e-81fe99569347";
  const result = { summary: { uniqueBuildingsReturned: 1 }, fixture: "private response" };
  const diagnostics = {};
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: {
      get: (name) => ({
        "X-Roof-Request-Id": id,
        "Server-Timing": "roof;dur=23.50, google;dur=18.2, private;dur=123",
      })[name],
    },
    text: async () => JSON.stringify(result),
  });
  performance.getEntriesByName = () => [{
    initiatorType: "fetch",
    startTime: performance.now(),
    domainLookupStart: 1,
    domainLookupEnd: 2,
    connectStart: 2,
    connectEnd: 3,
    responseStart: 100,
    responseEnd: 104,
    decodedBodySize: 76,
    encodedBodySize: 55,
    transferSize: 355,
  }];

  try {
    await expect(analyseSolarTargetBuildings({
      solarTargetBuildings: [{ latitude: 51, longitude: 0 }],
      diagnostics,
    })).resolves.toEqual(result);
    expect(diagnostics).toMatchObject({
      requestId: id,
      status: 200,
      toHeadersMs: expect.any(Number),
      bodyReadMs: expect.any(Number),
      jsonParseMs: expect.any(Number),
      requestMs: expect.any(Number),
      serverTimingMs: { roof: 23.5, google: 18.2 },
      resourceTiming: { transferMs: 4, decodedBodyBytes: 76, encodedBodyBytes: 55 },
    });
    expect(diagnostics.serverTimingMs.private).toBeUndefined();
    expect(JSON.stringify(diagnostics)).not.toContain("private response");
  } finally {
    global.fetch = originalFetch;
    performance.getEntriesByName = originalEntries;
  }
});

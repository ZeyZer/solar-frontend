import { act, fireEvent, render, screen } from "@testing-library/react";
import { analyseSolarTargetBuildings } from "../../api/solarRoofApi";
import { loadGoogleMapsLibrary } from "../../utils/googleMapsLoader";
import SolarTargetBuildingSelector from "./SolarTargetBuildingSelector";

jest.mock("../../api/solarRoofApi");
jest.mock("../../utils/googleMapsLoader");

const home = { id: "home", latitude: 51, longitude: 0 };
const result = {
  success: true,
  summary: { uniqueBuildingsReturned: 1 },
  solarBuildingModels: [{ id: "building-1", targetId: "home" }],
};

const originalKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const originalMaps = window.google;
const originalShowModal = HTMLDialogElement.prototype.showModal;
const originalClose = HTMLDialogElement.prototype.close;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY = "test-key";
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  window.google = {
    maps: {
      Marker: jest.fn(() => ({ setMap: jest.fn() })),
      Polyline: jest.fn(() => ({ setMap: jest.fn() })),
    },
  };
  loadGoogleMapsLibrary.mockResolvedValue({
    Map: jest.fn(() => ({ addListener: () => ({ remove: jest.fn() }) })),
  });
});

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  } else {
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = originalKey;
  }
  window.google = originalMaps;
  HTMLDialogElement.prototype.showModal = originalShowModal;
  HTMLDialogElement.prototype.close = originalClose;
  jest.useRealTimers();
});

function deferAnalysis() {
  let resolve;
  let reject;
  analyseSolarTargetBuildings.mockImplementationOnce(
    () => new Promise((resolveRequest, rejectRequest) => {
      resolve = resolveRequest;
      reject = rejectRequest;
    })
  );
  return { resolve: (value) => resolve(value), reject: (error) => reject(error) };
}

async function renderSelector(props = {}) {
  const onChange = jest.fn();
  const view = await act(async () => render(
    <SolarTargetBuildingSelector
      value={{ solarTargetBuildings: [home] }}
      propertyType="detached"
      onChange={onChange}
      {...props}
    />
  ));
  return { ...view, onChange };
}

function confirmHome() {
  fireEvent.click(screen.getByRole("button", { name: "Confirm this is my home" }));
}

test("blocks synchronous duplicate submissions and applies a successful analysis", async () => {
  const pending = deferAnalysis();
  const { container, onChange } = await renderSelector();
  const confirm = screen.getByRole("button", { name: "Confirm this is my home" });

  act(() => {
    confirm.click();
    confirm.click();
  });

  expect(analyseSolarTargetBuildings).toHaveBeenCalledTimes(1);
  expect(analyseSolarTargetBuildings.mock.calls[0][0]).not.toHaveProperty("diagnostics");
  expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  expect(screen.getByRole("dialog", { name: "Analysing your roof" })).toBeTruthy();

  await act(async () => pending.resolve(result));

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(container.querySelector('[aria-busy="false"]')).not.toBeNull();
  expect(screen.getByText("Home confirmed")).toBeTruthy();
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
    solarApiAnalysis: result,
    solarTargetBuildings: [home],
  }));
  expect(loadGoogleMapsLibrary).toHaveBeenCalledTimes(1);
});

test("cleans up after failure and allows retry with the same target", async () => {
  analyseSolarTargetBuildings
    .mockRejectedValueOnce(new Error("Roof lookup failed"))
    .mockResolvedValueOnce(result);
  const { onChange } = await renderSelector();

  confirmHome();
  expect(await screen.findByText("Roof lookup failed")).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(onChange).not.toHaveBeenCalled();

  confirmHome();
  expect(await screen.findByText("Home confirmed")).toBeTruthy();
  expect(analyseSolarTargetBuildings).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("dialog")).toBeNull();
});

test.each([true, false])("ignores a cancelled response arriving before the retry completes: %s", async (oldFirst) => {
  const old = deferAnalysis();
  const current = deferAnalysis();
  const { onChange } = await renderSelector();
  confirmHome();

  const { signal } = analyseSolarTargetBuildings.mock.calls[0][0];
  fireEvent.click(screen.getByRole("button", { name: "Cancel analysis" }));
  expect(signal.aborted).toBe(true);
  expect(screen.queryByRole("dialog")).toBeNull();

  confirmHome();
  if (oldFirst) {
    await act(async () => old.resolve(result));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  }

  const replacement = { ...result, summary: { uniqueBuildingsReturned: 2 } };
  await act(async () => current.resolve(replacement));
  if (!oldFirst) {
    await act(async () => old.resolve(result));
  }

  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange.mock.calls[0][0].solarApiAnalysis).toBe(replacement);
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("aborts on navigation and does not emit a late response", async () => {
  const pending = deferAnalysis();
  const { unmount, onChange } = await renderSelector();
  confirmHome();

  unmount();
  expect(analyseSolarTargetBuildings.mock.calls[0][0].signal.aborted).toBe(true);
  await act(async () => pending.resolve(result));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("shows reassurance after ten seconds and handles native dialog cancellation", async () => {
  jest.useFakeTimers();
  deferAnalysis();
  await renderSelector();
  confirmHome();

  const dialog = screen.getByRole("dialog");
  expect(screen.queryByText(/some properties take/i)).toBeNull();
  act(() => jest.advanceTimersByTime(10000));
  expect(screen.getByText(/some properties take/i)).toBeTruthy();

  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(analyseSolarTargetBuildings.mock.calls[0][0].signal.aborted).toBe(true);
});

test("invalidates an active request when the parent resets roof geometry", async () => {
  const pending = deferAnalysis();
  const { onChange, rerender } = await renderSelector();
  confirmHome();

  rerender(<SolarTargetBuildingSelector value={null} propertyType="detached" onChange={onChange} />);
  expect(analyseSolarTargetBuildings.mock.calls[0][0].signal.aborted).toBe(true);
  expect(screen.queryByRole("dialog")).toBeNull();
  await act(async () => pending.resolve(result));
  expect(onChange).not.toHaveBeenCalled();
});

test("preserves the previous roof model when removing an additional building fails", async () => {
  const garage = { id: "garage", latitude: 51.001, longitude: 0 };
  analyseSolarTargetBuildings.mockRejectedValueOnce(new Error("Roof lookup failed"));
  const { onChange } = await renderSelector({
    value: { solarTargetBuildings: [home, garage], solarApiAnalysis: result },
  });

  fireEvent.click(screen.getByRole("button", { name: "Remove added building" }));
  expect(screen.getByRole("dialog", { name: "Updating your roof assessment" })).toBeTruthy();
  expect(await screen.findByText("Roof lookup failed")).toBeTruthy();
  expect(screen.getByText("Home confirmed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Remove added building" }).disabled).toBe(false);
  expect(onChange).not.toHaveBeenCalled();
});

test("keeps the marked boundary in the request and applies the returned analysis", async () => {
  const boundary = {
    boundaryLines: [[{ lat: 51, lng: 0 }, { lat: 51.001, lng: 0 }]],
  };
  const pending = deferAnalysis();
  const { onChange } = await renderSelector({
    propertyType: "semi_detached",
    value: {
      solarTargetBuildings: [home],
      solarApiAnalysis: result,
      propertyBoundary: boundary,
    },
  });

  fireEvent.click(screen.getByRole("button", { name: "Confirm boundary line" }));
  expect(screen.getByRole("dialog", { name: "Checking your roof boundary" })).toBeTruthy();
  expect(analyseSolarTargetBuildings).toHaveBeenCalledWith(expect.objectContaining({
    propertyBoundary: boundary,
    propertyType: "semi_detached",
    solarTargetBuildings: [home],
  }));

  const filtered = {
    ...result,
    solarBuildingModels: [
      { ...result.solarBuildingModels[0], propertyBoundaryFilter: { applied: true } },
    ],
  };
  await act(async () => pending.resolve(filtered));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText("Home confirmed")).toBeTruthy();
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
    propertyBoundary: boundary,
    solarApiAnalysis: filtered,
  }));
});

test("continues applying results with a summary when the batch reports partial success", async () => {
  const partial = { ...result, success: false };
  analyseSolarTargetBuildings.mockResolvedValueOnce(partial);
  const { onChange } = await renderSelector();

  confirmHome();
  expect(await screen.findByText("Home confirmed")).toBeTruthy();
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ solarApiAnalysis: partial }));
});

test("reports opt-in result application, commit and marker timings without logging data", async () => {
  const pending = deferAnalysis();
  const log = jest.spyOn(console, "info").mockImplementation(() => {});
  window.sessionStorage.setItem("roofPerf", "1");

  try {
    await renderSelector();
    confirmHome();
    const { diagnostics } = analyseSolarTargetBuildings.mock.calls[0][0];
    expect(diagnostics.targetCount).toBe(1);
    await act(async () => pending.resolve(result));

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("[roof-perf]", {
      outcome: "applied",
      targetCount: 1,
      totalMs: expect.any(Number),
      applyMs: expect.any(Number),
      applyToCommitMs: expect.any(Number),
      boundaryOverlayMs: expect.any(Number),
      mapMarkersMs: expect.any(Number),
    });
  } finally {
    window.sessionStorage.removeItem("roofPerf");
    log.mockRestore();
  }
});

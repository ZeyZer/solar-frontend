function round1(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 10) / 10;
}

function roundMoney(value) {
  return Math.round(Number(value || 0));
}

function findCurveCandidate(curve, batteryKWh) {
  const target = Number(batteryKWh);

  return (Array.isArray(curve) ? curve : []).find(
    (candidate) =>
      Number(candidate?.batteryKWhUsable || 0) === target
  );
}

function getBatteryScenario(quote, batteryKWh) {
  const scenarios =
    quote?.batteryRecommendations?.scenarios || {};

  const target = Number(batteryKWh);

  return (
    scenarios[String(target)] ||
    Object.values(scenarios).find(
      (scenario) =>
        Number(scenario?.batteryKWhUsable || 0) === target
    ) ||
    null
  );
}

function getRecommendationBatteryKWh(
  quote,
  strategy = "balanced"
) {
  const recommendations =
    quote?.batteryRecommendations || {};

  let recommendation = recommendations.balanced;

  if (strategy === "fastest_payback") {
    recommendation = recommendations.bestPayback;
  }

  if (strategy === "max_savings") {
    recommendation =
      recommendations.bestLifetimeSavings;
  }

  return Number(
    recommendation?.batteryKWhUsable || 0
  );
}

function buildNoBatteryComparison(
  quote,
  selectedBatteryKWh
) {
  const curve =
    quote?.batteryRecommendations?.curve || [];

  const noBatteryCandidate =
    findCurveCandidate(curve, 0);

  const selectedCandidate =
    findCurveCandidate(
      curve,
      selectedBatteryKWh
    );

  if (!noBatteryCandidate || !selectedCandidate) {
    return null;
  }

  const noBatteryAnnualBenefit = Number(
    noBatteryCandidate.annualBenefit || 0
  );

  const selectedBatteryAnnualBenefit = Number(
    selectedCandidate.annualBenefit || 0
  );

  const noBatterySystemCost = Number(
    noBatteryCandidate.candidateMidPrice || 0
  );

  const selectedBatterySystemCost = Number(
    selectedCandidate.candidateMidPrice || 0
  );

  const noBatteryLifetimeNetSavings = Number(
    noBatteryCandidate.lifetimeNetSavings || 0
  );

  const selectedBatteryLifetimeNetSavings = Number(
    selectedCandidate.lifetimeNetSavings || 0
  );

  const incrementalAnnualBenefit =
    selectedBatteryAnnualBenefit -
    noBatteryAnnualBenefit;

  const incrementalSystemCost =
    selectedBatterySystemCost -
    noBatterySystemCost;

  const incrementalLifetimeNetSavings =
    selectedBatteryLifetimeNetSavings -
    noBatteryLifetimeNetSavings;

  const incrementalBatteryPaybackYears =
    incrementalAnnualBenefit > 0 &&
    incrementalSystemCost > 0
      ? round1(
          incrementalSystemCost /
            incrementalAnnualBenefit
        )
      : null;

  return {
    noBattery: {
      batteryKWhUsable: 0,
      annualBenefit:
        roundMoney(noBatteryAnnualBenefit),
      lifetimeNetSavings:
        roundMoney(noBatteryLifetimeNetSavings),
      candidateMidPrice:
        roundMoney(noBatterySystemCost),
      annualImportedKWh: roundMoney(
        noBatteryCandidate.annualImportedKWh
      ),
      annualExportedKWh: roundMoney(
        noBatteryCandidate.annualExportedKWh
      ),
      annualSelfUsedKWh: roundMoney(
        noBatteryCandidate.annualSelfUsedKWh
      ),
    },

    selectedBattery: {
      batteryKWhUsable: Number(
        selectedCandidate.batteryKWhUsable || 0
      ),
      requestedBatteryKWhUsable: Number(
        selectedBatteryKWh || 0
      ),
      annualBenefit: roundMoney(
        selectedBatteryAnnualBenefit
      ),
      lifetimeNetSavings: roundMoney(
        selectedBatteryLifetimeNetSavings
      ),
      candidateMidPrice: roundMoney(
        selectedBatterySystemCost
      ),
      annualImportedKWh: roundMoney(
        selectedCandidate.annualImportedKWh
      ),
      annualExportedKWh: roundMoney(
        selectedCandidate.annualExportedKWh
      ),
      annualSelfUsedKWh: roundMoney(
        selectedCandidate.annualSelfUsedKWh
      ),
    },

    incremental: {
      annualBenefit: roundMoney(
        incrementalAnnualBenefit
      ),
      lifetimeNetSavings: roundMoney(
        incrementalLifetimeNetSavings
      ),
      systemCost: roundMoney(
        incrementalSystemCost
      ),
      estimatedBatteryCost: roundMoney(
        incrementalSystemCost
      ),
      batteryPaybackYears:
        incrementalBatteryPaybackYears,
    },

    verdict: {
      batteryAddsAnnualValue:
        incrementalAnnualBenefit > 0,
      batteryAddsLifetimeValue:
        incrementalLifetimeNetSavings > 0,
      batteryHasPositivePayback:
        incrementalBatteryPaybackYears !== null,
    },
  };
}

function applyBatteryScenarioToQuote(
  quote,
  batteryKWh
) {
  if (!quote) return quote;

  const targetBatteryKWh =
    Number(batteryKWh || 0);

  const scenario = getBatteryScenario(
    quote,
    targetBatteryKWh
  );

  if (!scenario) {
    console.warn(
      `No reusable battery scenario found for ${targetBatteryKWh} kWh.`
    );

    return quote;
  }

  const noBatteryComparison =
    buildNoBatteryComparison(
      quote,
      targetBatteryKWh
    );

  return {
    ...quote,

    batteryKWh: targetBatteryKWh,
    batteryCapacity: targetBatteryKWh,

    priceLow: scenario.priceLow,
    priceHigh: scenario.priceHigh,

    annualBillSavings:
      scenario.annualBillSavings,
    annualSegIncome:
      scenario.annualSegIncome,
    totalAnnualBenefit:
      scenario.totalAnnualBenefit,

    simplePaybackYears:
      scenario.simplePaybackYears,

    annualSelfUsedKWh:
      scenario.annualSelfUsedKWh,
    annualExportedKWh:
      scenario.annualExportedKWh,
    annualImportedKWh:
      scenario.annualImportedKWh,

    financialSeries:
      scenario.financialSeries,

    batteryRecommendations: {
      ...quote.batteryRecommendations,

      assumptions: {
        ...(quote.batteryRecommendations?.assumptions || {}),
        selectedBatteryKWh: targetBatteryKWh,
      },

      noBatteryComparison,
    },

    hourlyModel: {
      ...(quote.hourlyModel || {}),
      ...(scenario.hourlyModel || {}),

      annualSelfUsedKWh:
        scenario.annualSelfUsedKWh,
      annualExportedKWh:
        scenario.annualExportedKWh,
      annualImportedKWh:
        scenario.annualImportedKWh,

      // Recalc must know which battery is currently active.
      _batteryKWh: targetBatteryKWh,
    },
  };
}

function resolveBatterySelection(
  quote,
  form = {}
) {
  const mode =
    form.batteryChoiceMode || "recommend";

  const strategy =
    form.batteryStrategy || "balanced";

  let targetBatteryKWh = 0;

  if (mode === "custom") {
    targetBatteryKWh = Number(
      form.batteryCustomKWh ??
        form.batteryKWh ??
        0
    );
  } else if (mode === "recommend") {
    targetBatteryKWh =
      getRecommendationBatteryKWh(
        quote,
        strategy
      );

    // Defensive fallback if a particular recommendation
    // is unavailable for some reason.
    if (!(targetBatteryKWh > 0)) {
      targetBatteryKWh =
        getRecommendationBatteryKWh(
          quote,
          "balanced"
        );
    }

    if (!(targetBatteryKWh > 0)) {
      targetBatteryKWh =
        getRecommendationBatteryKWh(
          quote,
          "fastest_payback"
        );
    }
  }

  return {
    quote: applyBatteryScenarioToQuote(
      quote,
      targetBatteryKWh
    ),
    batteryKWh: targetBatteryKWh,
    mode,
    strategy,
  };
}

export {
  applyBatteryScenarioToQuote,
  getBatteryScenario,
  getRecommendationBatteryKWh,
  resolveBatterySelection,
};

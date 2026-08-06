export function humanPanelOption(opt) {
  const s = String(opt || "").toLowerCase();

  if (s.includes("premium")) return "Premium";
  if (s.includes("standard")) return "Standard";
  if (s.includes("budget")) return "Budget";
  if (s.includes("value")) return "Standard";

  return opt || "your chosen";
}

export function PANEL_UI(panelOption) {
  const s = String(panelOption || "").toLowerCase();

  if (s.includes("premium")) {
    return {
      image: "/products/panels-premium-portrait.png",
      aboutTitle: "Premium panels",
      aboutText:
        "Premium panels prioritise high efficiency, good aesthetics and strong warranties. They’re ideal when roof space is limited or you want maximum output per panel. They are also an ideal choice to maximise your lifetime savings.",
    };
  }

  if (s.includes("value")) {
    return {
      image: "/products/panels-standard-portrait.png",
      aboutTitle: "Standard panels",
      aboutText:
        "Standard panels offer excellent value and reliable performance. These panels are a great option when you want a short payback period. They will typically have high efficiency, an all-black appearance and a 25-year warranty.",
    };
  }

  return {
    image: "/products/panels-portrait.png",
    aboutTitle: "Solar panels",
    aboutText:
      "We’ve selected panels appropriate for your roof and usage. Exact model and layout can be confirmed after a survey.",
  };
}

export function BATTERY_UI(capacity) {
  const c = Number(capacity || 0);

  if (!c || c <= 0) {
    return {
      image: "/products/battery-no-portrait.png",
      aboutTitle: "No battery selected",
      aboutText:
        "Without a battery, all excess solar is exported to the grid. Your evening and night-time electricity comes from the grid. We would advise installing a battery as they have a lot of benefits but you don't need one to benefit from solar.",
    };
  }

  if (c <= 5) {
    return {
      image: "/products/Small-home-battery.png",
      aboutTitle: "Small home battery",
      aboutText:
        "A compact battery helps shift daytime solar into the evening. Great for modest evening usage and improving self-consumption. Installing a bigger battery might give you more options to maximise your savings!",
    };
  }

  if (c <= 9) {
    return {
      image: "/products/battery-medium-portrait.png",
      aboutTitle: "Medium home battery",
      aboutText:
        "A balanced battery size that typically covers more evening demand and reduces grid reliance across more of the year. Your additional battery storage can be used to increase your savings in a variety of ways.",
    };
  }

  return {
    image: "/products/battery-large-portrait.png",
    aboutTitle: "Large home battery",
    aboutText:
      "Higher capacity maximises stored solar and can reduce imports further—especially for larger homes or higher evening demand. For most homes, a battery this size will be too large to be worth the high cost.",
  };
}

export function EV_UI(enabled) {
  if (enabled) {
    return {
      image: "/products/ev-yes-portrait.jpg",
      aboutTitle: "EV charger included",
      aboutText:
        "A home EV charger offers safe, convenient charging with smart scheduling—perfect for overnight tariffs or solar-aware charging. There are a lot of types of charger but most now have smart integrations.",
    };
  }

  return {
    image: "/products/ev-no-portrait.png",
    aboutTitle: "No EV charger",
    aboutText:
      "You haven’t included an EV charger. If you are considering an EV car in the next couple of years, it might be worth considering installing now as any smart charger would be at 0% VAT.",
  };
}

export function BIRD_UI(enabled) {
  if (enabled) {
    return {
      image: "/products/bird-yes-portrait.jpg",
      aboutTitle: "Bird protection included",
      aboutText:
        "Bird mesh reduces the chance of nesting under panels and helps protect cabling and airflow. We have priced this based on simple bird mesh protection. Other options like SolaSkirt might cost more.",
    };
  }

  return {
    image: "/products/bird-no-portrait.png",
    aboutTitle: "No bird protection",
    aboutText:
      "You haven’t included bird protection. Some homes never have pigeon problems but it's almost impossible to predict. Since bird mesh doesn't cost much it might be worth installing for peace of mind.",
  };
}
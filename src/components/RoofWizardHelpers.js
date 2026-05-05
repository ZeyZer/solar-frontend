import React from "react";

// -------- Roof Wizard image mapping  --------

// A nice "default" image to show when nothing is selected yet
const ROOF_WIZARD_DEFAULT_IMAGE = "/roof-wizard/default.png";

// Map step + selection -> image path in /public
const ROOF_WIZARD_IMAGES = {
  orientation: {
    "": ROOF_WIZARD_DEFAULT_IMAGE,
    N: "/roof-wizard/orientation/N.png",
    NE: "/roof-wizard/orientation/NE.png",
    E: "/roof-wizard/orientation/E.png",
    SE: "/roof-wizard/orientation/SE.png",
    S: "/roof-wizard/orientation/S.png",
    SW: "/roof-wizard/orientation/SW.png",
    W: "/roof-wizard/orientation/W.png",
    NW: "/roof-wizard/orientation/NW.png",
  },

  tilt: {
    "": ROOF_WIZARD_DEFAULT_IMAGE,
    25: "/roof-wizard/tilt/25.png",
    40: "/roof-wizard/tilt/40.png",
    55: "/roof-wizard/tilt/55.png",
  },

  shading: {
    "": ROOF_WIZARD_DEFAULT_IMAGE,
    none: "/roof-wizard/shading/none.png",
    some: "/roof-wizard/shading/some.png",
    a_lot: "/roof-wizard/shading/a_lot.png",
  },

  panels: {
    // optional: size presets
    small: "/roof-wizard/panels/small.png",
    medium: "/roof-wizard/panels/medium.png",
    large: "/roof-wizard/panels/large.png",
    custom: "/roof-wizard/panels/custom.png",
    "": ROOF_WIZARD_DEFAULT_IMAGE,
  },
};

// Small thumbnails for the roof summary cards
function getRoofThumbsForRoof(roof) {
  return {
    orientation:
      ROOF_WIZARD_IMAGES.orientation[roof.orientation || ""] ||
      ROOF_WIZARD_DEFAULT_IMAGE,

    tilt:
      ROOF_WIZARD_IMAGES.tilt[String(roof.tilt || "")] ||
      ROOF_WIZARD_DEFAULT_IMAGE,

    shading:
      ROOF_WIZARD_IMAGES.shading[roof.shading || ""] ||
      ROOF_WIZARD_DEFAULT_IMAGE,

    panels: (() => {
      // If roofSize is custom/empty, show custom (or default)
      const key = roof.roofSize || (Number(roof.panels) > 0 ? "custom" : "");
      return (
        ROOF_WIZARD_IMAGES.panels[key] ||
        ROOF_WIZARD_DEFAULT_IMAGE
      );
    })(),
  };
}

function Thumb({ src, alt }) {
  return (
    <img
      className="roof-thumb"
      src={src}
      alt={alt}
      onError={(e) => {
        e.currentTarget.src = ROOF_WIZARD_DEFAULT_IMAGE;
      }}
    />
  );
}

function RoofSummaryRow({ label, value, thumbSrc }) {
  return (
    <div className="roof-summary-row">
      <Thumb src={thumbSrc} alt={`${label} illustration`} />
      <div className="roof-summary-text">
        <div className="roof-summary-label">{label}</div>
        <div className="roof-summary-value">{value}</div>
      </div>
    </div>
  );
}


function RoofWizardHeroImage({ stepIndex, draftRoof }) {
  let src = ROOF_WIZARD_DEFAULT_IMAGE;

  // 0 orientation, 1 tilt, 2 shading, 3 panels/size
  if (stepIndex === 0) {
    const key = draftRoof.orientation || "";
    src = ROOF_WIZARD_IMAGES.orientation[key] || ROOF_WIZARD_DEFAULT_IMAGE;
  } else if (stepIndex === 1) {
    const key = String(draftRoof.tilt || "");
    src = ROOF_WIZARD_IMAGES.tilt[key] || ROOF_WIZARD_DEFAULT_IMAGE;
  } else if (stepIndex === 2) {
    const key = draftRoof.shading || "";
    src = ROOF_WIZARD_IMAGES.shading[key] || ROOF_WIZARD_DEFAULT_IMAGE;
  } else if (stepIndex === 3) {
    const key = draftRoof.roofSize || "";
    src = ROOF_WIZARD_IMAGES.panels[key] || ROOF_WIZARD_DEFAULT_IMAGE;
  }

  return (
    <div className="wizard-hero">
      <img
        className="wizard-hero-img"
        src={src}
        alt="Roof selection illustration"
        onError={(e) => {
          e.currentTarget.src = ROOF_WIZARD_DEFAULT_IMAGE;
        }}
      />
    </div>
  );
}

export {
  getRoofThumbsForRoof,
  Thumb,
  RoofSummaryRow,
  RoofWizardHeroImage,
};
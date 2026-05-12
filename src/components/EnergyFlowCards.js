import React from "react";
import CardAlt from "../ui/CardAlt";

function FlowMediaCard({
  title,
  subtitle,
  videoSrc,
  imageSrc,
  imageAlt,
  isPdf,
}) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="text-center text-body font-semibold text-accent">
        {title}
      </div>

      <div className="mt-1 text-center text-small leading-5 text-brand">
        {subtitle}
      </div>

      <div className="mt-4 flex items-center justify-center rounded-xl border-1 border-sky-200 bg-slate-50 p-3">
        {isPdf ? (
          <img
            className="block aspect-square w-full max-w-[260px] object-contain"
            src={imageSrc}
            alt={imageAlt}
          />
        ) : (
          <video
            className="block aspect-square w-full max-w-[260px] object-contain"
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
        )}
      </div>
    </div>
  );
}

export default function EnergyFlowCards({ hasBattery, mode }) {
  const isPdf = mode === "pdf";

  const media = {
    excess: {
      video: hasBattery
        ? "/videos/flows/excess-battery.mov"
        : "/videos/flows/excess-nobattery.mov",
      image: hasBattery
        ? "/images/flows/excess-battery.png"
        : "/images/flows/excess-nobattery.png",
    },
    partial: {
      video: hasBattery
        ? "/videos/flows/partial-battery.mov"
        : "/videos/flows/partial-nobattery.mov",
      image: hasBattery
        ? "/images/flows/partial-battery.png"
        : "/images/flows/partial-nobattery.png",
    },
    night: {
      video: hasBattery
        ? "/videos/flows/night-battery.mov"
        : "/videos/flows/night-nobattery.mov",
      image: hasBattery
        ? "/images/flows/night-battery.png"
        : "/images/flows/night-nobattery.png",
    },
  };

  return (
    <CardAlt mode={mode} title="How Your System Works">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FlowMediaCard
          title="Excess solar"
          subtitle={
            hasBattery
              ? "Home is powered first, then the battery charges. Any remaining solar is exported."
              : "Home is powered first. Any remaining solar is exported to the grid."
          }
          videoSrc={media.excess.video}
          imageSrc={media.excess.image}
          imageAlt="Illustration showing excess solar energy flow"
          isPdf={isPdf}
        />

        <FlowMediaCard
          title="Partial offset"
          subtitle="Solar covers some of your home's demand. The grid or your battery supplies the remainder."
          videoSrc={media.partial.video}
          imageSrc={media.partial.image}
          imageAlt="Illustration showing partial solar energy offset"
          isPdf={isPdf}
        />

        <FlowMediaCard
          title="At night"
          subtitle={
            hasBattery
              ? "The battery supplies the home first. The grid supports if needed."
              : "The grid supplies the home."
          }
          videoSrc={media.night.video}
          imageSrc={media.night.image}
          imageAlt="Illustration showing night-time energy flow"
          isPdf={isPdf}
        />
      </div>

      <p className="mt-4 text-xs text-slate-500 text-center">
        These visuals are illustrative. Your detailed performance numbers are shown in the charts above.
      </p>
    </CardAlt>
  );
}
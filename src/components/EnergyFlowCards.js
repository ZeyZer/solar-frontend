import React from "react";
import CardAlt from "../ui/CardAlt";

function FlowVideoCard({ title, subtitle, src }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="text-center text-body font-semibold text-accent">
        {title}
      </div>

      <div className="mt-1 text-center text-small leading-5 text-brand">
        {subtitle}
      </div>

      <div className="mt-4 flex items-center justify-center rounded-xl border-1 border-sky-200 bg-slate-50 p-3">
        <video
          className="block aspect-square w-full max-w-[260px] object-contain"
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
      </div>
    </div>
  );
}

export default function EnergyFlowCards({ hasBattery, mode }) {
  const videos = {
    excess: hasBattery
      ? "/videos/flows/excess-battery.mov"
      : "/videos/flows/excess-nobattery.mov",
    partial: hasBattery
      ? "/videos/flows/partial-battery.mov"
      : "/videos/flows/partial-nobattery.mov",
    night: hasBattery
      ? "/videos/flows/night-battery.mov"
      : "/videos/flows/night-nobattery.mov",
  };

  return (
    <CardAlt mode={mode} title="How Your System Works">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FlowVideoCard
          title="Excess solar"
          subtitle={
            hasBattery
              ? "Home is powered first, then the battery charges. Any remaining solar is exported."
              : "Home is powered first. Any remaining solar is exported to the grid."
          }
          src={videos.excess}
        />

        <FlowVideoCard
          title="Partial offset"
          subtitle="Solar covers some of your home's demand. The grid or your battery supplies the remainder."
          src={videos.partial}
        />

        <FlowVideoCard
          title="At night"
          subtitle={
            hasBattery
              ? "The battery supplies the home first. The grid supports if needed."
              : "The grid supplies the home."
          }
          src={videos.night}
        />
      </div>

      <p className="mt-4 text-xs text-slate-500 text-center">
        These animations are illustrative. Your detailed performance numbers are shown in the charts above.
      </p>
    </CardAlt>
  );
}
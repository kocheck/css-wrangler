import { StationFrame } from "@/app/components/StationFrame";
import "./important-wars.css";

export default function ImportantWarsStationPage() {
  return (
    <StationFrame
      stationNumber="08"
      stationName="IMPORTANT WARS"
      testsBox="Every rule on this page is `!important`. The extension's edits should still win. If they don't, invariant #2 is broken and so is the whole product. No pressure."
    >
      <section className="hero">
        <h1 className="hero-title">EVERY RULE WEARS A CROWN</h1>
        <p className="hero-body">
          This page declares !important on color, padding, font-size, and background. The extension
          is supposed to override every one of them. Pick anything and edit it.
        </p>
      </section>

      <button type="button" className="cta">
        CLICK ME
      </button>

      <article className="card">
        <h3 className="card-title">Hostile Card</h3>
        <p className="card-body">
          This card&rsquo;s padding, color, and background are pinned with !important. If the
          extension wins, your edit overrides this. If it loses, the page wins and the patch is a
          fiction.
        </p>
      </article>
    </StationFrame>
  );
}

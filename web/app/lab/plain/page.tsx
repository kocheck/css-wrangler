import { StationFrame } from "@/app/components/StationFrame";
import "./plain.css";

export default function PlainStationPage() {
  return (
    <StationFrame
      stationNumber="01"
      stationName="PLAIN CSS"
      testsBox="Baseline. Hand-written classes, no framework. The picker should pick a single readable selector. styling-detect → plain."
    >
      <section className="hero">
        <h1 className="hero__title">Ledger for hand-rolled CSS</h1>
        <p className="hero__lede">
          A modest archive of bespoke stylesheets for teams that distrust frameworks and prefer to
          know exactly which selector did what.
        </p>
      </section>

      <div className="cards">
        <article className="card">
          <h3 className="card__title">Selector Audit</h3>
          <p className="card__body">
            Find every rule that touched an element on the page, in order of specificity, with the
            file and line number for each.
          </p>
          <footer className="card__footer">included in trial</footer>
        </article>

        <article className="card card--featured">
          <h3 className="card__title">Patch Export</h3>
          <p className="card__body">
            Write your edits to a JSON patch your AI agent can apply on the first try. Survives
            reload, deploys with the diff.
          </p>
          <footer className="card__footer">most picked</footer>
        </article>
      </div>

      <div className="footer-row">
        <span className="footer-row__cell">build · 2026</span>
        <span className="footer-row__cell">no telemetry</span>
        <span className="footer-row__cell">single tenant</span>
      </div>
    </StationFrame>
  );
}

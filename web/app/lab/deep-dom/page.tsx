import { StationFrame } from "@/app/components/StationFrame";
import { DeepDomTicker } from "./DeepDomTicker";
import { SubtreeToggle } from "./SubtreeToggle";
import "./deep-dom.css";

export default function DeepDomStationPage() {
  return (
    <StationFrame
      stationNumber="06"
      stationName="DEEP DOM"
      testsBox="Deep DOM + live mutations + fixed-positioned header. The picker must walk ancestors. The observer must re-apply our class without thrashing. Outlines must position correctly over fixed elements."
    >
      <header className="deep-fixed-header">
        <span className="deep-fixed-header__brand">{"Wrangler · Test Surface"}</span>
        <DeepDomTicker />
      </header>
      <div className="deep-spacer" aria-hidden="true" />

      <section className="deep-tree">
        <p className="deep-level-label">Eight-level nesting</p>
        <div className="deep-level-1">
          <p className="deep-level-label">Level 1 · region</p>
          <div className="deep-level-2">
            <p className="deep-level-label">Level 2 · district</p>
            <div className="deep-level-3">
              <p className="deep-level-label">Level 3 · sector</p>
              <div className="deep-level-4">
                <p className="deep-level-label">Level 4 · block</p>
                <div className="deep-level-5">
                  <p className="deep-level-label">Level 5 · zone</p>
                  <div className="deep-level-6">
                    <p className="deep-level-label">Level 6 · cell</p>
                    <div className="deep-level-7">
                      <p className="deep-level-label">Level 7 · node</p>
                      <div className="deep-level-8">
                        <p className="deep-level-label">Level 8 · leaf</p>
                        <span className="deep-leaf-text">node-payload-0x4f7c</span>
                        <br />
                        <span className="deep-leaf-text">checksum verified</span>
                        <br />
                        <button type="button" className="deep-leaf-button">
                          Inspect leaf
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SubtreeToggle />
    </StationFrame>
  );
}

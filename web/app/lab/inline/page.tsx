import { StationFrame } from "@/app/components/StationFrame";

export default function InlineStationPage() {
  return (
    <StationFrame
      stationNumber="05"
      stationName="INLINE STYLES"
      testsBox="No classes. The picker must build a structural selector. Form elements verify non-`<div>` fallback."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
        }}
      >
        <div
          style={{
            background: "#3a4a6b",
            color: "#f0f4ff",
            padding: "20px 18px",
            fontSize: "14px",
            borderRadius: "4px",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: "13px", letterSpacing: "0.04em" }}>
            CHANNEL A
          </span>
        </div>

        <div
          style={{
            background: "#7a3e3e",
            color: "#fff5f0",
            padding: "28px 16px",
            fontSize: "16px",
            borderRadius: "4px",
          }}
        >
          <span style={{ fontWeight: 500, fontSize: "14px" }}>Channel B</span>
        </div>

        <div
          style={{
            background: "#2f5d4c",
            color: "#e8f5ee",
            padding: "16px 22px",
            fontSize: "12px",
            borderRadius: "4px",
          }}
        >
          <span style={{ fontStyle: "italic", fontSize: "13px" }}>Channel C</span>
        </div>

        <div
          style={{
            background: "#6b4a8a",
            color: "#f4ecff",
            padding: "24px 14px",
            fontSize: "15px",
            borderRadius: "4px",
          }}
        >
          <span style={{ textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.06em" }}>
            channel d
          </span>
        </div>

        <div
          style={{
            background: "#8a6a2e",
            color: "#fff8e8",
            padding: "18px 20px",
            fontSize: "13px",
            borderRadius: "4px",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "12px" }}>CHANNEL E</span>
        </div>

        <div
          style={{
            background: "#2e5a8a",
            color: "#eaf2ff",
            padding: "22px 16px",
            fontSize: "14px",
            borderRadius: "4px",
          }}
        >
          <span style={{ fontFamily: "Georgia, serif", fontSize: "15px" }}>Channel F</span>
        </div>
      </div>

      <form
        style={{
          marginTop: "28px",
          padding: "20px",
          background: "#1c1c20",
          border: "1px solid #2a2a2e",
          borderRadius: "4px",
          display: "grid",
          gap: "14px",
        }}
      >
        <label
          style={{
            display: "grid",
            gap: "6px",
            fontFamily: "system-ui, sans-serif",
            fontSize: "12px",
            color: "#a8a8a3",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          username
          <input
            type="text"
            placeholder="username"
            style={{
              padding: "8px 10px",
              fontSize: "13px",
              background: "#0e0e10",
              color: "#fafaf7",
              border: "1px solid #3d3d42",
              borderRadius: "2px",
              fontFamily: "ui-monospace, monospace",
            }}
          />
        </label>

        <label
          style={{
            display: "grid",
            gap: "6px",
            fontFamily: "system-ui, sans-serif",
            fontSize: "12px",
            color: "#a8a8a3",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          environment
          <select
            style={{
              padding: "8px 10px",
              fontSize: "13px",
              background: "#0e0e10",
              color: "#fafaf7",
              border: "1px solid #3d3d42",
              borderRadius: "2px",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            <option value="dev">development</option>
            <option value="staging">staging</option>
            <option value="prod">production</option>
          </select>
        </label>

        <button
          type="submit"
          style={{
            justifySelf: "start",
            padding: "10px 18px",
            fontSize: "12px",
            fontFamily: "ui-monospace, monospace",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: "#ff3d00",
            color: "#0e0e10",
            border: 0,
            borderRadius: "2px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          SUBMIT
        </button>
      </form>
    </StationFrame>
  );
}

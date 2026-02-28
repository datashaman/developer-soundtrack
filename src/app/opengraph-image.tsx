import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Developer Soundtrack — Transform commits into music";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0e",
          fontFamily: "monospace",
        }}
      >
        {/* Waveform decoration */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          {[20, 35, 50, 70, 45, 80, 60, 90, 55, 75, 40, 65, 85, 50, 30, 70, 45, 60, 35, 55].map(
            (h, i) => (
              <div
                key={i}
                style={{
                  width: "8px",
                  height: `${h}px`,
                  borderRadius: "4px",
                  background: `rgba(0, 255, 200, ${0.3 + (h / 90) * 0.7})`,
                }}
              />
            ),
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-2px",
            lineHeight: 1.1,
            textAlign: "center",
            marginBottom: "16px",
          }}
        >
          Developer Soundtrack
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "28px",
            color: "#00ffc8",
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          Listen to your code
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: "20px",
            color: "rgba(255, 255, 255, 0.5)",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.5,
          }}
        >
          Transform GitHub commits into generative music
        </div>

        {/* Language dots */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "40px",
          }}
        >
          {["#3572A5", "#f1e05a", "#3178c6", "#dea584", "#00ADD8", "#b07219", "#555555", "#e34c26"].map(
            (color, i) => (
              <div
                key={i}
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "6px",
                  background: color,
                }}
              />
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}

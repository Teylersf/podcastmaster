import * as React from "react";

interface TrialOfferEmailProps {
  firstName: string;
  trialUrl: string;
}

// Second email that lands ~5 min after signup — the moment we pitch
// the 7-day trial. Copy is intentionally direct about the card
// requirement + cancel-anytime because that's the friction we need
// to disarm before conversion.
export const TrialOfferEmail: React.FC<TrialOfferEmailProps> = ({
  firstName,
  trialUrl,
}) => {
  const greeting = firstName ? `Hey ${firstName},` : "Hey,";
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Try 7 days unlimited — free, cancel anytime</title>
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: "#0d0d0f",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: "#0d0d0f", padding: "40px 20px" }}>
          <tbody>
            <tr>
              <td align="center">
                <table
                  width="100%"
                  cellPadding="0"
                  cellSpacing="0"
                  style={{
                    maxWidth: "560px",
                    backgroundColor: "#18181b",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ padding: "40px 40px 24px 40px", textAlign: "center" }}>
                        <div style={{
                          width: "56px",
                          height: "56px",
                          backgroundColor: "rgba(224, 122, 76, 0.12)",
                          borderRadius: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "20px",
                        }}>
                          <span style={{ fontSize: "28px" }}>👑</span>
                        </div>
                        <h1 style={{
                          color: "#fafafa",
                          fontSize: "24px",
                          fontWeight: 600,
                          margin: "0 0 12px 0",
                          letterSpacing: "-0.02em",
                        }}>
                          7 days unlimited, on the house.
                        </h1>
                        <p style={{
                          color: "#a1a1aa",
                          fontSize: "15px",
                          margin: 0,
                          lineHeight: 1.6,
                        }}>
                          {greeting} you just mastered a file for free. If you liked what you heard, take a full week of unlimited, 24-bit HQ output on us. No charge today. Cancel any time before day 8 and you won&apos;t pay a cent.
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style={{ padding: "0 40px 24px 40px", textAlign: "center" }}>
                        <a
                          href={trialUrl}
                          style={{
                            display: "inline-block",
                            backgroundColor: "#e07a4c",
                            color: "#0d0d0f",
                            fontSize: "15px",
                            fontWeight: 600,
                            padding: "14px 32px",
                            borderRadius: "10px",
                            textDecoration: "none",
                            letterSpacing: "0.01em",
                          }}
                        >
                          Start 7 days free
                        </a>
                        <p style={{
                          color: "#71717a",
                          fontSize: "12px",
                          margin: "12px 0 0 0",
                        }}>
                          Card required · $0 today · $10/mo starts day 8 · cancel anytime
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style={{ padding: "0 40px" }}>
                        <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.08)" }} />
                      </td>
                    </tr>

                    <tr>
                      <td style={{ padding: "24px 40px" }}>
                        <h2 style={{
                          color: "#fafafa",
                          fontSize: "16px",
                          fontWeight: 600,
                          margin: "0 0 16px 0",
                        }}>
                          What you get for a week
                        </h2>
                        <table width="100%" cellPadding="0" cellSpacing="0">
                          <tbody>
                            {[
                              ["⚡", "Master as many files as you want — no daily cap"],
                              ["✨", "24-bit HQ export on every master (Spotify + Apple + YouTube spec)"],
                              ["💾", "5 GB cloud storage — every master saved to your dashboard"],
                              ["🎁", "You keep your 24-hour welcome bonus running in parallel"],
                            ].map(([icon, text], i) => (
                              <tr key={i}>
                                <td style={{ paddingBottom: "12px" }}>
                                  <table cellPadding="0" cellSpacing="0">
                                    <tbody>
                                      <tr>
                                        <td style={{
                                          width: "28px",
                                          fontSize: "18px",
                                          verticalAlign: "top",
                                        }}>{icon}</td>
                                        <td style={{ paddingLeft: "8px" }}>
                                          <p style={{
                                            color: "#fafafa",
                                            fontSize: "14px",
                                            margin: 0,
                                            lineHeight: 1.5,
                                          }}>{text}</p>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    <tr>
                      <td style={{ padding: "0 40px 32px 40px" }}>
                        <div style={{
                          backgroundColor: "rgba(74, 222, 128, 0.06)",
                          border: "1px solid rgba(74, 222, 128, 0.18)",
                          borderRadius: "10px",
                          padding: "14px 18px",
                        }}>
                          <p style={{
                            color: "#a1a1aa",
                            fontSize: "13px",
                            margin: 0,
                            lineHeight: 1.5,
                          }}>
                            <strong style={{ color: "#4ade80" }}>Cancel anytime — even day one.</strong>
                            {" "}Head to your dashboard, click Manage Subscription, cancel. You keep unlimited access until day 7; you won&apos;t be charged.
                          </p>
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td style={{
                        padding: "24px 40px 32px 40px",
                        backgroundColor: "#141416",
                        borderBottomLeftRadius: "16px",
                        borderBottomRightRadius: "16px",
                      }}>
                        <p style={{ color: "#71717a", fontSize: "13px", margin: "0 0 8px 0", textAlign: "center" }}>
                          Not interested? Ignore this — you keep 1 free master/day forever.
                        </p>
                        <p style={{ color: "#71717a", fontSize: "12px", margin: 0, textAlign: "center" }}>
                          <a href="https://freepodcastmastering.com" style={{ color: "#e07a4c", textDecoration: "none" }}>
                            freepodcastmastering.com
                          </a>
                          {" • "}
                          <a href="https://freepodcastmastering.com/terms" style={{ color: "#71717a", textDecoration: "none" }}>
                            Terms
                          </a>
                          {" • "}
                          <a href="https://freepodcastmastering.com/privacy" style={{ color: "#71717a", textDecoration: "none" }}>
                            Privacy
                          </a>
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
};

export default TrialOfferEmail;

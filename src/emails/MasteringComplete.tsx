import * as React from "react";

interface MasteringCompleteEmailProps {
  downloadUrl: string;
}

export const MasteringCompleteEmail: React.FC<MasteringCompleteEmailProps> = ({
  downloadUrl,
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Your Mastered Podcast is Ready!</title>
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: "#0d0d0f",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        <table 
          width="100%" 
          cellPadding="0" 
          cellSpacing="0" 
          style={{ backgroundColor: "#0d0d0f", padding: "40px 20px" }}
        >
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
                    {/* Header */}
                    <tr>
                      <td style={{ padding: "40px 40px 24px 40px", textAlign: "center" }}>
                        <div style={{
                          width: "56px",
                          height: "56px",
                          backgroundColor: "rgba(34, 197, 94, 0.12)",
                          borderRadius: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "20px",
                        }}>
                          <span style={{ fontSize: "28px" }}>✓</span>
                        </div>
                        <h1 style={{
                          color: "#22c55e",
                          fontSize: "24px",
                          fontWeight: 600,
                          margin: "0 0 8px 0",
                          letterSpacing: "-0.02em",
                        }}>
                          Your Podcast is Ready!
                        </h1>
                        <p style={{
                          color: "#a1a1aa",
                          fontSize: "15px",
                          margin: 0,
                          lineHeight: 1.5,
                        }}>
                          Your audio has been professionally mastered and is ready to download.
                        </p>
                      </td>
                    </tr>

                    {/* Download Button */}
                    <tr>
                      <td style={{ padding: "0 40px 32px 40px", textAlign: "center" }}>
                        <a 
                          href={downloadUrl}
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
                          Download Mastered Audio
                        </a>
                      </td>
                    </tr>

                    {/* Warning Banner */}
                    <tr>
                      <td style={{ padding: "0 40px 32px 40px" }}>
                        <div style={{
                          backgroundColor: "rgba(234, 179, 8, 0.08)",
                          border: "1px solid rgba(234, 179, 8, 0.2)",
                          borderRadius: "10px",
                          padding: "16px 20px",
                        }}>
                          <table width="100%" cellPadding="0" cellSpacing="0">
                            <tbody>
                              <tr>
                                <td width="32" style={{ verticalAlign: "top", paddingRight: "12px" }}>
                                  <span style={{ fontSize: "20px" }}>⏰</span>
                                </td>
                                <td>
                                  <p style={{
                                    color: "#eab308",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    margin: "0 0 4px 0",
                                  }}>
                                    Important: Download within 24 hours
                                  </p>
                                  <p style={{
                                    color: "#a1a1aa",
                                    fontSize: "13px",
                                    margin: 0,
                                    lineHeight: 1.5,
                                  }}>
                                    For your privacy, all files are automatically deleted 24 hours after processing. Make sure to download your mastered audio before then!
                                  </p>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>

                    {/* Divider */}
                    <tr>
                      <td style={{ padding: "0 40px" }}>
                        <div style={{ 
                          height: "1px", 
                          backgroundColor: "rgba(255,255,255,0.08)" 
                        }} />
                      </td>
                    </tr>

                    {/* What's Next */}
                    <tr>
                      <td style={{ padding: "24px 40px" }}>
                        <h2 style={{
                          color: "#fafafa",
                          fontSize: "16px",
                          fontWeight: 600,
                          margin: "0 0 16px 0",
                        }}>
                          What&apos;s Next?
                        </h2>
                        <table width="100%" cellPadding="0" cellSpacing="0">
                          <tbody>
                            <tr>
                              <td style={{ paddingBottom: "12px" }}>
                                <table cellPadding="0" cellSpacing="0">
                                  <tbody>
                                    <tr>
                                      <td style={{ 
                                        width: "28px", 
                                        height: "28px", 
                                        backgroundColor: "#1c1c1f",
                                        borderRadius: "6px",
                                        textAlign: "center",
                                        verticalAlign: "middle",
                                        fontSize: "13px",
                                        color: "#e07a4c",
                                        fontWeight: 600,
                                      }}>
                                        1
                                      </td>
                                      <td style={{ paddingLeft: "12px" }}>
                                        <p style={{
                                          color: "#fafafa",
                                          fontSize: "14px",
                                          margin: 0,
                                        }}>
                                          Download your mastered file
                                        </p>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ paddingBottom: "12px" }}>
                                <table cellPadding="0" cellSpacing="0">
                                  <tbody>
                                    <tr>
                                      <td style={{ 
                                        width: "28px", 
                                        height: "28px", 
                                        backgroundColor: "#1c1c1f",
                                        borderRadius: "6px",
                                        textAlign: "center",
                                        verticalAlign: "middle",
                                        fontSize: "13px",
                                        color: "#e07a4c",
                                        fontWeight: 600,
                                      }}>
                                        2
                                      </td>
                                      <td style={{ paddingLeft: "12px" }}>
                                        <p style={{
                                          color: "#fafafa",
                                          fontSize: "14px",
                                          margin: 0,
                                        }}>
                                          Import it into your audio editor
                                        </p>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <table cellPadding="0" cellSpacing="0">
                                  <tbody>
                                    <tr>
                                      <td style={{ 
                                        width: "28px", 
                                        height: "28px", 
                                        backgroundColor: "#1c1c1f",
                                        borderRadius: "6px",
                                        textAlign: "center",
                                        verticalAlign: "middle",
                                        fontSize: "13px",
                                        color: "#e07a4c",
                                        fontWeight: 600,
                                      }}>
                                        3
                                      </td>
                                      <td style={{ paddingLeft: "12px" }}>
                                        <p style={{
                                          color: "#fafafa",
                                          fontSize: "14px",
                                          margin: 0,
                                        }}>
                                          Add your music and effects, then export!
                                        </p>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td style={{ 
                        padding: "24px 40px 32px 40px", 
                        backgroundColor: "#141416",
                        borderBottomLeftRadius: "16px",
                        borderBottomRightRadius: "16px",
                      }}>
                        <p style={{
                          color: "#71717a",
                          fontSize: "13px",
                          margin: "0 0 8px 0",
                          textAlign: "center",
                        }}>
                          Need help? Reply to this email or visit our website.
                        </p>
                        <p style={{
                          color: "#71717a",
                          fontSize: "12px",
                          margin: 0,
                          textAlign: "center",
                        }}>
                          <a 
                            href="https://freepodcastmastering.com" 
                            style={{ color: "#e07a4c", textDecoration: "none" }}
                          >
                            freepodcastmastering.com
                          </a>
                          {" • "}
                          <a 
                            href="https://freepodcastmastering.com/terms" 
                            style={{ color: "#71717a", textDecoration: "none" }}
                          >
                            Terms of Service
                          </a>
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Bottom Text */}
                <p style={{
                  color: "#52525b",
                  fontSize: "12px",
                  marginTop: "24px",
                  textAlign: "center",
                }}>
                  This email was sent by Free Podcast Mastering.
                  <br />
                  Made with ❤️ for podcasters everywhere.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
};

export default MasteringCompleteEmail;


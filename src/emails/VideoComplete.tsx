import * as React from "react";

interface VideoCompleteEmailProps {
  downloadUrl: string;
  videoTitle?: string;
}

export const VideoCompleteEmail: React.FC<VideoCompleteEmailProps> = ({
  downloadUrl,
  videoTitle = "Your Video",
}) => {
  // Add download=1 query param to force download
  const downloadUrlWithParam = downloadUrl.includes("?") 
    ? `${downloadUrl}&download=1` 
    : `${downloadUrl}?download=1`;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Your Video is Ready!</title>
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
                          backgroundColor: "rgba(139, 92, 246, 0.12)",
                          borderRadius: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "20px",
                        }}>
                          <span style={{ fontSize: "28px" }}>🎬</span>
                        </div>
                        <h1 style={{
                          color: "#a78bfa",
                          fontSize: "24px",
                          fontWeight: 600,
                          margin: "0 0 8px 0",
                          letterSpacing: "-0.02em",
                        }}>
                          Your Video is Ready!
                        </h1>
                        <p style={{
                          color: "#a1a1aa",
                          fontSize: "15px",
                          margin: 0,
                          lineHeight: 1.5,
                        }}>
                          Your professional video has been generated and is ready to download.
                        </p>
                      </td>
                    </tr>

                    {/* Video Title */}
                    <tr>
                      <td style={{ padding: "0 40px 24px 40px", textAlign: "center" }}>
                        <p style={{
                          color: "#fafafa",
                          fontSize: "16px",
                          fontWeight: 500,
                          margin: 0,
                          padding: "12px 20px",
                          backgroundColor: "rgba(255,255,255,0.05)",
                          borderRadius: "8px",
                          display: "inline-block",
                        }}>
                          {videoTitle}
                        </p>
                      </td>
                    </tr>

                    {/* Download Button */}
                    <tr>
                      <td style={{ padding: "0 40px 32px 40px", textAlign: "center" }}>
                        <a 
                          href={downloadUrlWithParam}
                          style={{
                            display: "inline-block",
                            backgroundColor: "#8b5cf6",
                            color: "#ffffff",
                            fontSize: "15px",
                            fontWeight: 600,
                            padding: "14px 32px",
                            borderRadius: "10px",
                            textDecoration: "none",
                            letterSpacing: "0.01em",
                          }}
                        >
                          Download Video (MP4)
                        </a>
                      </td>
                    </tr>

                    {/* Mobile Tip */}
                    <tr>
                      <td style={{ padding: "0 40px 24px 40px" }}>
                        <div style={{
                          backgroundColor: "rgba(34, 197, 94, 0.08)",
                          border: "1px solid rgba(34, 197, 94, 0.2)",
                          borderRadius: "10px",
                          padding: "16px 20px",
                        }}>
                          <table width="100%" cellPadding="0" cellSpacing="0">
                            <tbody>
                              <tr>
                                <td width="32" style={{ verticalAlign: "top", paddingRight: "12px" }}>
                                  <span style={{ fontSize: "20px" }}>📱</span>
                                </td>
                                <td>
                                  <p style={{
                                    color: "#22c55e",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    margin: "0 0 4px 0",
                                  }}>
                                    On mobile? Save to your camera roll
                                  </p>
                                  <p style={{
                                    color: "#a1a1aa",
                                    fontSize: "13px",
                                    margin: 0,
                                    lineHeight: 1.5,
                                  }}>
                                    Tap the download button above, then tap the video and select &quot;Save to Photos&quot; or &quot;Download&quot; depending on your device.
                                  </p>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
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
                                    For your privacy, all files are automatically deleted 24 hours after processing. Make sure to download your video before then!
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
                                        color: "#8b5cf6",
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
                                          Download your video
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
                                        color: "#8b5cf6",
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
                                          Upload to YouTube, TikTok, or Instagram
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
                                        color: "#8b5cf6",
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
                                          Share your content with the world!
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
                            style={{ color: "#8b5cf6", textDecoration: "none" }}
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

export default VideoCompleteEmail;

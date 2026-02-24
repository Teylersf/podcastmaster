import * as React from "react";

interface AdminJobStartedEmailProps {
  jobId: string;
  fileName: string;
  fileSize: string;
  downloadUrl: string;
  templateName: string;
  outputQuality: string;
  limiterMode: string;
}

export const AdminJobStartedEmail: React.FC<AdminJobStartedEmailProps> = ({
  jobId,
  fileName,
  fileSize,
  downloadUrl,
  templateName,
  outputQuality,
  limiterMode,
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>New Mastering Job Started</title>
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
                      <td style={{ padding: "32px 32px 20px 32px" }}>
                        <h1 style={{
                          color: "#e07a4c",
                          fontSize: "20px",
                          fontWeight: 600,
                          margin: "0 0 8px 0",
                        }}>
                          🎙️ New Mastering Job Started
                        </h1>
                        <p style={{
                          color: "#a1a1aa",
                          fontSize: "14px",
                          margin: 0,
                        }}>
                          Someone just submitted a file for mastering.
                        </p>
                      </td>
                    </tr>

                    {/* Job Details */}
                    <tr>
                      <td style={{ padding: "0 32px 24px 32px" }}>
                        <table 
                          width="100%" 
                          cellPadding="0" 
                          cellSpacing="0"
                          style={{
                            backgroundColor: "#1c1c1f",
                            borderRadius: "10px",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <tbody>
                            <tr>
                              <td style={{ padding: "16px" }}>
                                <table width="100%" cellPadding="0" cellSpacing="0">
                                  <tbody>
                                    <tr>
                                      <td style={{ paddingBottom: "12px" }}>
                                        <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                          File Name
                                        </p>
                                        <p style={{ color: "#fafafa", fontSize: "14px", margin: 0, fontWeight: 500 }}>
                                          {fileName}
                                        </p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style={{ paddingBottom: "12px" }}>
                                        <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                          File Size
                                        </p>
                                        <p style={{ color: "#fafafa", fontSize: "14px", margin: 0 }}>
                                          {fileSize}
                                        </p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style={{ paddingBottom: "12px" }}>
                                        <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                          Template
                                        </p>
                                        <p style={{ color: "#fafafa", fontSize: "14px", margin: 0 }}>
                                          {templateName}
                                        </p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style={{ paddingBottom: "12px" }}>
                                        <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                          Settings
                                        </p>
                                        <p style={{ color: "#fafafa", fontSize: "14px", margin: 0 }}>
                                          {outputQuality} quality • {limiterMode} limiter
                                        </p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                          Job ID
                                        </p>
                                        <p style={{ color: "#71717a", fontSize: "12px", margin: 0, fontFamily: "monospace" }}>
                                          {jobId}
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

                    {/* File Info */}
                    <tr>
                      <td style={{ padding: "0 32px 24px 32px" }}>
                        <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Storage Reference
                        </p>
                        <p style={{
                          color: "#a1a1aa",
                          fontSize: "13px",
                          margin: 0,
                          fontFamily: "monospace",
                        }}>
                          {downloadUrl}
                        </p>
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td style={{ 
                        padding: "16px 32px", 
                        backgroundColor: "#141416",
                        borderBottomLeftRadius: "16px",
                        borderBottomRightRadius: "16px",
                      }}>
                        <p style={{
                          color: "#52525b",
                          fontSize: "12px",
                          margin: 0,
                          textAlign: "center",
                        }}>
                          Free Podcast Mastering Admin Notification
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

export default AdminJobStartedEmail;


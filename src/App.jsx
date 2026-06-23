import { useState } from "react";
import "./App.css";
import {
  getGeminiReply,
  generateProposalWithGemini,
  generateLocalProposal,
  getValidatedConversation,
} from "./geminiService";
import { saveProposalSession } from "./supabaseClient";
import { COMPANY_DETAILS } from "./proposalConfig";

const MESSAGE_DELAY_MS = 600;
const MIN_LOADING_TIME_MS = 800;
const AI_TIMEOUT_MS = 5000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("AI took too long. Local fallback used.")),
        ms
      )
    ),
  ]);
}

function App() {
  const initialMessage =
    "👋 Hi! I am the Atoms Digital Solutions Proposal Assistant.\n\n🤖 I can help you create professional digital marketing proposals.\n\nPlease enter details in this format:\nType | Client Name, City | Package | Platforms | Add-ons | Pricing";

  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: initialMessage,
    },
  ]);

  const [input, setInput] = useState("");
  const [proposal, setProposal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  function getFallbackReply() {
    return "I am the Atoms Digital Solutions Proposal Assistant. Please share proposal details in this format:\nHospital/Doctor/Solar | Client name, City | Package details | Platforms | Add-ons | Pricing";
  }

  function getClientInfo(currentMessages) {
    try {
      const validatedConversation = getValidatedConversation(currentMessages);
      const acceptedAnswers = validatedConversation.acceptedAnswers || [];

      const clientType =
        acceptedAnswers.find((item) => item.key === "clientTypeText")?.value ||
        "";

      const clientDetails =
        acceptedAnswers.find((item) => item.key === "clientDetailsText")
          ?.value || "";

      const clientName =
        clientDetails.split(",")[0]?.trim() || clientDetails || "Client";

      return {
        clientType,
        clientName,
      };
    } catch (error) {
      console.error(error);

      const userMessages = currentMessages.filter(
        (message) => message.sender === "user"
      );

      const clientType = userMessages[0]?.text || "";
      const clientDetails = userMessages[1]?.text || "";
      const clientName = clientDetails.split(",")[0]?.trim() || "Client";

      return {
        clientType,
        clientName,
      };
    }
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createPrintableDocument() {
    if (!proposal.trim()) {
      alert("Please generate the proposal preview first.");
      return;
    }

    const printableWindow = window.open("", "_blank");

    if (!printableWindow) {
      alert("Popup blocked. Please allow popups for this site.");
      return;
    }

    const safeProposal = escapeHtml(proposal);
    const logoUrl = `${window.location.origin}/atoms-logo.jpg`;

    const generatedDateTime = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const companyEmail = COMPANY_DETAILS.email;
    const companyPhone = COMPANY_DETAILS.phone;
    const companyAddress = COMPANY_DETAILS.address;
    const companyName = COMPANY_DETAILS.shortName;

    printableWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${companyName} Proposal</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              background: white;
              margin: 0;
              padding: 30px;
              color: #111827;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .pdf-footer {
              display: none;
            }

            .document {
              max-width: 850px;
              margin: auto;
              background: white;
              padding: 40px;
              position: relative;
              z-index: 1;
            }

            .content {
              position: relative;
              z-index: 2;
            }

            .top-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 14px;
              margin-bottom: 20px;
              border-bottom: 2px solid #0f3d75;
              padding-bottom: 15px;
            }

            .brand-block {
              display: flex;
              align-items: center;
              gap: 14px;
            }

            .print-logo {
              width: 110px;
              height: auto;
              object-fit: contain;
            }

            .brand-title {
              margin: 0;
              color: #0f3d75;
              font-size: 20px;
              font-weight: 800;
            }

            .brand-subtitle {
              margin: 4px 0 0;
              color: #475569;
              font-size: 12px;
            }

            .generated-time {
              color: #475569;
              font-size: 12px;
              font-weight: 600;
              text-align: right;
              white-space: nowrap;
            }

            .print-button {
              background: #0f3d75;
              color: white;
              border: none;
              padding: 10px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
              white-space: nowrap;
            }

            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-size: 14px;
              line-height: 1.6;
              font-family: Arial, sans-serif;
              margin: 0;
              position: relative;
              z-index: 2;
            }

            .contact-footer {
              margin-top: 36px;
              padding: 18px 20px;
              border-top: 2px solid #0f3d75;
              background: rgba(232, 241, 255, 0.85);
              border-radius: 10px;
              position: relative;
              z-index: 2;
            }

            .contact-footer h3 {
              margin: 0 0 10px;
              color: #0f3d75;
              font-size: 18px;
            }

            .contact-footer p {
              margin: 6px 0;
              font-size: 13px;
              line-height: 1.5;
              color: #111827;
            }

            @media print {
              body {
                background: white;
                padding: 0;
              }

              .document {
                padding: 24px;
              }

              .print-button {
                display: none;
              }

              .pdf-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: fixed;
                bottom: 6mm;
                left: 14mm;
                right: 14mm;
                color: #475569;
                font-size: 11px;
                border-top: 1px solid #cbd5e1;
                padding-top: 6px;
                z-index: 999;
              }

              .page-number::after {
                content: "Page " counter(page);
              }

              @page {
                margin: 14mm;
              }
            }
          </style>
        </head>

        <body>
          <div class="pdf-footer">
            <span>Generated on: ${generatedDateTime}</span>
            <span class="page-number"></span>
          </div>

          <div class="document">
            <div class="content">
              <div class="top-bar">
                <div class="brand-block">
                  <img 
                    src="${logoUrl}" 
                    class="print-logo" 
                    alt="${companyName} Logo" 
                  />
                  <div>
                    <h1 class="brand-title">${companyName}</h1>
                    <p class="brand-subtitle">Digital Marketing Proposal</p>
                  </div>
                </div>

                <div class="generated-time">
                  Generated on: ${generatedDateTime}
                </div>

                <button class="print-button" onclick="window.print()">
                  Print / Save as PDF
                </button>
              </div>

              <pre>${safeProposal}</pre>

              <div class="contact-footer">
                <h3>Contact Details</h3>
                <p><strong>Email:</strong> ${companyEmail}</p>
                <p><strong>Phone:</strong> ${companyPhone}</p>
                <p><strong>Address:</strong> ${companyAddress}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printableWindow.document.close();
  }

  async function handleSend() {
    if (!input.trim()) return;

    const userText = input.trim();

    const userMessage = {
      sender: "user",
      text: userText,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setSaveStatus("");
    setIsLoading(true);

    try {
      const aiReply = await getGeminiReply(userText, updatedMessages);

      await wait(MESSAGE_DELAY_MS);

      const aiMessage = {
        sender: "ai",
        text: aiReply || getFallbackReply(),
      };

      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error(error);

      await wait(MESSAGE_DELAY_MS);

      const fallbackMessage = {
        sender: "ai",
        text: getFallbackReply(),
      };

      setMessages((prevMessages) => [...prevMessages, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  async function generateProposalPreview() {
    const loadingStartTime = Date.now();

    setIsGeneratingProposal(true);
    setSaveStatus("");

    try {
      const validatedConversation = getValidatedConversation(messages);

      if (!validatedConversation.isComplete) {
        const aiReply = await getGeminiReply("", messages);

        await wait(MESSAGE_DELAY_MS);

        const aiMessage = {
          sender: "ai",
          text:
            aiReply ||
            "Please complete all required details correctly before generating the proposal.",
        };

        setMessages((prevMessages) => [...prevMessages, aiMessage]);
        setSaveStatus(
          "Please complete the conversation correctly before generating proposal."
        );
        return;
      }

      setSaveStatus("Generating proposal...");

      let proposalText = "";

      try {
        proposalText = await withTimeout(
          generateProposalWithGemini(messages),
          AI_TIMEOUT_MS
        );
      } catch (error) {
        console.error("Gemini proposal generation failed. Local fallback used.");
        console.error(error);
        proposalText = generateLocalProposal(messages);
      }

      setProposal(proposalText);

      try {
        setSaveStatus("Saving session to Supabase...");

        const clientInfo = getClientInfo(messages);

        await saveProposalSession({
          clientName: clientInfo.clientName,
          clientType: clientInfo.clientType,
          conversation: messages,
          proposal: proposalText,
        });

        setSaveStatus("Proposal generated and session saved to Supabase ✅");
      } catch (saveError) {
        console.error("Supabase save failed:", saveError);
        setSaveStatus("Proposal generated successfully ✅");
      }
    } catch (error) {
      console.error(error);
      setSaveStatus(`Proposal generation failed: ${error.message}`);
    } finally {
      const elapsedTime = Date.now() - loadingStartTime;
      const remainingTime = MIN_LOADING_TIME_MS - elapsedTime;

      if (remainingTime > 0) {
        await wait(remainingTime);
      }

      setIsGeneratingProposal(false);
    }
  }

  function resetApp() {
    setMessages([
      {
        sender: "ai",
        text: initialMessage,
      },
    ]);
    setInput("");
    setProposal("");
    setSaveStatus("");
  }

  return (
    <div className="app">
      <div className="curve-highlight"></div>

      <header className="header">
        <img
          src="/atoms-logo.jpg"
          alt="Atoms Digital Solutions Logo"
          className="header-logo"
        />

        <div className="header-content">
          <h1>Atoms Proposal Generator Agent</h1>
          <p>Smart Proposal Builder for Digital Marketing Services</p>
        </div>
      </header>

      {isGeneratingProposal && (
        <div className="loading-overlay">
          <div className="loading-card">
            <img
              src="/atoms-logo.jpg"
              alt="Atoms Digital Solutions"
              className="loading-logo"
            />

            <div className="loading-spinner"></div>

            <h2>Generating Proposal...</h2>
            <p>
              Please wait. AI is preparing content blocks and our system is
              building the final proposal automatically.
            </p>

            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      <main className="main">
        <section className="chat-section">
          <h2>Conversation</h2>

          <div className="chat-box">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.sender === "user" ? "user-message" : "ai-message"
                }
              >
                <strong>{message.sender === "user" ? "👤 You" : "🤖 AI"}:</strong>{" "}
                <span className="message-text">{message.text}</span>
              </div>
            ))}

            {isLoading && (
              <div className="ai-message loading-message">
                <strong>🤖 AI:</strong>{" "}
                <span>Checking details</span> ✨
                <span className="typing-loader">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            )}
          </div>

          <div className="input-row">
            <input
              type="text"
              placeholder="Type details: Type | Name, City | Package | Platforms | Add-ons | Pricing"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}
              disabled={isLoading}
            />

            <button onClick={handleSend} disabled={isLoading}>
              {isLoading ? "Sending..." : "Send"}
            </button>
          </div>

          <button
            className="generate-button"
            onClick={generateProposalPreview}
            disabled={isGeneratingProposal}
          >
            {isGeneratingProposal
              ? "Generating Proposal..."
              : "Generate Proposal Preview"}
          </button>

          <button className="generate-button" onClick={createPrintableDocument}>
            Download / Print Proposal
          </button>

          <button className="generate-button reset-button" onClick={resetApp}>
            Start New Proposal
          </button>

          {saveStatus && <p className="empty-text">{saveStatus}</p>}
        </section>

        <section className="proposal-section">
          <h2>Proposal Preview</h2>

          <div className="proposal-box">
            {proposal ? (
              <pre>{proposal}</pre>
            ) : (
              <p className="empty-text">Proposal preview will appear here.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;

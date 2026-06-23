import { useState } from "react";
import "./App.css";
import {
  getGeminiReply,
  generateProposalWithGemini,
  generateLocalProposal,
  getConversationClientInfo,
} from "./geminiService";
import { saveProposalSession } from "./supabaseClient";
import { COMPANY_DETAILS } from "./proposalConfig";

const MESSAGE_DELAY_MS = 400;
const MIN_LOADING_TIME_MS = 900;
const AI_TIMEOUT_MS = 30000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("AI took too long. Please try again.")),
        ms
      )
    ),
  ]);
}

function App() {
 const initialMessage =
  "Hi! I am the Proposal Generator Agent. I will help you collect client details and generate a proposal.\n\nPlease share the client's name, type (Hospital, Doctor, Solar, or Other Business), city, and what services they need — you can tell me everything at once or I'll guide you step by step.";

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

    printableWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Atoms Digital Solutions Proposal</title>
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
            }

            .contact-footer {
              margin-top: 36px;
              padding: 18px 20px;
              border-top: 2px solid #0f3d75;
              background: rgba(232, 241, 255, 0.85);
              border-radius: 10px;
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
            <div class="top-bar">
              <div class="brand-block">
                <img 
                  src="${logoUrl}" 
                  class="print-logo" 
                  alt="Atoms Digital Solutions Logo" 
                />
                <div>
                  <h1 class="brand-title">${COMPANY_DETAILS.shortName}</h1>
                  <p class="brand-subtitle">AI Generated Digital Marketing Proposal</p>
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
              <p><strong>Email:</strong> ${COMPANY_DETAILS.email}</p>
              <p><strong>Phone:</strong> ${COMPANY_DETAILS.phone}</p>
              <p><strong>Address:</strong> ${COMPANY_DETAILS.address}</p>
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
        text:
          aiReply ||
          "Gemini AI did not return a reply. Please try again or check the API key.",
      };

      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error(error);

      await wait(MESSAGE_DELAY_MS);

      const fallbackMessage = {
        sender: "ai",
        text: `Gemini AI error: ${error.message}`,
      };

      setMessages((prevMessages) => [...prevMessages, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  async function generateProposalPreview() {
    const userMessages = messages.filter((message) => message.sender === "user");

    if (userMessages.length === 0) {
      setSaveStatus("Please chat with the AI and share proposal details first.");
      return;
    }

    const loadingStartTime = Date.now();

    setIsGeneratingProposal(true);
    setSaveStatus("Gemini AI is generating the full proposal...");

    try {
      let proposalText = "";

      try {
        proposalText = await withTimeout(
          generateProposalWithGemini(messages),
          AI_TIMEOUT_MS
        );
      } catch (error) {
        console.error("Gemini proposal generation failed:", error);
        proposalText = generateLocalProposal(messages);
      }

      setProposal(proposalText);

      try {
        setSaveStatus("Saving AI proposal session to Supabase...");

        const clientInfo = getConversationClientInfo(messages);

        await saveProposalSession({
          clientName: clientInfo.clientName,
          clientType: clientInfo.clientType,
          conversation: messages,
          proposal: proposalText,
        });

        setSaveStatus("AI proposal generated and session saved to Supabase ✅");
      } catch (saveError) {
        console.error("Supabase save failed:", saveError);
        setSaveStatus("AI proposal generated successfully ✅");
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
          <h1>Atoms AI Proposal Assistant</h1>
          <p>Full Gemini AI Chatbot for Digital Marketing Proposals</p>
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

            <h2>Gemini AI Generating...</h2>
            <p>
              Please wait. Gemini AI is reading the conversation and preparing
              a complete proposal using Atoms reference proposal style.
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
          <div className="section-title-row">
            <h2>AI Conversation</h2>
            <button className="new-button" onClick={resetApp}>
              New
            </button>
          </div>

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
                <strong>🤖 AI:</strong> <span>Thinking</span> ✨
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
              placeholder="Enter client details here..."
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
              {isLoading ? "Thinking..." : "Send"}
            </button>
          </div>

          <button
            className="generate-button"
            onClick={generateProposalPreview}
            disabled={isGeneratingProposal}
          >
            {isGeneratingProposal
              ? "Generating AI Proposal..."
              : "Generate AI Proposal Preview"}
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
              <p className="empty-text">
                Gemini AI proposal preview will appear here.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;

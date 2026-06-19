import { useState } from "react";
import "./App.css";
import {
  getGeminiReply,
  generateProposalWithGemini,
  generateLocalProposal,
  getValidatedConversation,
} from "./geminiService";
import { saveProposalSession } from "./supabaseClient";

function App() {
  const initialMessage =
    "Hi! I am the Atoms Proposal Generator Agent. You can enter all details in one message or step by step. Example: Hospital | Blossoms Children Hospital, Guntur | Blossoms package - 12 reels, 4 posters | Instagram, Facebook, YouTube, GMB | Meta Ads only | ₹40,000 service fee, ₹10,000 ad budget separate";

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
    return "Please provide proposal details in this format: Hospital/Doctor/Solar | Client name, City | Package details | Platforms | Add-ons | Pricing";
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

    printableWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Atoms Digital Solutions Proposal</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #f4f7fb;
              margin: 0;
              padding: 30px;
              color: #111827;
            }

            .document {
              max-width: 850px;
              margin: auto;
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
              position: relative;
              overflow: hidden;
            }

            .document::before {
              content: "";
              position: absolute;
              inset: 0;
              background-image:
                linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)),
                url("${logoUrl}");
              background-repeat: no-repeat;
              background-position: center;
              background-size: 420px;
              opacity: 0.22;
              pointer-events: none;
            }

            .content {
              position: relative;
              z-index: 1;
            }

            .top-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #0f3d75;
              padding-bottom: 15px;
            }

            .print-logo {
              width: 120px;
              height: auto;
              object-fit: contain;
            }

            .print-button {
              background: #0f3d75;
              color: white;
              border: none;
              padding: 10px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
            }

            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-size: 14px;
              line-height: 1.6;
              font-family: Arial, sans-serif;
            }

            @media print {
              body {
                background: white;
                padding: 0;
              }

              .document {
                box-shadow: none;
                border-radius: 0;
                padding: 20px;
              }

              .print-button {
                display: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="document">
            <div class="content">
              <div class="top-bar">
                <img 
                  src="${logoUrl}" 
                  class="print-logo" 
                  alt="Atoms Digital Solutions Logo" 
                />
                <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
              </div>

              <pre>${safeProposal}</pre>
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

      const aiMessage = {
        sender: "ai",
        text: aiReply,
      };

      setMessages([...updatedMessages, aiMessage]);
    } catch (error) {
      console.error(error);

      const fallbackMessage = {
        sender: "ai",
        text: getFallbackReply(),
      };

      setMessages([...updatedMessages, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  async function generateProposalPreview() {
    setIsGeneratingProposal(true);
    setSaveStatus("");

    try {
      const validatedConversation = getValidatedConversation(messages);

      if (!validatedConversation.isComplete) {
        const aiReply = await getGeminiReply("", messages);

        const aiMessage = {
          sender: "ai",
          text: aiReply,
        };

        setMessages([...messages, aiMessage]);
        setSaveStatus("Please complete the missing details first.");
        return;
      }

      setSaveStatus("Generating proposal...");

      let proposalText = "";

      try {
        proposalText = await generateProposalWithGemini(messages);
      } catch (error) {
        console.error("Gemini proposal generation failed. Local fallback used.");
        console.error(error);
        proposalText = generateLocalProposal(messages);
      }

      setProposal(proposalText);
      setSaveStatus("Saving session to Supabase...");

      const clientInfo = getClientInfo(messages);

      await saveProposalSession({
        clientName: clientInfo.clientName,
        clientType: clientInfo.clientType,
        conversation: messages,
        proposal: proposalText,
      });

      setSaveStatus("Proposal generated and session saved to Supabase ✅");
    } catch (error) {
      console.error(error);
      setSaveStatus(`Proposal generation failed: ${error.message}`);
    } finally {
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
          <p>
            AI-assisted proposal creation with fixed logic and smart content
            generation
          </p>
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
        Please wait. AI is preparing content blocks and our system is building
        the final proposal automatically.
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
                <strong>{message.sender === "user" ? "You" : "AI"}:</strong>{" "}
                <span className="message-text">{message.text}</span>
              </div>
            ))}

            {isLoading && (
              <div className="ai-message">
                <strong>AI:</strong> Thinking...
              </div>
            )}
          </div>

          <div className="input-row">
            <input
              type="text"
              placeholder="Example: Hospital | Blossoms Children Hospital, Guntur | Blossoms package - 12 reels, 4 posters | Instagram, Facebook, YouTube, GMB | Meta Ads only | ₹40,000 service fee"
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

          <button
            className="generate-button"
            onClick={createPrintableDocument}
          >
            Create Printable Document
          </button>

          <button className="generate-button reset-button" onClick={resetApp}>
            Reset Test
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
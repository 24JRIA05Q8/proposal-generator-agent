import { useState } from "react";
import "./App.css";
import {
  getGeminiReply,
  generateProposalWithGemini,
  generateLocalProposal,
} from "./geminiService";
import { saveProposalSession } from "./supabaseClient";

function App() {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hi! I am the Proposal Generator Agent. Is this proposal for a hospital or a doctor?",
    },
  ]);

  const [input, setInput] = useState("");
  const [proposal, setProposal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  function isFinalConfirmationMessage(text) {
    const lowerText = text.toLowerCase();

    return (
      lowerText.includes("all information is correct") ||
      lowerText.includes("all details are correct") ||
      lowerText.includes("yes, correct") ||
      lowerText === "yes"
    );
  }

  function getFallbackReply(currentMessages) {
    const userMessages = currentMessages.filter(
      (message) => message.sender === "user"
    );

    const firstAnswer = userMessages[0]?.text.toLowerCase() || "";
    const userMessageCount = userMessages.length;

    if (userMessageCount === 1) {
      if (firstAnswer.includes("doctor")) {
        return "Great! What is the doctor's name, speciality, and city?";
      }

      return "Great! What is the name of the hospital and in which city is it located?";
    }

    if (userMessageCount === 2) {
      return "Thank you! What base package are we proposing for this client?";
    }

    if (userMessageCount === 3) {
      return "Understood. Which platforms should be included? Options are Instagram, Facebook, YouTube, and Google My Business.";
    }

    if (userMessageCount === 4) {
      return "Do you need any add-on services? You can mention Meta Ads Management, Google Ads Management, Basic SEO, Advanced SEO, Lead Generation, or Conversion Support.";
    }

    if (userMessageCount === 5) {
      return "What is the final agreed pricing for all selected services?";
    }

    if (userMessageCount === 6) {
      return "Please confirm if all collected details are correct and complete.";
    }

    return "All details are collected and confirmed. Please click the Generate Proposal Preview button to create the final proposal.";
  }

  function getClientInfo(currentMessages) {
    const userMessages = currentMessages.filter(
      (message) => message.sender === "user"
    );

    const clientType = userMessages[0]?.text || "";
    const clientDetails = userMessages[1]?.text || "";
    const clientName = clientDetails.split(",")[0]?.trim() || clientDetails;

    return {
      clientType,
      clientName,
    };
  }

  function escapeHtml(text) {
    return text
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
    const logoUrl = `${window.location.origin}/atoms-logo.png`;

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
              width: 190px;
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
            <div class="top-bar">
              <img 
              src="${logoUrl}" 
              class="print-logo" 
              alt="Atoms Digital Solutions Logo" />
              <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
            </div>

            <pre>${safeProposal}</pre>
          </div>
          <div class="brand-text">atoms Digital Solutions</div>
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

    if (isFinalConfirmationMessage(userText)) {
      const finalMessage = {
        sender: "ai",
        text: "All details are collected and confirmed. Please click the Generate Proposal Preview button to create the final proposal.",
      };

      setMessages([...updatedMessages, finalMessage]);
      return;
    }

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
        text: getFallbackReply(updatedMessages),
      };

      setMessages([...updatedMessages, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  async function generateProposalPreview() {
    setIsGeneratingProposal(true);
    setSaveStatus("Generating proposal...");

    try {
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
      setSaveStatus(
        `Proposal generated, but Supabase save failed: ${error.message}`
      );
    } finally {
      setIsGeneratingProposal(false);
    }
  }

  function resetApp() {
    setMessages([
      {
        sender: "ai",
        text: "Hi! I am the Proposal Generator Agent. Is this proposal for a hospital or a doctor?",
      },
    ]);
    setInput("");
    setProposal("");
    setSaveStatus("");
  }

  return (
    <div className="app">
      <header className="header">
  <div className="text-logo">atoms Digital Solutions</div>
  <h1>Proposal Generator Agent</h1>
  <p>AI-powered proposal assistant for Atoms Digital Solutions</p>
</header>
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
                {message.text}
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

          <button className="generate-button" onClick={resetApp}>
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
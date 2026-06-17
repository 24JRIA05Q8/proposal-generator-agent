import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey,
    })
  : null;

const modelName = "gemini-2.5-flash-lite";

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini request timed out")), ms)
    ),
  ]);
}

function cleanMessages(messages) {
  return messages.filter(
    (message) =>
      !message.text.includes("Gemini API Error") &&
      !message.text.includes("Sorry, Gemini API connection failed") &&
      !message.text.includes("Gemini is currently busy")
  );
}

export async function getGeminiReply(userInput, messages) {
  if (!apiKey || !ai) {
    throw new Error("Gemini API key is missing.");
  }

  const filteredMessages = cleanMessages(messages);

  const conversationHistory = filteredMessages
    .map(
      (message) =>
        `${message.sender === "user" ? "User" : "AI"}: ${message.text}`
    )
    .join("\n");

  const collectionPrompt = `
You are an AI Proposal Generator Agent for Atoms Digital Solutions.

Your job is only to collect client proposal details step by step.
Do not generate the final proposal inside chat.
Ask only one question at a time.

Collect details in this order:
1. Client type: Hospital or Doctor
2. Client name and city
3. Base package
4. Selected platforms
5. Add-on services
6. Final agreed pricing
7. Final confirmation

After final confirmation, reply exactly:
"All details are collected and confirmed. Please click the Generate Proposal Preview button to create the final proposal."

Conversation:
${conversationHistory}

Latest user message:
${userInput}

Give only the next suitable response in 1 or 2 short lines.
`;

  const response = await withTimeout(
    ai.models.generateContent({
      model: modelName,
      contents: collectionPrompt,
    }),
    10000
  );

  return response.text;
}

export async function generateProposalWithGemini(messages) {
  if (!apiKey || !ai) {
    throw new Error("Gemini API key is missing.");
  }

  const filteredMessages = cleanMessages(messages);

  const conversationHistory = filteredMessages
    .map(
      (message) =>
        `${message.sender === "user" ? "User" : "AI"}: ${message.text}`
    )
    .join("\n");

  const proposalPrompt = `
You are a professional business proposal writer for Atoms Digital Solutions.

Generate a complete proposal using only the collected conversation details.

Rules:
1. Do not invent pricing.
2. Use only selected services.
3. If YouTube is not selected, do not include YouTube.
4. If no social media package is selected, do not include reels, posters, shoots, or content strategy.
5. Lead Generation means Meta Instant Form campaigns for direct patient leads.
6. Conversion Support means telecalling, follow-ups, and appointment coordination.
7. Keep proposal professional and clear.

Conversation:
${conversationHistory}

Generate proposal with these sections:

ATOMS DIGITAL SOLUTIONS PRIVATE LIMITED

Digital Marketing Proposal

1. Proposal Title
2. Client Overview
3. Objectives
4. Recommended Package
5. Selected Platforms
6. Add-on Services
7. Monthly Deliverables
8. Pricing
9. Expected Benefits
10. Important Notes
11. Next Steps
12. Conclusion
`;

  const response = await withTimeout(
    ai.models.generateContent({
      model: modelName,
      contents: proposalPrompt,
    }),
    15000
  );

  return response.text;
}

function extractAmount(text, keyword) {
  const regex = new RegExp(`${keyword}[^₹]*₹\\s*([0-9,]+)`, "i");
  const match = text.match(regex);
  return match ? `₹${match[1]}` : "";
}

function extractTotal(text) {
  const match = text.match(/total[^₹]*₹\s*([0-9,]+)/i);
  return match ? `₹${match[1]} per month` : text;
}

function extractCount(text, word) {
  const regex = new RegExp(`(\\d+)\\s*${word}`, "i");
  const match = text.match(regex);
  return match ? match[1] : "";
}

export function generateLocalProposal(messages) {
  const filteredMessages = cleanMessages(messages);
  const userMessages = filteredMessages
    .filter((message) => message.sender === "user")
    .map((message) => message.text);

  const clientType = userMessages[0] || "Client";
  const clientDetails = userMessages[1] || "Client Name, City";
  const basePackage = userMessages[2] || "Selected Package";
  const platforms = userMessages[3] || "Selected Platforms";
  const addOns = userMessages[4] || "Selected Add-ons";
  const pricing = userMessages[5] || "Final Pricing";

  const clientParts = clientDetails.split(",");
  const clientName = clientParts[0]?.trim() || clientDetails;
  const city = clientParts[1]?.trim() || "";

  const reels = extractCount(basePackage, "reels");
  const posters = extractCount(basePackage, "posters");
  const shoots = extractCount(basePackage, "shoots?");

  const totalPrice = extractTotal(pricing);
  const basePrice = extractAmount(pricing, "Base package");
  const metaAdsPrice = extractAmount(pricing, "Meta Ads Management");
  const basicSeoPrice = extractAmount(pricing, "Basic SEO");

  const hasNoSocialPackage =
    basePackage.toLowerCase().includes("no base") ||
    basePackage.toLowerCase().includes("lead generation only");

  const hasYouTube = platforms.toLowerCase().includes("youtube");

  let monthlyDeliverables = "";

  if (hasNoSocialPackage) {
    monthlyDeliverables = `
- Lead Generation campaign planning and execution.
- Meta Instant Form campaigns for direct patient lead capture.
- Lead tracking and performance monitoring.
- Conversion Support through telecalling, follow-ups, and appointment coordination.`;
  } else {
    monthlyDeliverables = `
- ${reels || "Selected number of"} reels per month.
- ${posters || "Selected number of"} posters per month.
- ${shoots || "Selected number of"} content shoots per month.
- Content planning and posting for selected platforms.
- Monthly performance review based on selected services.`;
  }

  let addOnDetails = "";

  if (addOns.toLowerCase().includes("meta ads")) {
    addOnDetails += `
- Meta Ads Management: Paid campaign management for Facebook and Instagram awareness, reach, and profile visit campaigns.`;
  }

  if (addOns.toLowerCase().includes("basic seo")) {
    addOnDetails += `
- Basic SEO: Website and local search optimization to improve online visibility.`;
  }

  if (addOns.toLowerCase().includes("advanced seo")) {
    addOnDetails += `
- Advanced SEO: Technical SEO, keyword strategy, competitor analysis, and organic visibility improvement.`;
  }

  if (addOns.toLowerCase().includes("lead generation")) {
    addOnDetails += `
- Lead Generation: Meta Instant Form campaigns for capturing direct patient leads.`;
  }

  if (addOns.toLowerCase().includes("conversion support")) {
    addOnDetails += `
- Conversion Support: Telecalling, patient follow-ups, and appointment coordination support.`;
  }

  if (!addOnDetails) {
    addOnDetails = "- No additional add-on services selected.";
  }

  return `
ATOMS DIGITAL SOLUTIONS PRIVATE LIMITED

Digital Marketing Proposal

1. Proposal Title
Digital Marketing Proposal for ${clientName}${city ? `, ${city}` : ""}

2. Client Overview
This proposal is prepared for ${clientName}${city ? `, located in ${city}` : ""}. The objective is to support the client's digital growth using the confirmed services, platforms, deliverables, and pricing discussed during the proposal collection process.

3. Objectives
- Improve digital visibility for ${clientName}.
- Build stronger online presence through selected platforms and services.
- Support patient reach, engagement, and lead generation.
- Execute only the services confirmed during the discussion.

4. Recommended Package
${basePackage}

5. Selected Platforms
${platforms}

${!hasYouTube ? "Note: YouTube is not selected and will not be included in this proposal." : ""}

6. Add-on Services
${addOnDetails}

7. Monthly Deliverables
${monthlyDeliverables}

8. Pricing
Pricing confirmed during discussion:

${pricing}

${basePrice ? `- Base Package: ${basePrice}` : ""}
${metaAdsPrice ? `- Meta Ads Management: ${metaAdsPrice}` : ""}
${basicSeoPrice ? `- Basic SEO: ${basicSeoPrice}` : ""}

Total Monthly Investment: ${totalPrice}

9. Expected Benefits
- Better local visibility and patient awareness.
- Stronger brand presence on selected digital platforms.
- Improved lead generation and conversion support.
- Clear monthly deliverables based on the confirmed package.

10. Important Notes
- Prices mentioned are based on the final confirmed discussion.
- Advertising spend is separate from management fees unless specifically included.
- Any additional services outside this scope will be discussed and quoted separately.
- Monthly deliverables and services will follow the confirmed package and selected add-ons only.

11. Next Steps
- Review and approve the proposal.
- Confirm required access and brand details.
- Start onboarding and monthly execution planning.

12. Conclusion
Atoms Digital Solutions looks forward to working with ${clientName} and supporting its digital marketing goals through a clear, structured, and result-focused approach.

ATOMS DIGITAL SOLUTIONS PRIVATE LIMITED
`;
}
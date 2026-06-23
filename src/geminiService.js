import { GoogleGenAI } from "@google/genai";
import {
  COMPANY_DETAILS,
  FIXED_IMPORTANT_NOTES,
  STANDARD_PACKAGES,
  ADD_ON_SERVICES,
  CONTENT_THEMES,
} from "./proposalConfig";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MODEL_NAME = "gemini-2.5-flash";

function cleanText(text) {
  return text ? String(text).trim() : "";
}

function getMessageText(message) {
  return cleanText(message?.text || message?.content || message?.message || "");
}

function getUserMessages(messages) {
  return (messages || []).filter((message) => message.sender === "user");
}

function conversationToText(messages) {
  return (messages || [])
    .map((message) => {
      const role = message.sender === "user" ? "User" : "Assistant";
      return `${role}: ${getMessageText(message)}`;
    })
    .join("\n");
}

function recentConversationToText(messages, limit = 12) {
  return (messages || [])
    .slice(-limit)
    .map((message) => {
      const role = message.sender === "user" ? "User" : "Assistant";
      return `${role}: ${getMessageText(message)}`;
    })
    .join("\n");
}

function normalizeArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }

  return String(value)
    .split(/\n|•|,|;/)
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function buildFixedParametersText() {
  return `
Company Details:
- Company Name: ${COMPANY_DETAILS.companyName}
- Short Name: ${COMPANY_DETAILS.shortName}
- CIN: ${COMPANY_DETAILS.cin}
- Email: ${COMPANY_DETAILS.email}
- Phone: ${COMPANY_DETAILS.phone}
- Address: ${COMPANY_DETAILS.address}

Standard Fixed Packages:
Hospital Growth Package:
- Monthly Investment: ${STANDARD_PACKAGES.hospitalGrowth.monthlyInvestment}
- Deliverables: 12 reels, 6 posters, 1 regular shoot, Instagram, Facebook, YouTube, Google My Business
- Sections include Content Strategy & Planning, Reel Content Creation, Creative Designing, Social Media Management, Google Presence Management, Shoot Support, Client Support, Performance Observation.

Doctor Personal Branding Package:
- Monthly Investment: ${STANDARD_PACKAGES.doctorPersonalBranding.monthlyInvestment}
- Deliverables: 8 reels, 4 posters, Instagram, Facebook, YouTube, Google My Business if applicable
- Sections include Personal Brand Positioning, Content Planning, Reels, Creatives, Social Media Management, GMB, Support and Review.

Solar Digital Marketing Package:
- Monthly Investment: ${STANDARD_PACKAGES.solarBusiness.monthlyInvestment}
- Ad Budget: ${STANDARD_PACKAGES.solarBusiness.adBudget}
- Sections include GMB, Social Media, Meta Ads, Reporting and Support.

Add-ons:
- Meta Ads: ${ADD_ON_SERVICES.metaAds.price}
- Google Ads: ${ADD_ON_SERVICES.googleAds.price}
- Meta + Google Ads: ${ADD_ON_SERVICES.metaGoogleAds.price}
- Basic SEO: ${ADD_ON_SERVICES.basicSeo.price}
- Advanced SEO: ${ADD_ON_SERVICES.advancedSeo.price}
- Lead Management / Telecalling: ${ADD_ON_SERVICES.conversionSupport.price}
- Website Management: ${ADD_ON_SERVICES.websiteManagement.price}
- Advanced Strategy & Research: ${ADD_ON_SERVICES.advancedStrategy.price}
- Regular Shoot: ${ADD_ON_SERVICES.regularShoot.price}
- Premium Shoot: ${ADD_ON_SERVICES.premiumShoot.price}
- Extra Reel: ${ADD_ON_SERVICES.extraReel.price}
- Extra Poster: ${ADD_ON_SERVICES.extraPoster.price}

Important Notes:
Hospital:
${FIXED_IMPORTANT_NOTES.hospital.map((item) => `- ${item}`).join("\n")}
Doctor:
${FIXED_IMPORTANT_NOTES.doctor.map((item) => `- ${item}`).join("\n")}
Solar:
${FIXED_IMPORTANT_NOTES.solar.map((item) => `- ${item}`).join("\n")}

Default Content Themes:
Hospital: ${CONTENT_THEMES.hospital.join(", ")}
Doctor: ${CONTENT_THEMES.doctor.join(", ")}
Solar: ${CONTENT_THEMES.solar.join(", ")}
`.trim();
}

const PROPOSAL_REFERENCE_CONTEXT = `
REFERENCE PROPOSAL STYLE AND KNOWLEDGE BASE

Use these reference structures and write in Atoms Digital Solutions style. Do not copy blindly; adapt to the user-provided client details.

1. Trinity Hospitals, Kakinada reference:
- Title: ATOMS DIGITAL SOLUTIONS DIGITAL MARKETING PROPOSAL TRINITY HOSPITALS, KAKINADA
- Overview: Trinity moving into multi-speciality positioning; focus on local visibility, patient trust, and awareness.
- Sections: Website SEO, Google Business Profile, Social Media including Facebook + Instagram + YouTube + WhatsApp Marketing, Paid Advertising, WhatsApp Marketing, Reporting & Support, Important Notes, Other Strategies, Conclusion.
- Social media deliverables: 16 reels plus special day creatives, QR based appointment booking, WhatsApp marketing.
- Content Strategy: Specialisation Introduction, Doctor-Led Content, Patient Experience handled sensitively, Awareness & Education, Hospital & Infrastructure.
- Ad budget example: ₹25,000 – ₹30,000 per month.
- Other strategies: podcasts with doctors, voxpop, ad film, collaborative videos, Instagram lives, awareness sessions, medical camps, walks/rallies, outreach camps, brochures.

2. Blossoms Mother & Child Hospital reference:
- Title: ATOMS DIGITAL SOLUTIONS DIGITAL MARKETING PROPOSAL BLOSSOMS CHILDREN HOSPITAL, GUNTUR
- Sections: GMB, Social Media, Paid Advertising Meta Ads Only, Reporting & Support, Investment, Important Notes, Conclusion.
- Deliverables: 12 reels, 4 posters per month, special day creatives may increase.
- Content Strategy: Child Healthcare Awareness, Doctor-Led Content, Patient Experiences, Hospital & Care Environment.
- Expected reach: 1.5L – 2L people/month.
- Professional service fee example: ₹40,000 per month. Ad budget example: ₹10,000 per month.

3. Solar proposal reference:
- Title: ATOMS DIGITAL SOLUTIONS DIGITAL MARKETING PROPOSAL
- Overview: Solar decisions are trust-driven and education-based. Focus on savings, installation process, maintenance, and long-term benefits.
- Sections: Google Business Profile, Social Media, Content Strategy, Paid Advertising, Reporting & Support, Investment.
- Deliverables: 12 reels, 4 posters, GMB, social media, Meta Ads.
- Content Strategy: Site Visit Vlogs, Myth Busting, Trust & Expertise Building, Founder POV Videos.
- Professional fee example: ₹40,000 per month + 18% GST. Ad budget example: ₹10,000 per month.

4. Dr. Prathyusha reference:
- Title: CONTENT CREATION PROPOSAL DR. PRATHYUSHA – GYNECOLOGIST & FERTILITY SPECIALIST
- Sections: Overview, Content Creation Services, Content Strategy & Planning, Content Production, Content Themes, Shoot & Production Support, Social Media Management, Expected Outcomes, Investment, Important Notes, Conclusion.
- Deliverables: 12 reels, 4 posters, stories regular updates.
- Content themes: Women’s Health Awareness, Fertility Awareness, Doctor-Led Educational Content, Emotional & Relatable Content, Personal Branding.
- Investment example: ₹40,000 per month.

5. Aster Ramesh Hospitals reference versions:
- Title: DIGITAL MARKETING PROPOSAL ASTER RAMESH HOSPITALS, VIJAYAWADA
- Overview: trusted multi-speciality healthcare institution; opportunity to enhance digital healthcare authority through speciality visibility, doctor-led communication, educational healthcare content, and consistent digital presence.
- Version 1 basic package: GMB, Social Media, Reporting & Support, Optional Paid Ads. Deliverables: 18 reels, 6 posters, 1 video shoot. Pricing example: ₹1,00,000 + GST.
- Version 2 advanced package: Website & SEO, GMB, Social Media, Reporting & Support, Optional Paid Ads. Deliverables: 24 reels, 10 posters, 2 video shoots, 4 blogs. Pricing example: ₹1,25,000 + GST.
- Version 3 premium package: Website & SEO, GMB, Social Media, Reporting & Support, Optional Paid Ads. Deliverables: 24 reels, 10 posters, 2 video shoots, 4 blogs, 1 podcast with 2 camera men + 1 DOP, 1 hour video, teaser, 8 podcast reels. Pricing example: ₹1,70,000 + GST.
- Content Strategy: Specialisation Introduction, Doctor-Led Content, Patient Experience handled sensitively, Awareness & Education, Hospital & Infrastructure, Lead Magnets.

6. Additional notes reference:
- Hospital proposal default has Hospital Growth Package at ₹60,000/month with 12 reels, 6 posters, 1 shoot, Instagram/Facebook/YouTube/GMB.
- Doctor default has Doctor Personal Branding Package at ₹35,000/month with 8 reels, 4 posters, Instagram/Facebook/YouTube/GMB if applicable.
- Add-on pricing includes Meta Ads ₹6,000/month, Google Ads ₹12,000/month, Meta+Google ₹15,000/month, Basic SEO ₹10,000/month, Advanced SEO ₹20,000/month, Lead Management ₹15,000/month, Website Management ₹5,000/month, Advanced Strategy ₹8,000/month, Regular Shoot ₹5,000, Premium Shoot ₹10,000, Extra Reel ₹1,000, Extra Poster ₹500.
`;

function buildAiSystemPrompt() {
  return `
You are a FULL AI CHATBOT called "Atoms Digital Solutions Proposal Assistant".
You are not a rule-based form and not a fixed auto-machine.
Every chat reply must be natural, context-aware, and generated by AI.

Your responsibilities:
1. Talk like a professional AI assistant.
2. Answer normal chat messages naturally.
3. Understand proposal details from unstructured user input.
4. Ask for missing details conversationally, not as rigid form validation.
5. Answer questions from the already provided proposal details.
6. Never repeat the same line blindly.
7. Never say "All details are collected" repeatedly.
8. If enough details are available, tell the user they can generate the proposal, but still answer their question first.
9. Keep replies short and useful in chat.
10. For medical/healthcare proposals, do not make medical claims; speak only about digital marketing strategy.

Required proposal details you should try to understand:
- Client type: Hospital / Doctor / Solar / Other business
- Client name and city
- Package or services
- Platforms
- Add-ons
- Pricing / budget

${buildFixedParametersText()}

${PROPOSAL_REFERENCE_CONTEXT}
`.trim();
}

function assertAiReady() {
  if (!ai) {
    throw new Error("Gemini API key is missing. Please add VITE_GEMINI_API_KEY in .env.local or Vercel Environment Variables.");
  }
}

async function generateAiText(prompt) {
  assertAiReady();

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
  });

  return cleanText(response.text);
}

export async function getGeminiReply(userInput, messages) {
  const currentMessage = cleanText(userInput);
  const recentConversation = recentConversationToText(messages, 14);

  const prompt = `
${buildAiSystemPrompt()}

Recent conversation:
${recentConversation || "No previous conversation."}

Current user message:
${currentMessage || "User clicked or sent an empty message."}

Reply now as a natural AI chatbot.
Rules for this reply:
- Do not use JSON.
- Do not generate the full final proposal in chat.
- If the user asks a question like "how many posters", answer from the latest proposal details in the conversation.
- If details are missing, ask the next most useful question conversationally.
- Keep it under 5 lines unless the user asks for more.
`;

  try {
    const reply = await generateAiText(prompt);
    return reply || "I am here to help you prepare the proposal. Please share the client details or ask me anything about the proposal.";
  } catch (error) {
    console.error("Gemini chatbot reply failed:", error);
    return `Gemini AI is currently not available: ${error.message}`;
  }
}

export async function generateProposalWithGemini(messages) {
  const conversation = conversationToText(messages);

  const prompt = `
${buildAiSystemPrompt()}

You must now generate the FINAL PROPOSAL from the conversation below.

Conversation:
${conversation}

Generate a complete Atoms Digital Solutions proposal.

Strict proposal rules:
- Use only the details provided by the user plus the fixed company/package/reference knowledge given above.
- If user gave a known reference client/package like Blossoms, Trinity, Solar, Dr. Prathyusha, or Aster Ramesh, follow the matching reference style.
- If user gave custom details, adapt professionally.
- Do not say you are an AI.
- Do not include markdown code fences.
- Use clear headings.
- Use bullet points with the symbol •.
- Include Overview.
- Include relevant service sections.
- Include Content Strategy.
- Include Expected Results where suitable.
- Include Investment / Pricing using user-provided pricing if available.
- Include Important Notes.
- Include Conclusion.
- Include company address at the end.
- Avoid duplicate rupee symbols like "₹ ₹".
- Keep patient experience wording sensitive: use attendee/caregiver/recovery experiences only if appropriate and avoid direct patient claims.
- Do not invent false guarantees.

Return only the final proposal text.
`;

  const proposal = await generateAiText(prompt);

  if (!proposal) {
    throw new Error("Gemini returned an empty proposal.");
  }

  return proposal;
}

export function generateLocalProposal() {
  return "Gemini AI proposal generation is currently unavailable. Please check Gemini API key, internet connection, or Vercel environment variables. This version does not generate rule-based local proposals.";
}

export function getValidatedConversation(messages) {
  const userText = getUserMessages(messages)
    .map((message) => getMessageText(message))
    .join("\n");

  return {
    acceptedAnswers: [],
    collectedData: {},
    missingFields: [],
    hasInvalidPlatform: false,
    currentStep: 0,
    isComplete: cleanText(userText).length > 0,
  };
}

export function getConversationClientInfo(messages) {
  const userText = getUserMessages(messages)
    .map((message) => getMessageText(message))
    .join("\n");

  const firstPipeLine = userText
    .split("\n")
    .map((line) => cleanText(line))
    .find((line) => line.includes("|"));

  if (firstPipeLine) {
    const parts = firstPipeLine.split("|").map((part) => cleanText(part));
    const clientType = parts[0] || "AI Proposal";
    const clientDetails = parts[1] || "Client";
    const clientName = clientDetails.split(",")[0]?.trim() || "Client";

    return {
      clientType,
      clientName,
    };
  }

  const clientNameMatch = userText.match(/(?:for|client|hospital|doctor|business)\s*[:\-]?\s*([A-Za-z0-9 .&]+(?:Hospital|Clinic|Doctor|Solar|Solutions|Centre|Center|Dr\.? [A-Za-z .]+)?)/i);

  return {
    clientType: "AI Proposal",
    clientName: cleanText(clientNameMatch?.[1]) || "AI Proposal Session",
  };
}

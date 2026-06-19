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

function cleanText(text) {
  return text ? String(text).trim() : "";
}

function getUserMessages(messages) {
  return messages.filter((message) => message.sender === "user");
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

function buildBulletList(items) {
  const list = normalizeArray(items);

  if (list.length === 0) return "";

  return list.map((item) => `• ${item}`).join("\n");
}

function detectClientType(text) {
  const value = text.toLowerCase();

  if (value.includes("doctor") || value.includes("dr.")) return "doctor";
  if (value.includes("solar")) return "solar";
  if (value.includes("hospital")) return "hospital";

  return "hospital";
}

function getClientNameAndCity(clientDetails) {
  const parts = clientDetails
    .split(",")
    .map((part) => cleanText(part))
    .filter(Boolean);

  const clientName = parts[0] || "Client";
  const city = parts.length > 1 ? parts[parts.length - 1] : "";
  const specialty =
    parts.length > 2 ? parts.slice(1, parts.length - 1).join(", ") : "";

  return { clientName, city, specialty };
}

function readNumber(text, keyword, fallbackValue) {
  const pattern = new RegExp(`(\\d+)\\s*(?:high-quality\\s*)?${keyword}`, "i");
  const match = text.match(pattern);

  if (match && match[1]) return match[1];

  return fallbackValue;
}

function readAdBudget(text, fallbackValue = "") {
  const match = text.match(
    /ad budget[^₹0-9]*(?:₹)?\s*([\d,]+(?:\s*[–-]\s*[\d,]+)?)/i
  );

  if (match && match[1]) {
    return `₹${match[1]} per month`;
  }

  return fallbackValue;
}

function detectHospitalVariant(data) {
  const value = `${data.clientName} ${data.city} ${data.packageText} ${data.platformsText} ${data.addOnsText} ${data.pricingText}`.toLowerCase();

  if (
    value.includes("blossoms") ||
    value.includes("children hospital") ||
    value.includes("pediatric") ||
    value.includes("paediatric")
  ) {
    return "blossoms";
  }

  if (
    value.includes("trinity") ||
    value.includes("kakinada") ||
    value.includes("whatsapp marketing")
  ) {
    return "trinity";
  }

  if (value.includes("aster") || value.includes("ramesh")) {
    return "aster";
  }

  return "standard";
}

function detectDoctorVariant(data) {
  const value = `${data.clientName} ${data.specialty} ${data.packageText} ${data.pricingText}`.toLowerCase();

  if (
    value.includes("prathyusha") ||
    value.includes("content creation") ||
    value.includes("12 reels") ||
    value.includes("40,000")
  ) {
    return "content_creation";
  }

  return "personal_branding";
}

function detectSelectedPackage(clientType, packageText) {
  const value = packageText.toLowerCase();

  if (clientType === "doctor") {
    return STANDARD_PACKAGES.doctorPersonalBranding;
  }

  if (clientType === "solar") {
    return STANDARD_PACKAGES.solarBusiness;
  }

  if (value.includes("custom")) {
    return {
      ...STANDARD_PACKAGES.hospitalGrowth,
      title: "Custom Hospital Package",
      monthlyInvestment: "As confirmed in pricing",
    };
  }

  return STANDARD_PACKAGES.hospitalGrowth;
}

function detectAddOns(addOnsText) {
  const value = addOnsText.toLowerCase();
  const selectedAddOns = [];

  if (value.includes("meta + google") || value.includes("meta and google")) {
    selectedAddOns.push(ADD_ON_SERVICES.metaGoogleAds);
  } else {
    if (
      value.includes("meta ads") ||
      value.includes("paid ads") ||
      value.includes("meta")
    ) {
      selectedAddOns.push(ADD_ON_SERVICES.metaAds);
    }

    if (value.includes("google ads")) {
      selectedAddOns.push(ADD_ON_SERVICES.googleAds);
    }
  }

  if (value.includes("advanced seo")) {
    selectedAddOns.push(ADD_ON_SERVICES.advancedSeo);
  } else if (value.includes("basic seo") || value.includes("seo")) {
    selectedAddOns.push(ADD_ON_SERVICES.basicSeo);
  }

  if (
    value.includes("conversion support") ||
    value.includes("telecalling") ||
    value.includes("lmt") ||
    value.includes("follow-up") ||
    value.includes("follow up")
  ) {
    selectedAddOns.push(ADD_ON_SERVICES.conversionSupport);
  }

  if (value.includes("website")) {
    selectedAddOns.push(ADD_ON_SERVICES.websiteManagement);
  }

  if (value.includes("strategy") || value.includes("research")) {
    selectedAddOns.push(ADD_ON_SERVICES.advancedStrategy);
  }

  if (value.includes("regular shoot")) {
    selectedAddOns.push(ADD_ON_SERVICES.regularShoot);
  }

  if (value.includes("premium shoot")) {
    selectedAddOns.push(ADD_ON_SERVICES.premiumShoot);
  }

  return selectedAddOns;
}

const REQUIRED_FIELD_KEYS = [
  "clientTypeText",
  "clientDetailsText",
  "packageText",
  "platformsText",
  "addOnsText",
  "pricingText",
];

const GENERIC_SINGLE_WORDS = [
  "hospital",
  "doctor",
  "dr",
  "solar",
  "business",
  "other",
  "other business",
  "package",
  "proposal",
  "platform",
  "platforms",
  "addon",
  "addons",
  "add-on",
  "add-ons",
  "pricing",
  "price",
  "tiktok",
  "tik tok",
];

const VALID_PLATFORM_WORDS = [
  "instagram",
  "facebook",
  "youtube",
  "gmb",
  "google business profile",
  "google my business",
  "google",
  "website",
  "whatsapp",
  "whatsapp marketing",
];

const INVALID_PLATFORM_WORDS = [
  "tiktok",
  "tik tok",
  "snapchat",
  "telegram",
];

function getMessageText(message) {
  return cleanText(message?.text || message?.content || message?.message || "");
}

function isBadInput(text) {
  const value = cleanText(text).toLowerCase();

  if (!value) return true;

  const badInputs = [
    "hi",
    "hii",
    "hello",
    "hey",
    "i don't know",
    "i dont know",
    "don't know",
    "dont know",
    "no idea",
    "i don't tell you",
    "i dont tell you",
    "nothing",
    "not sure",
    "skip",
    "test",
    "abc",
    "ok",
  ];

  return badInputs.includes(value);
}

function isGenericOnly(text) {
  const value = cleanText(text).toLowerCase();
  return GENERIC_SINGLE_WORDS.includes(value);
}

function isValidClientType(text) {
  const value = cleanText(text).toLowerCase();

  if (isBadInput(value)) return false;

  return (
    value.includes("hospital") ||
    value.includes("doctor") ||
    value.includes("dr.") ||
    value.includes("solar") ||
    value.includes("business")
  );
}

function isValidClientDetails(text) {
  const value = cleanText(text);
  const lowerValue = value.toLowerCase();

  if (isBadInput(value)) return false;
  if (isGenericOnly(value)) return false;

  if (
    lowerValue === "instagram" ||
    lowerValue === "facebook" ||
    lowerValue === "youtube" ||
    lowerValue === "gmb" ||
    lowerValue === "google" ||
    lowerValue === "website" ||
    lowerValue === "whatsapp"
  ) {
    return false;
  }

  const parts = value
    .split(",")
    .map((part) => cleanText(part))
    .filter(Boolean);

  if (parts.length >= 2) {
    const clientName = parts[0];
    const city = parts[parts.length - 1];

    return clientName.length >= 5 && city.length >= 3;
  }

  return false;
}

function isValidPackage(text) {
  const value = cleanText(text).toLowerCase();

  if (isBadInput(value)) return false;
  if (isGenericOnly(value)) return false;

  return (
    value.includes("package") ||
    value.includes("proposal") ||
    value.includes("blossoms") ||
    value.includes("trinity") ||
    value.includes("aster") ||
    value.includes("standard") ||
    value.includes("content creation") ||
    value.includes("personal branding") ||
    value.includes("reels") ||
    value.includes("posters") ||
    value.includes("seo") ||
    value.includes("gmb") ||
    value.includes("social") ||
    value.includes("meta ads") ||
    value.includes("reporting") ||
    value.includes("₹") ||
    value.includes("rs") ||
    /\b\d{4,}\b/.test(value)
  );
}

function isValidPlatforms(text) {
  const value = cleanText(text).toLowerCase();

  if (isBadInput(value)) return false;

  const hasInvalidPlatform = INVALID_PLATFORM_WORDS.some((word) =>
    value.includes(word)
  );

  if (hasInvalidPlatform) return false;

  return VALID_PLATFORM_WORDS.some((word) => value.includes(word));
}

function isValidAddOns(text) {
  const value = cleanText(text).toLowerCase();

  if (isBadInput(value)) return false;

  if (value.includes("tiktok") || value.includes("tik tok")) return false;

  if (
    value.includes("no") ||
    value.includes("none") ||
    value.includes("no add")
  ) {
    return true;
  }

  return (
    value.includes("meta") ||
    value.includes("google") ||
    value.includes("seo") ||
    value.includes("ads") ||
    value.includes("whatsapp") ||
    value.includes("website") ||
    value.includes("shoot") ||
    value.includes("conversion") ||
    value.includes("telecalling") ||
    value.includes("reporting")
  );
}

function isValidPricing(text) {
  const value = cleanText(text).toLowerCase();

  if (isBadInput(value)) return false;
  if (isGenericOnly(value)) return false;

  return (
    value.includes("₹") ||
    value.includes("rs") ||
    value.includes("pricing") ||
    value.includes("service fee") ||
    value.includes("ad budget") ||
    value.includes("gst") ||
    value.includes("confirmed") ||
    /\b\d{4,}\b/.test(value)
  );
}

function splitUserInputIntoSegments(messages) {
  return getUserMessages(messages)
    .flatMap((message) => {
      const text = getMessageText(message);

      return text
        .split(/\n|\|/)
        .map((item) => cleanText(item))
        .filter(Boolean);
    })
    .filter((item) => !isBadInput(item));
}

function getExplicitClientType(text) {
  const value = cleanText(text).toLowerCase();

  if (value.includes("doctor") || value.includes("dr.")) return "doctor";
  if (value.includes("solar")) return "solar";
  if (value.includes("hospital")) return "hospital";
  if (value.includes("business")) return "other business";

  return "";
}

function buildAcceptedAnswersFromCollectedData(collectedData) {
  return REQUIRED_FIELD_KEYS.filter((key) => collectedData[key]).map(
    (key, index) => ({
      stepIndex: index,
      key,
      value: collectedData[key],
      raw: collectedData[key],
    })
  );
}

function collectProposalInputs(messages) {
  const segments = splitUserInputIntoSegments(messages);
  const fullText = segments.join("\n");

  const collectedData = {
    clientTypeText: "",
    clientDetailsText: "",
    packageText: "",
    platformsText: "",
    addOnsText: "",
    pricingText: "",
  };

  segments.forEach((segment) => {
    if (!collectedData.clientTypeText && isValidClientType(segment)) {
      collectedData.clientTypeText = segment;
    }

    if (!collectedData.clientDetailsText && isValidClientDetails(segment)) {
      collectedData.clientDetailsText = segment;
    }

    if (!collectedData.packageText && isValidPackage(segment)) {
      collectedData.packageText = segment;
    }

    if (!collectedData.platformsText && isValidPlatforms(segment)) {
      collectedData.platformsText = segment;
    }

    if (!collectedData.addOnsText && isValidAddOns(segment)) {
      collectedData.addOnsText = segment;
    }

    if (!collectedData.pricingText && isValidPricing(segment)) {
      collectedData.pricingText = segment;
    }
  });

  if (!collectedData.clientTypeText) {
    const explicitClientType = getExplicitClientType(fullText);

    if (explicitClientType) {
      collectedData.clientTypeText = explicitClientType;
    }
  }

  const missingFields = REQUIRED_FIELD_KEYS.filter((key) => !collectedData[key]);

  const hasInvalidPlatform = INVALID_PLATFORM_WORDS.some((word) =>
    fullText.toLowerCase().includes(word)
  );

  return {
    collectedData,
    missingFields,
    hasInvalidPlatform,
    acceptedAnswers: buildAcceptedAnswersFromCollectedData(collectedData),
    isComplete: missingFields.length === 0 && !hasInvalidPlatform,
  };
}

export function getValidatedConversation(messages) {
  const collected = collectProposalInputs(messages);

  return {
    acceptedAnswers: collected.acceptedAnswers,
    collectedData: collected.collectedData,
    missingFields: collected.missingFields,
    hasInvalidPlatform: collected.hasInvalidPlatform,
    currentStep: collected.acceptedAnswers.length,
    isComplete: collected.isComplete,
  };
}

function getValidatedAnswer(acceptedAnswers, key) {
  return acceptedAnswers.find((item) => item.key === key)?.value || "";
}

function extractProposalData(messages) {
  const validatedConversation = getValidatedConversation(messages);
  const acceptedAnswers = validatedConversation.acceptedAnswers;

  const clientTypeText = getValidatedAnswer(acceptedAnswers, "clientTypeText");
  const clientDetailsText = getValidatedAnswer(
    acceptedAnswers,
    "clientDetailsText"
  );
  const packageText = getValidatedAnswer(acceptedAnswers, "packageText");
  const platformsText = getValidatedAnswer(acceptedAnswers, "platformsText");
  const addOnsText = getValidatedAnswer(acceptedAnswers, "addOnsText");
  const pricingText = getValidatedAnswer(acceptedAnswers, "pricingText");
  const extraText = acceptedAnswers.map((answer) => answer.value).join("\n");

  const clientType = detectClientType(clientTypeText);
  const { clientName, city, specialty } =
    getClientNameAndCity(clientDetailsText);
  const selectedPackage = detectSelectedPackage(clientType, packageText);
  const selectedAddOns = detectAddOns(addOnsText);

  const allText = `${clientTypeText} ${clientDetailsText} ${packageText} ${platformsText} ${addOnsText} ${pricingText}`;

  const data = {
    clientType,
    clientName,
    city,
    specialty,
    packageText,
    platformsText,
    addOnsText,
    pricingText,
    extraText,
    allText,
    selectedPackage,
    selectedAddOns,
    reels: readNumber(allText, "reels?", ""),
    posters: readNumber(allText, "posters?|creatives?", ""),
    shoots: readNumber(allText, "shoots?", ""),
    blogs: readNumber(allText, "blogs?", ""),
    adBudget: readAdBudget(allText, ""),
    validatedConversation,
  };

  if (clientType === "hospital") {
    data.hospitalVariant = detectHospitalVariant(data);
  }

  if (clientType === "doctor") {
    data.doctorVariant = detectDoctorVariant(data);
  }

  return data;
}

function getProposalTitle(data) {
  if (data.clientType === "doctor") {
    if (data.doctorVariant === "content_creation") {
      return `CONTENT CREATION PROPOSAL\n${data.clientName.toUpperCase()}${
        data.specialty ? ` – ${data.specialty.toUpperCase()}` : ""
      }`;
    }

    return `DOCTOR PERSONAL BRANDING PROPOSAL\nPrepared For: ${data.clientName}\nPrepared By: ${COMPANY_DETAILS.shortName}`;
  }

  return `ATOMS DIGITAL SOLUTIONS\nDIGITAL MARKETING PROPOSAL\n${data.clientName.toUpperCase()}${
    data.city ? `, ${data.city.toUpperCase()}` : ""
  }`;
}

function getImportantNotes(clientType) {
  if (clientType === "doctor") return FIXED_IMPORTANT_NOTES.doctor;
  if (clientType === "solar") return FIXED_IMPORTANT_NOTES.solar;

  return FIXED_IMPORTANT_NOTES.hospital;
}

function getInvestmentText(data, fallbackText = "") {
  if (data.pricingText) return data.pricingText;
  if (fallbackText) return fallbackText;
  if (data.selectedPackage?.monthlyInvestment) {
    return data.selectedPackage.monthlyInvestment;
  }

  return "As confirmed by the client";
}

function buildSection(section, index) {
  const prefix = index ? `${index}. ` : "";
  let output = `${prefix}${section.title}\n`;

  if (section.platformsCovered) {
    output += `Platforms Covered:\n${buildBulletList(section.platformsCovered)}\n`;
  }

  if (section.whatWeDo) {
    output += `What We Do\n${buildBulletList(section.whatWeDo)}\n`;
  }

  if (section.expectedResults) {
    output += `Expected Results\n${buildBulletList(section.expectedResults)}\n`;
  }

  return output.trim();
}

function buildAddOnSections(selectedAddOns, startIndex) {
  if (!selectedAddOns || selectedAddOns.length === 0) return "";

  let output = `${startIndex}. Optional Growth Add-Ons\n`;

  selectedAddOns.forEach((addOn) => {
    output += `\n${addOn.title} - ${addOn.price || "Custom Pricing"}\n`;

    if (addOn.whatWeDo) {
      output += `What We Do\n${buildBulletList(addOn.whatWeDo)}\n`;
    }

    if (addOn.note) {
      output += `Note: ${addOn.note}\n`;
    }
  });

  return output.trim();
}

function buildBlossomsContentStrategy() {
  return `
1. Child Healthcare Awareness
• Child growth milestones
• Vaccination awareness
• Common pediatric concerns

2. Doctor-Led Content
• Doctors explaining treatments
• FAQs for parents
• Myth vs fact

3. Patient Experiences
• Attendee experiences handled sensitively
• Case studies
• Trust-building stories

4. Hospital & Care Environment
• Facilities, NICU, pediatric care
• Safety and hygiene practices
`.trim();
}

function buildAsterContentStrategy() {
  return `
• Specialisation introduction
• Doctor-led content
• Patient experience handled sensitively
• Awareness and education
• Hospital and infrastructure
• Lead magnets for specific conditions
`.trim();
}

function buildTrinityContentStrategy() {
  return `
• Specialisation introduction
• Doctor-led content
• Patient experience handled sensitively
• Awareness and education
• Hospital and infrastructure
• WhatsApp healthcare awareness communication
`.trim();
}

function buildBlossomsProposal(data, contentBlocks) {
  const reels = data.reels || "12";
  const posters = data.posters || "4";
  const adBudget = data.adBudget || "₹10,000 per month";

  return `
${getProposalTitle(data)}

Overview
${contentBlocks.overview}

1. Google Business Profile (GMB)
What We Do
• Optimise and manage Google Business Profile
• Post regular updates
• Upload photos, services, and treatment highlights
• Reviews management
• Maintain accurate and consistent business information

Expected Results
• Higher visibility in Google Maps and local search
• Increase in calls, direction requests, and walk-ins
• Strong trust through positive patient reviews

2. Social Media (Facebook + Instagram + YouTube)
(Primary Engagement & Trust Building Channel)

What We Do
• Create monthly content calendar
• Post ${reels} reels per month
• ${posters} posters per month, may increase based on special days
• Manage and grow all platforms consistently

Content Strategy
${buildBlossomsContentStrategy()}

Expected Results
• Reach: 1.5L – 2L people/month
• Consistent follower growth
• Strong brand recall among parents

3. Paid Advertising (Meta Ads Only)
What We Do
• Run awareness campaigns targeting expecting mothers and parents
• Promote key services like maternity care and pediatrics
• Drive traffic to social media pages

Ad Budget Recommended: ${adBudget}

Expected Results
• Reach: 1.5L – 2L people/month
• Profile visits and engagement increase
• Improved visibility in target audience
• Increase in indirect enquiries through calls, visits, and referrals

4. Reporting & Support
What We Do
• Dedicated Relationship Manager
• Monthly performance report
• Continuous optimisation based on insights

Expected Results
• Clear visibility of growth
• Data-driven improvements
• Consistent performance tracking

Investment
${getInvestmentText(data, "Professional Service Fee: ₹40,000 per month")}

Important Notes
${buildBulletList(getImportantNotes("hospital"))}

Conclusion
${contentBlocks.conclusion}

${COMPANY_DETAILS.address}
`.trim();
}

function buildTrinityProposal(data, contentBlocks) {
  const reels = data.reels || "16";
  const adBudget = data.adBudget || "₹25,000 – 30,000 per month";

  return `
${getProposalTitle(data)}

Overview
${contentBlocks.overview}

1. Website (SEO)
What We Do
• Audit and optimise website
• Improve content structure and SEO elements
• Optimise pages for keywords like "Best hospital in ${
    data.city || "the target city"
  }" and "Specialist doctors near me"
• Create 2 blogs per month for health awareness and treatments
• Structure website department-wise for clarity

Expected Results
• Improved Google ranking for hospital and speciality searches
• Increase in organic website visitors
• Better patient understanding and trust
• Long-term consistent traffic without ad dependency

2. Google Business Profile (GMB)
What We Do
• Complete optimisation of GMB profile
• Upload hospital photos, services, and updates
• Manage Google reviews
• Maintain accurate and consistent information

Expected Results
• Higher visibility in Google Maps and local search
• Increase in direction requests and walk-ins
• Strong patient trust through reviews

3. Social Media (Facebook + Instagram + YouTube + WhatsApp Marketing)
(Primary Branding & Trust Building Channel)

What We Do
• Create structured monthly content calendar
• Post ${reels} reels plus special day creatives on a monthly basis
• QR code based appointment booking implementation
• Manage and grow all platforms consistently
• WhatsApp marketing

Content Strategy
${buildTrinityContentStrategy()}

4. Paid Advertising (Meta Ads)
What We Do
• Run awareness campaigns for hospital and departments
• Promote key services and doctor expertise
• Target audience in ${data.city || "the target city"} and nearby areas
• Drive traffic to Instagram page and website

Ad Budget Recommended: ${adBudget}

Expected Results
• Reach: 4,00,000 to 5,00,000 people/month
• Increased visibility across local audience
• Indirect enquiries through calls, walk-ins, and referrals

5. WhatsApp Marketing
What We Do
• Educational healthcare content circulation
• Occasional service updates like camps and offers

Expected Results
• Improved patient familiarity and retention
• Consistent healthcare awareness within existing audience
• Stronger connection between hospital and community

6. Reporting & Support
What We Do
• Dedicated Relationship Manager
• Monthly performance report
• Continuous optimisation based on results

Expected Results
• Clear visibility of growth
• Data-driven improvements
• Consistent performance tracking

Investment
${getInvestmentText(data, "As confirmed by the client")}

Important Notes
${buildBulletList(getImportantNotes("hospital"))}

Other Strategies
• Podcasts with doctors
• Voxpop
• Ad film
• Collaborative videos between doctors
• Frequent lives on Instagram
• Awareness sessions in colleges
• Medical camps and occasional free OPs
• Walks and rallies on special days
• Special outreach camps for government employees
• Brochures to every patient who attended the hospital

Conclusion
${contentBlocks.conclusion}

${COMPANY_DETAILS.address}
`.trim();
}

function buildAsterProposal(data, contentBlocks) {
  const text = data.allText.toLowerCase();

  const isPodcastPlan =
    text.includes("podcast") ||
    text.includes("1,70,000") ||
    text.includes("170000");

  const isBasicPlan =
    text.includes("1,00,000") ||
    text.includes("100000") ||
    text.includes("18 reels");

  const reels = data.reels || (isBasicPlan ? "18" : "24");
  const posters = data.posters || (isBasicPlan ? "6" : "10");
  const shoots = data.shoots || (isBasicPlan ? "1" : "2");
  const blogs = data.blogs || (isBasicPlan ? "" : "4");
  const adBudget = data.adBudget || "₹25,000 – 30,000 per month";

  const defaultPricing = isPodcastPlan
    ? "Pricing: ₹1,70,000 + GST"
    : isBasicPlan
    ? "Pricing: ₹1,00,000 + GST"
    : "Pricing: ₹1,25,000 + GST";

  const websiteSeoSection = isBasicPlan
    ? ""
    : `
1. Website & SEO Optimisation
What We Do
• Conduct a comprehensive SEO audit of the website
• Optimise website structure, page hierarchy, and technical SEO elements
• Improve speciality and treatment-based discoverability across search engines
• Optimise department pages, doctor profiles, and service pages
• Implement local SEO strategies targeting ${data.city || "the target region"}
• Publish SEO-focused healthcare awareness and patient education blogs
• Strengthen website content structure for better user experience and search visibility

Expected Results
• Improved search visibility across key medical specialities
• Higher organic traffic from healthcare-related searches
• Better discoverability for departments and doctors
• Strengthened digital credibility and patient trust
`;

  const startNumber = isBasicPlan ? 1 : 2;

  return `
${getProposalTitle(data)}

Overview
${contentBlocks.overview}

${websiteSeoSection}
${startNumber}. Google Business Profile (GMB) Optimisation
What We Do
• Complete optimisation and management of Google Business Profile
• Regular updates with hospital activities, services, and awareness communication
• Upload professional hospital, infrastructure, and speciality-related visuals
• Review monitoring and reputation management
• Maintain accurate and consistent hospital information across Google platforms

Expected Results
• Improved visibility in Google Maps and local healthcare searches
• Increased patient engagement through calls, direction requests, and profile interactions
• Stronger trust through patient reviews and active profile management
• Enhanced local discoverability for hospital services and specialities

${startNumber + 1}. Social Media Positioning (Facebook + Instagram + YouTube)
(Primary Branding, Healthcare Awareness & Trust Building Channel)

What We Do
• Develop a structured monthly healthcare strategy aligned with the hospital’s positioning and priorities
• Prepare a detailed monthly content calendar
• Research, plan, and write healthcare-focused content
• Coordinate and conduct content shoots with doctors and hospital infrastructure
• Edit healthcare videos and design premium-quality creatives aligned with institutional standards
• Publish and manage content across Facebook, Instagram, and YouTube platforms
• Maintain consistent visual identity and communication standards across all platforms

Monthly Deliverables
• ${reels} Reels
• ${posters} Posters
• ${shoots} Video Shoot${shoots === "1" ? "" : "s"}
${blogs ? `• ${blogs} Blogs` : ""}${
    isPodcastPlan
      ? "\n• 1 Podcast\n• Podcast shoot with 2 camera men and 1 DOP\n• One hour video - 1\n• Teaser - 1\n• Podcast reels - 8"
      : ""
  }

Content Strategy
${buildAsterContentStrategy()}

${startNumber + 2}. Reporting & Support
What We Do
• Dedicated Relationship Manager
• Monthly performance and analysis report
• Continuous optimisation based on results

Expected Results
• Clear visibility of growth
• Data-driven improvements
• Consistent performance tracking

${startNumber + 3}. Paid Advertising (Meta Ads and Google Ads) (Optional)
What We Do
• Awareness campaigns for hospital and departments across Meta, YouTube, and Google Search Ads
• Promote key services and doctor expertise
• Target audience in ${data.city || "the target city"} and nearby areas
• Drive traffic to Instagram page and website

Ad Budget Recommended: ${adBudget}

Expected Results
• Reach: 4,00,000 to 5,00,000 people/month
• Increased visibility across local audience
• Indirect enquiries through calls, walk-ins, and referrals

Other Strategies
• Voxpop
• Collaborative videos between doctors
• Frequent lives on Instagram

Investment
${getInvestmentText(data, defaultPricing)}

Important Notes
${buildBulletList(getImportantNotes("hospital"))}

Conclusion
${contentBlocks.conclusion}

${COMPANY_DETAILS.address}
`.trim();
}

function buildStandardHospitalProposal(data, contentBlocks) {
  const packageSections = data.selectedPackage.sections || [];
  const addOnText = buildAddOnSections(
    data.selectedAddOns,
    packageSections.length + 2
  );

  return `
${getProposalTitle(data)}

Overview
${contentBlocks.overview}

${packageSections
  .map((section, index) => buildSection(section, index + 1))
  .join("\n\n")}

Content Strategy
${buildBulletList(contentBlocks.contentStrategy || CONTENT_THEMES.hospital)}

${addOnText ? `${addOnText}\n\n` : ""}Investment / Pricing
${getInvestmentText(data)}

Important Notes
${buildBulletList(getImportantNotes("hospital"))}

Conclusion
${contentBlocks.conclusion}

${COMPANY_DETAILS.address}
`.trim();
}

function buildHospitalProposal(data, contentBlocks) {
  if (data.hospitalVariant === "blossoms") {
    return buildBlossomsProposal(data, contentBlocks);
  }

  if (data.hospitalVariant === "trinity") {
    return buildTrinityProposal(data, contentBlocks);
  }

  if (data.hospitalVariant === "aster") {
    return buildAsterProposal(data, contentBlocks);
  }

  return buildStandardHospitalProposal(data, contentBlocks);
}

function buildDoctorContentCreationProposal(data, contentBlocks) {
  const reels = data.reels || "12";
  const posters = data.posters || "4";

  return `
${getProposalTitle(data)}

Overview
${contentBlocks.overview}

Content Creation Services

1. Content Strategy & Planning
What We Do
• Define target audience
• Build monthly content calendar
• Identify key topics based on patient concerns
• Structure content pillars aligned with medical expertise

2. Content Production
Deliverables Per Month
• Reels: ${reels} per month
• Posters: ${posters} per month
• Stories: Regular updates based on engagement

3. Content Themes
• Women’s Health Awareness
• Fertility Awareness
• Doctor-Led Educational Content
• Emotional and Relatable Content
• Personal Branding

4. Shoot & Production Support
What We Do
• Plan and guide monthly shoot
• Provide content scripting support
• Ensure content is simple, relatable, and engaging
• Video editing with professional and clean style

5. Social Media Management
Platforms Covered
• Instagram
• Facebook
• YouTube

What We Do
• Posting content regularly
• Basic engagement handling

Expected Outcomes
• Strong personal brand for ${data.clientName}
• Increased trust among patients
• Better patient comfort before consultation
• Consistent growth in followers and engagement
• Improved recall as a trusted specialist

Investment
${getInvestmentText(data, "Content Creation Package: ₹40,000 per month")}

Important Notes
${buildBulletList([
  "Doctor presence in videos is essential for best results.",
  "Content consistency is key to building trust.",
  "Results improve significantly over 2–3 months.",
])}

Conclusion
${contentBlocks.conclusion}

${COMPANY_DETAILS.address}
`.trim();
}

function buildDoctorPersonalBrandingProposal(data, contentBlocks) {
  const packageData = STANDARD_PACKAGES.doctorPersonalBranding;
  const packageSections = packageData.sections || [];
  const addOnText = buildAddOnSections(data.selectedAddOns, 4);

  return `
${getProposalTitle(data)}

1. Understanding Your Requirement
${contentBlocks.overview}

2. Objectives of Personal Branding
${buildBulletList(contentBlocks.expectedResults)}

3. Recommended Service Scope
${packageData.title}
Monthly Investment: ${packageData.monthlyInvestment}

${packageSections.map((section) => buildSection(section, "")).join("\n\n")}

${addOnText ? `${addOnText}\n\n` : ""}5. Why Atoms Digital Solutions?
• Specialized healthcare marketing experience
• Doctor-focused branding strategy
• Professional content planning
• High-quality creative execution
• Research-backed content ideas
• Consistent visibility strategy
• Dedicated monthly review and support

Important Notes
${buildBulletList(getImportantNotes("doctor"))}

6. Next Steps
We would be happy to understand your specialty, goals, and vision to customize a branding strategy that helps strengthen your digital presence and professional authority.

Conclusion
${contentBlocks.conclusion}

${COMPANY_DETAILS.address}
`.trim();
}

function buildDoctorProposal(data, contentBlocks) {
  if (data.doctorVariant === "content_creation") {
    return buildDoctorContentCreationProposal(data, contentBlocks);
  }

  return buildDoctorPersonalBrandingProposal(data, contentBlocks);
}

function buildSolarContentStrategy() {
  return `
1. Site Visit Vlogs
• Visiting ongoing projects
• Explaining system size
• Why customer installed solar
• Savings breakdown

2. Myth Busting
• Solar works even in the rainy season?
• Do solar panels damage roofs?
• Is subsidy real or fake?

3. Trust & Expertise Building
• Installation process explanation
• Quality and safety standards
• Behind-the-scenes installation workflow
• Electricity bill analysis
• Site inspections
• Customer handovers

4. Founder POV Videos
• Why solar matters
• Market truths
• How to avoid poor-quality vendors
• Choosing the right solar system
`.trim();
}

function buildSolarProposal(data, contentBlocks) {
  const packageData = STANDARD_PACKAGES.solarBusiness;
  const packageSections = packageData.sections || [];

  return `
${getProposalTitle(data)}

Overview
${contentBlocks.overview}

${packageSections
  .map((section, index) => buildSection(section, index + 1))
  .join("\n\n")}

Content Strategy
${buildSolarContentStrategy()}

Investment
${getInvestmentText(data, "Professional Service Fee: ₹40,000 per month + 18% GST")}

Important Notes
${buildBulletList(getImportantNotes("solar"))}

Conclusion
${contentBlocks.conclusion}

${COMPANY_DETAILS.address}
`.trim();
}

function buildFinalProposal(data, contentBlocks) {
  if (data.clientType === "doctor") {
    return buildDoctorProposal(data, contentBlocks);
  }

  if (data.clientType === "solar") {
    return buildSolarProposal(data, contentBlocks);
  }

  return buildHospitalProposal(data, contentBlocks);
}

function getLocalContentBlocks(data) {
  if (data.clientType === "doctor") {
    return {
      overview: `${data.clientName} requires a strong and consistent digital presence to improve trust, visibility, and patient confidence. The focus is to position the doctor as an approachable and reliable medical expert through educational and trust-building content.`,
      contentStrategy: CONTENT_THEMES.doctor,
      expectedResults: [
        "Building doctor authority and professional credibility",
        "Increasing visibility and public awareness",
        "Strengthening patient trust and confidence",
        "Educating the audience through valuable medical content",
        "Creating long-term reputation growth",
      ],
      conclusion: `Atoms Digital Solutions will help ${data.clientName} build a professional and trustworthy digital presence through consistent content, patient education, and personal branding.`,
    };
  }

  if (data.clientType === "solar") {
    return {
      overview: `${data.clientName} can strengthen its digital presence by educating customers about solar benefits, savings, installation process, and long-term value. The focus is to build trust and improve local visibility for solar solutions.`,
      contentStrategy: CONTENT_THEMES.solar,
      expectedResults: [
        "Improved local visibility",
        "Stronger trust through project showcases",
        "Better awareness about solar savings and subsidy",
        "Increased enquiries from homeowners and businesses",
      ],
      conclusion: `Atoms Digital Solutions will position ${data.clientName} as a trusted solar solutions provider through educational content, local visibility, and targeted awareness campaigns.`,
    };
  }

  if (data.hospitalVariant === "blossoms") {
    return {
      overview: `${data.clientName} is a trusted healthcare provider in ${data.city}, known for quality pediatric care. The focus of this proposal is to enhance its digital presence by improving visibility, strengthening patient trust, and ensuring Blossoms remains a preferred choice for families across the region.`,
      contentStrategy: [
        "Child healthcare awareness",
        "Doctor-led content",
        "Patient experiences handled sensitively",
        "Hospital and care environment",
      ],
      expectedResults: [
        "Higher local visibility",
        "Strong brand recall among parents",
        "Improved profile visits and engagement",
        "Increase in indirect enquiries",
      ],
      conclusion: `Our focus is to strengthen ${data.clientName}'s existing reputation by improving visibility, engagement, and digital trust across all platforms.`,
    };
  }

  if (data.hospitalVariant === "trinity") {
    return {
      overview: `As ${data.clientName} strengthens its multi-speciality positioning, the focus of digital marketing is to build strong local visibility, patient trust, and consistent awareness across all departments.`,
      contentStrategy: CONTENT_THEMES.hospital,
      expectedResults: [
        "Improved Google ranking",
        "Better local visibility",
        "Stronger patient trust",
        "Consistent awareness in the target region",
      ],
      conclusion: `Our goal is to position ${data.clientName} as a trusted, visible, and preferred multi-speciality hospital in ${
        data.city || "the target region"
      }.`,
    };
  }

  if (data.hospitalVariant === "aster") {
    return {
      overview: `${data.clientName} is a trusted multi-speciality healthcare institution with strong patient trust and medical infrastructure. This proposal focuses on strengthening its digital healthcare authority through speciality visibility, doctor-led communication, educational content, and consistent digital presence.`,
      contentStrategy: CONTENT_THEMES.hospital,
      expectedResults: [
        "Improved speciality visibility",
        "Higher local discoverability",
        "Stronger patient trust",
        "Better healthcare brand recall",
      ],
      conclusion: `Our objective is to strengthen ${data.clientName}'s digital authority, speciality visibility, and patient trust through structured healthcare communication and consistent brand positioning.`,
    };
  }

  return {
    overview: `${data.clientName} requires a strong healthcare digital presence to improve patient trust, local visibility, and consistent awareness. The focus is to position the hospital as a trusted healthcare brand in ${
      data.city || "the target region"
    }.`,
    contentStrategy: CONTENT_THEMES.hospital,
    expectedResults: [
      "Improved digital visibility",
      "Stronger patient trust",
      "Better awareness across selected platforms",
      "Consistent brand recall",
      "More patient enquiries over time",
    ],
    conclusion: `Atoms Digital Solutions will help ${data.clientName} strengthen digital authority, patient trust, and local visibility through structured healthcare communication and consistent digital presence.`,
  };
}

async function generateContentBlocksWithGemini(data) {
  if (!ai) {
    throw new Error("Gemini API key is missing.");
  }

  const prompt = `
You are a content writer for Atoms Digital Solutions.

Important rules:
- Do NOT generate the full proposal.
- Do NOT decide prices.
- Do NOT create proposal sections.
- Do NOT add extra services.
- Only generate content blocks.
- Return ONLY valid JSON.
- contentStrategy and expectedResults must be arrays, not comma separated text.

Client Data:
Client Type: ${data.clientType}
Client Name: ${data.clientName}
City: ${data.city}
Specialty / Industry: ${data.specialty}
Package Input: ${data.packageText}
Platforms Input: ${data.platformsText}
Add-ons Input: ${data.addOnsText}
Pricing Input: ${data.pricingText}

Return JSON exactly in this format:
{
  "overview": "short professional overview paragraph",
  "contentStrategy": ["point 1", "point 2", "point 3"],
  "expectedResults": ["point 1", "point 2", "point 3"],
  "conclusion": "short professional conclusion paragraph"
}

Tone:
Professional, simple, industry-specific, and similar to Atoms Digital Solutions proposal style.
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const rawText = response.text || "";
  const jsonText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(jsonText);

  return {
    overview: cleanText(parsed.overview),
    contentStrategy: normalizeArray(parsed.contentStrategy),
    expectedResults: normalizeArray(parsed.expectedResults),
    conclusion: cleanText(parsed.conclusion),
  };
}
function getCurrentQuestion(validatedConversation) {
  if (validatedConversation.hasInvalidPlatform) {
    return "TikTok/Snapchat/Telegram are not valid platforms for this proposal. Please provide valid platforms only: Instagram, Facebook, YouTube, Google Business Profile, Website, or WhatsApp.";
  }

  const missingField = validatedConversation.missingFields[0];
  const acceptedAnswers = validatedConversation.acceptedAnswers;
  const clientTypeText = getValidatedAnswer(acceptedAnswers, "clientTypeText");
  const clientType = detectClientType(clientTypeText);

  if (missingField === "clientTypeText") {
    return "Please choose proposal type: Hospital, Doctor, Solar, or Other Business.";
  }

  if (missingField === "clientDetailsText") {
    if (clientType === "doctor") {
      return "Please provide only doctor name, specialty, and city. Example: Dr. Prathyusha, Gynecologist, Vijayawada";
    }

    if (clientType === "solar") {
      return "Please provide only solar business name and city. Example: Solar Energy Solutions, Guntur";
    }

    return "Please provide only hospital name and city. Example: Blossoms Children Hospital, Guntur";
  }

  if (missingField === "packageText") {
    if (clientType === "doctor") {
      return "Please provide only package type. Example: Content Creation Package - 12 reels, 4 posters, ₹40,000/month";
    }

    if (clientType === "solar") {
      return "Please provide only services/package. Example: GMB, Social Media, Meta Ads, Reporting";
    }

    return "Please provide only proposal/package type. Example: Blossoms package - 12 reels, 4 posters";
  }

  if (missingField === "platformsText") {
    return "Please provide only platforms. Example: Instagram, Facebook, YouTube, Google Business Profile";
  }

  if (missingField === "addOnsText") {
    return "Please provide only add-ons. Example: Meta Ads only, WhatsApp Marketing, Basic SEO, or No add-ons";
  }

  if (missingField === "pricingText") {
    return "Please provide only pricing. Example: ₹40,000 service fee, ₹10,000 ad budget separate";
  }

  return "All required details are collected. Please click Generate Proposal Preview.";
}

export async function getGeminiReply(userInput, messages) {
  const validatedConversation = getValidatedConversation(messages);

  if (!validatedConversation.isComplete) {
    return getCurrentQuestion(validatedConversation);
  }

  return "All details are collected. Please click Generate Proposal Preview to create the final proposal.";
}

export async function generateProposalWithGemini(messages) {
  const data = extractProposalData(messages);
  const contentBlocks = await generateContentBlocksWithGemini(data);

  return buildFinalProposal(data, contentBlocks);
}

export function generateLocalProposal(messages) {
  const data = extractProposalData(messages);
  const contentBlocks = getLocalContentBlocks(data);

  return buildFinalProposal(data, contentBlocks);
}

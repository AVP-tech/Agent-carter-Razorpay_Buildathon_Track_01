const PLACEHOLDER_VALUES = [
  "your_openai_api_key_here",
  "yourkey",
  "youropenaikey",
  "your_openai_key",
];

export function hasValidOpenAIKey(apiKey = process.env.OPENAI_API_KEY || "") {
  const normalizedKey = apiKey.trim().toLowerCase();
  return normalizedKey.startsWith("sk-") &&
    normalizedKey.length > 20 &&
    !PLACEHOLDER_VALUES.some((placeholder) => normalizedKey.includes(placeholder));
}
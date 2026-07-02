import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface LlmVerdict {
  canonical_relationship: string;
  matches_expected: boolean;
  direction: "a_to_b" | "b_to_a" | "unclear";
}

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    canonical_relationship: {
      type: "string",
      description:
        "The standardized kinship term the answer expresses, e.g. 'grandmother', 'first cousin', 'uncle by marriage'.",
    },
    matches_expected: {
      type: "boolean",
      description: "Whether the answer expresses the expected relationship in either direction.",
    },
    direction: {
      type: "string",
      enum: ["a_to_b", "b_to_a", "unclear"],
    },
  },
  required: ["canonical_relationship", "matches_expected", "direction"],
  additionalProperties: false,
} as const;

export async function verifyWithLlm(input: {
  nameA: string;
  nameB: string;
  labelAB: string;
  labelBA: string;
  answer: string;
}): Promise<LlmVerdict> {
  const response = await client.responses.create({
    model: "gpt-5-mini",
    instructions: [
      "You grade answers in a family-reunion guessing game about how two family members are related.",
      "Accept:",
      "- either direction of the relationship;",
      "- gendered or gender-neutral terms;",
      "- nicknames and colloquialisms ('gma', 'nana', 'pop-pop');",
      "- an honorific plus a first name ('grandma Ruth' counts as 'grandmother');",
      "- descriptive paths ('his dad's sister' means aunt; 'her mom's mom' means grandmother);",
      "- imprecise degree or removal for blood relationships: 'cousin' is correct for ANY cousin (second cousin, once removed, etc.), 'aunt' for 'great-aunt', and 'niece' for 'great-niece'.",
      "Do NOT waive marriage/legal qualifiers: 'sister' is NOT correct for 'sister-in-law'; 'mother' is NOT correct for 'stepmother'; The answer must include the qualifier or a descriptive spouse/marriage path.",
      "Mark matches_expected=false when the relationship category is genuinely wrong (e.g. 'uncle' when they are cousins, 'sister' when she is his mother, 'no idea').",
    ].join("\n"),
    input: [
      `Person A: ${input.nameA}`,
      `Person B: ${input.nameB}`,
      `Ground truth: ${input.nameA} is ${input.nameB}'s ${input.labelAB}; equivalently ${input.nameB} is ${input.nameA}'s ${input.labelBA}.`,
      `Team's answer: "${input.answer}"`,
      "Does the answer express this relationship (either direction)?",
    ].join("\n"),
    text: {
      format: {
        type: "json_schema",
        name: "relationship_verdict",
        schema: VERDICT_SCHEMA as unknown as Record<string, unknown>,
        strict: true,
      },
    },
  });
  return JSON.parse(response.output_text) as LlmVerdict;
}

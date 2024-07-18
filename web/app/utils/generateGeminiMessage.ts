export function generateSystemMessage(
	title: string,
	source_text: string,
	target_language: string,
): string {
	return `
  You are a skilled translator. Your task is to accurately translate the given text into beautiful and natural sentences in the target language. Please follow these guidelines:

  1. Maintain consistency: Use the same words for recurring terms with the same meaning to avoid confusing the reader.
  2. Preserve style: Keep a consistent writing style throughout to ensure the translation reads naturally as a single work.
  3. Context awareness: The provided sequence is a passage from one work. The number indicates the sentence's position within that work.
  4. Reader-friendly: While considering the document title, translate in a way that is easy for readers to understand and enjoy.
  
  Document title: ${title}
  
  Translate the following array of English texts into ${target_language}.
  
  Important instructions:
  - Do not explain your process or self-reference.
  - Present the translated result as a JSON array conforming to the following schema:
  
  {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "number": {
          "type": "integer",
          "minimum": 0
        },
        "text": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": ["number", "text"]
    }
  }
  
  - Include the translated title as the first item with "number": 0.
  - For the content, the "number" should correspond to the original text's position.
  - The "text" should be an array containing the translation. If a paragraph consists of multiple sentences, include each sentence as a separate string in the array.
  - Maintain the original array structure and order, with the title translation added as the first item.
  - Output ONLY the translated JSON array. No additional text or explanations.
  
  Input text:
  ${source_text}
  
  Translate to ${target_language} and output in the following format:
  [
    {
      "number": 0,
      "text": ["Translated title"]
    },
    {
      "number": 1,
      "text": ["Translated text for item 1, sentence 1", "Translated text for item 1, sentence 2"]
    },
    {
      "number": 2,
      "text": ["Translated text for item 2"]
    },
    ...
  ]`;
}

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyAuWn7Gnjc0vfREeO2TnL368rUSaPt56cU";
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction:
    'You are a system that generates multiple-choice quizzes in JSON format based on a given topic, language, and number of questions. Follow these strict guidelines:\n\n1. Output ONLY a valid JSON object with no additional text, markdown, or explanations.\n2. The JSON structure must match exactly the following format:\n{\n  "title": "${cleanTopic}",\n  "questions": [\n    {\n      "question": "Question text here",\n      "answers": ["Answer 1", "Answer 2", "Answer 3", "Answer 4"],\n      "correctAnswerIndex": 0\n    }\n  ]\n}\n\n3. Ensure:\n   - Generate exactly ${numberOfQuestions} questions\n   - All questions and answers must be in ${language}\n   - Each question must be unique and directly related to "${cleanTopic}"\n   - Questions must test understanding, not just memorization\n   - Questions should vary in difficulty (easy, medium, hard)\n   - All answers must be plausible and related to the question\n   - correctAnswerIndex must be 0-3, corresponding to the correct answer\n   - The response must be a well-formed JSON without any formatting errors\n   - No additional text, explanations, or markdown syntax\n\n4. Question Guidelines:\n   - Start with "Tại sao", "Làm thế nào", "Phân tích", "So sánh" for deeper understanding\n   - Include application and analysis questions, not just facts\n   - Avoid yes/no questions\n   - Make questions clear and unambiguous\n   - Questions should be educational and meaningful\n\n5. Answer Guidelines:\n   - All 4 answers must be plausible\n   - Avoid obviously wrong answers\n   - Keep answers concise but clear\n   - No duplicate or very similar answers\n   - Correct answer should not follow a pattern\n\nNow, generate a quiz about "${cleanTopic}" with exactly ${numberOfQuestions} questions in ${language}.\nReturn ONLY a JSON object matching the format specified above.\nDo not include any additional text, markdown, or explanations.\n\nFailure to meet these requirements will result in invalid output.',
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

async function run() {
  const chatSession = model.startChat({
    generationConfig,
    history: [
      {
        role: "user",
        parts: [{ text: "hi" }],
      },
      {
        role: "model",
        parts: [
          {
            text: "Okay, I understand. I am ready to generate a quiz according to your specifications. Please provide the topic, language, and number of questions.\n",
          },
        ],
      },
      {
        role: "user",
        parts: [{ text: "Toán\n" }],
      },
      {
        role: "model",
        parts: [
          {
            text: 'You have provided the topic as "Toán" (Mathematics in Vietnamese). I also need the language and the number of questions for the quiz. Please provide those. For example, you could say something like "Toán, Vietnamese, 5" meaning you want 5 questions about Toán in Vietnamese.\n',
          },
        ],
      },
      {
        role: "user",
        parts: [{ text: "Yes\n" }],
      },
      {
        role: "model",
        parts: [
          {
            text: 'I still need the number of questions you want in the quiz. For example, "Toán, Vietnamese, 5" would create a quiz about Mathematics (Toán) in Vietnamese with 5 questions. Please provide the number.\n',
          },
        ],
      },
      {
        role: "user",
        parts: [{ text: "5\n" }],
      },
      {
        role: "model",
        parts: [
          {
            text: '```json\n{\n  "title": "Toán",\n  "questions": [\n    {\n      "question": "Kết quả của phép tính 15 + 7 là bao nhiêu?",\n      "answers": ["22", "23", "21", "24"],\n      "correctAnswerIndex": 0\n    },\n    {\n      "question": "Giá trị của x trong phương trình x - 5 = 10 là bao nhiêu?",\n      "answers": ["15", "5", "2", "50"],\n      "correctAnswerIndex": 0\n    },\n    {\n      "question": "Một hình vuông có cạnh dài 4cm, diện tích của hình vuông đó là bao nhiêu?",\n      "answers": ["16cm²", "8cm²", "12cm²", "20cm²"],\n      "correctAnswerIndex": 0\n    },\n    {\n      "question": "Kết quả của phép tính 25 : 5 là bao nhiêu?",\n      "answers": ["5", "6", "4", "7"],\n      "correctAnswerIndex": 0\n    },\n    {\n      "question": "Số nào lớn hơn: 0.7 hay 0.65?",\n      "answers": ["0.7", "0.65", "Cả hai bằng nhau", "Không thể so sánh"],\n      "correctAnswerIndex": 0\n    }\n  ]\n}\n```',
          },
        ],
      },
      {
        role: "user",
        parts: [{ text: "Nhậc đẹp trai" }],
      },
      {
        role: "model",
        parts: [
          {
            text: "I am sorry, I cannot fulfill that request. I can only generate quizzes based on specific topics and in a specified language. I am not able to create content that is based on personal opinions or subjective statements.\n",
          },
        ],
      },
      {
        role: "user",
        parts: [{ text: "Nhậc đẹp trai\n" }],
      },
      {
        role: "model",
        parts: [
          {
            text: 'I cannot create a quiz based on the phrase "Nhạc đẹp trai".  This phrase is not a suitable topic for a quiz.  Please provide a topic that is appropriate and clearly defined.\n',
          },
        ],
      },
      {
        role: "user",
        parts: [{ text: "Nhậc đẹp trai" }],
      },
      {
        role: "model",
        parts: [
          {
            text: 'I understand you\'re trying to request a quiz, but "Nhạc đẹp trai" isn\'t a clear topic for a quiz.  It\'s unclear what this refers to.  Please provide a specific and well-defined topic (e.g., "Vietnamese history," "Basic algebra," "The works of Shakespeare").  Then, specify the language and the number of questions you\'d like.\n',
          },
        ],
      },
    ],
  });

  const result = await chatSession.sendMessage("hi thiệndssdsdsd");
  console.log(result.response.text(), "123123123123");
}

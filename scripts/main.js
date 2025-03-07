const GEMINI_API_KEY = "AIzaSyAuWn7Gnjc0vfREeO2TnL368rUSaPt56cU"; // Thay bằng khóa thật

const topicInput = document.getElementById("topic-input");
const generateButton = document.getElementById("generate-quiz");
const quizSection = document.getElementById("quiz-section");
const quizForm = document.getElementById("quiz-form");
const submitButton = document.getElementById("submit-quiz");
const resultSection = document.getElementById("result-section");

// Thêm biến để theo dõi câu hỏi hiện tại
let currentQuestionIndex = 0;

generateButton.addEventListener("click", async () => {
  const topic = topicInput.value.trim();
  if (!topic) return alert("Vui lòng nhập chủ đề!");

  // Thêm loading state
  generateButton.disabled = true;
  generateButton.textContent = "Đang tạo quiz...";

  try {
    const quiz = await fetchQuizFromGemini(topic);
    if (quiz) {
      currentQuestionIndex = 0; // Reset về câu đầu tiên
      localStorage.removeItem("quizAnswers"); // Xóa câu trả lời cũ
      renderQuiz(quiz, quizForm);
      quizSection.classList.remove("hidden");
      resultSection.classList.add("hidden");
      localStorage.setItem("currentQuiz", JSON.stringify(quiz));
    }
  } catch (error) {
    alert("Có lỗi xảy ra khi tạo quiz. Vui lòng thử lại!");
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "Tạo Quiz";
  }
});

submitButton.addEventListener("click", () => {
  const score = calculateScore(quizForm);
  resultSection.textContent = `Bạn được ${score} điểm!`;
  resultSection.classList.remove("hidden");

  localStorage.removeItem("currentQuiz");
});

async function fetchQuizFromGemini(topic) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Generate a quiz about "${topic}". Return ONLY a JSON object in this EXACT format, with NO additional text or markdown:
{
  "title": "${topic}",
  "questions": [
    {
      "question": "Question text here",
      "answers": ["Answer 1", "Answer 2", "Answer 3", "Answer 4"],
      "correctAnswerIndex": 0
    }
  ]
}

Requirements:
- Create exactly 10 questions
- correctAnswerIndex must be 0-3
- DO NOT include \`\`\` or any markdown
- DO NOT add any explanation text
- Response must be valid JSON`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const textResult = data.candidates[0].content.parts[0].text;
      console.log("Raw API response:", textResult); // Debug log
      return parseQuizJSON(textResult);
    } else {
      console.error("Invalid API response structure:", data);
      return null;
    }
  } catch (error) {
    console.error("API call error:", error);
    return null;
  }
}

function parseQuizJSON(text) {
  try {
    // Debug log để xem dữ liệu thô
    console.log("Raw text received:", text);

    // Tìm và trích xuất phần JSON từ response
    let jsonText = text;

    // Xóa markdown code blocks nếu có
    if (text.includes("```")) {
      const matches = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (matches && matches[1]) {
        jsonText = matches[1];
      }
    }

    // Xóa khoảng trắng và ký tự đặc biệt ở đầu/cuối
    jsonText = jsonText.trim();

    // Debug log sau khi xử lý
    console.log("Cleaned JSON text:", jsonText);

    // Parse JSON
    const quizData = JSON.parse(jsonText);

    // Validate cấu trúc dữ liệu
    if (!quizData.title || !Array.isArray(quizData.questions)) {
      throw new Error("Invalid quiz data structure");
    }

    quizData.questions.forEach((q, index) => {
      if (
        !q.question ||
        !Array.isArray(q.answers) ||
        q.answers.length !== 4 ||
        typeof q.correctAnswerIndex !== "number"
      ) {
        throw new Error(`Invalid question format at index ${index}`);
      }
    });

    return {
      id: Date.now(),
      ...quizData,
      status: "incomplete",
    };
  } catch (error) {
    console.error("Lỗi parse JSON:", error);
    console.log("Attempted to parse text:", text);
    return null;
  }
}

function renderQuiz(quiz, container) {
  container.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold mb-2">${quiz.title}</h2>
      <p class="text-gray-600">Câu hỏi ${currentQuestionIndex + 1}/${
    quiz.questions.length
  }</p>
    </div>
    
    <div class="space-y-6">
      <div class="p-4 bg-gray-50 rounded-lg question-card">
        <p class="font-semibold mb-3 text-lg">
          <span class="text-blue-600">Câu ${currentQuestionIndex + 1}:</span> 
          ${quiz.questions[currentQuestionIndex].question}
        </p>
        
        <div class="ml-4 space-y-2">
          ${quiz.questions[currentQuestionIndex].answers
            .map(
              (answer, ansIndex) => `
            <label class="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
              <input type="radio" 
                name="q${currentQuestionIndex}" 
                value="${ansIndex}"
                class="w-4 h-4 text-blue-600"
                onchange="updateProgress()"
              >
              <span class="ml-2">${answer}</span>
            </label>
          `
            )
            .join("")}
        </div>
      </div>
    </div>
    
    <div class="mt-6 flex justify-between items-center">
      <div class="flex gap-2">
        <button id="prevQuestion" 
          class="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          ${currentQuestionIndex === 0 ? "disabled" : ""}>
          Câu trước
        </button>
        <button id="nextQuestion" 
          class="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          ${
            currentQuestionIndex === quiz.questions.length - 1 ? "disabled" : ""
          }>
          Câu tiếp
        </button>
      </div>
      <div class="progress-bar w-64 h-2 bg-gray-200 rounded-full">
        <div id="progress" class="h-full bg-blue-600 rounded-full" 
          style="width: ${
            ((currentQuestionIndex + 1) / quiz.questions.length) * 100
          }%">
        </div>
      </div>
    </div>
  `;

  // Thêm event listeners cho nút điều hướng
  const prevButton = document.getElementById("prevQuestion");
  const nextButton = document.getElementById("nextQuestion");

  prevButton.addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderQuiz(quiz, container);
      // Khôi phục câu trả lời đã chọn (nếu có)
      restoreAnswer(currentQuestionIndex);
    }
  });

  nextButton.addEventListener("click", () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      currentQuestionIndex++;
      renderQuiz(quiz, container);
      // Khôi phục câu trả lời đã chọn (nếu có)
      restoreAnswer(currentQuestionIndex);
    }
  });

  // Khôi phục câu trả lời hiện tại (nếu có)
  restoreAnswer(currentQuestionIndex);

  // Cập nhật nút Submit
  updateSubmitButton(quiz);
}

// Thêm hàm để lưu câu trả lời
function saveAnswer(questionIndex, answerIndex) {
  const answers = JSON.parse(localStorage.getItem("quizAnswers") || "{}");
  answers[questionIndex] = answerIndex;
  localStorage.setItem("quizAnswers", JSON.stringify(answers));
}

// Thêm hàm để khôi phục câu trả lời
function restoreAnswer(questionIndex) {
  const answers = JSON.parse(localStorage.getItem("quizAnswers") || "{}");
  const savedAnswer = answers[questionIndex];
  if (savedAnswer !== undefined) {
    const radio = document.querySelector(
      `input[name="q${questionIndex}"][value="${savedAnswer}"]`
    );
    if (radio) radio.checked = true;
  }
}

// Cập nhật hàm updateProgress
function updateProgress() {
  const currentRadios = document.querySelectorAll(
    `input[name="q${currentQuestionIndex}"]`
  );
  const selectedAnswer = Array.from(currentRadios).findIndex(
    (radio) => radio.checked
  );

  if (selectedAnswer !== -1) {
    saveAnswer(currentQuestionIndex, selectedAnswer);
  }

  // Kiểm tra xem đã trả lời hết các câu chưa
  const answers = JSON.parse(localStorage.getItem("quizAnswers") || "{}");
  const answeredCount = Object.keys(answers).length;
  const quiz = JSON.parse(localStorage.getItem("currentQuiz"));

  document.getElementById("submit-quiz").disabled =
    answeredCount < quiz.questions.length;
}

// Thêm hàm để cập nhật trạng thái nút Submit
function updateSubmitButton(quiz) {
  const answers = JSON.parse(localStorage.getItem("quizAnswers") || "{}");
  const answeredCount = Object.keys(answers).length;
  document.getElementById("submit-quiz").disabled =
    answeredCount < quiz.questions.length;
}

// Cập nhật calculateScore để hiển thị kết quả chi tiết
function calculateScore(form) {
  const data = new FormData(form);
  let score = 0;
  const quiz = JSON.parse(localStorage.getItem("currentQuiz"));
  let results = [];

  quiz.questions.forEach((q, index) => {
    const answer = parseInt(data.get(`q${index}`));
    const isCorrect = answer === q.correctAnswerIndex;
    if (isCorrect) score++;

    results.push({
      question: q.question,
      userAnswer: q.answers[answer],
      correctAnswer: q.answers[q.correctAnswerIndex],
      isCorrect,
    });
  });

  // Hiển thị kết quả chi tiết
  resultSection.innerHTML = `
    <div class="space-y-4">
      <h3 class="text-xl font-bold">
        Kết quả: ${score}/${quiz.questions.length} câu đúng
      </h3>
      <div class="h-2 bg-gray-200 rounded-full">
        <div class="h-full bg-green-600 rounded-full" 
             style="width: ${(score / quiz.questions.length) * 100}%">
        </div>
      </div>
      <div class="mt-4 space-y-3">
        ${results
          .map(
            (result, index) => `
          <div class="p-3 ${
            result.isCorrect ? "bg-green-50" : "bg-red-50"
          } rounded">
            <p class="font-medium">Câu ${index + 1}: ${result.question}</p>
            <p class="text-sm mt-1">
              ${
                result.isCorrect
                  ? `<span class="text-green-600">✓ Đúng!</span>`
                  : `<span class="text-red-600">✗ Sai. Đáp án đúng: ${result.correctAnswer}</span>`
              }
            </p>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  return score;
}

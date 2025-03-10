import QuizStorage from "./storage.js";

const GEMINI_API_KEY = "AIzaSyAuWn7Gnjc0vfREeO2TnL368rUSaPt56cU"; // Thay bằng khóa thật

const topicInput = document.getElementById("topic-input");
const generateButton = document.getElementById("generate-quiz");
const quizSection = document.getElementById("quiz-section");
const quizForm = document.getElementById("quiz-form");
const submitButton = document.getElementById("submit-quiz");
const resultSection = document.getElementById("result-section");

// Thêm biến để theo dõi câu hỏi hiện tại
let currentQuestionIndex = 0;

// Thêm biến cho dropdown
const questionCountSelect = document.getElementById("question-count");

// Thêm hàm hiển thị popup thông báo
function showAlert(message) {
  const alertPopup = document.getElementById("alertPopup");
  const alertMessage = document.getElementById("alertMessage");
  const alertOkBtn = document.getElementById("alertOkBtn");

  alertMessage.textContent = message;
  alertPopup.classList.remove("hidden");

  // Xử lý nút OK
  alertOkBtn.onclick = () => {
    alertPopup.classList.add("hidden");
  };
}

// Thêm hàm showPopup vào đầu file
function showPopup(type, topic) {
  const confirmPopup = document.getElementById("confirmPopup");
  const popupTitle = document.getElementById("popupTitle");
  const popupMessage = document.getElementById("popupMessage");
  const yesBtn = document.getElementById("yesBtn");
  const noBtn = document.getElementById("noBtn");

  if (type === "start") {
    const numberOfQuestions = questionCountSelect.value;
    popupTitle.textContent = "Xác nhận bắt đầu quiz";
    popupMessage.textContent = `Bạn có chắc chắn muốn bắt đầu quiz với ${numberOfQuestions} câu hỏi không?`;
  }

  confirmPopup.classList.remove("hidden");

  // Xử lý nút No
  noBtn.onclick = () => {
    confirmPopup.classList.add("hidden");
  };

  // Xử lý nút Yes
  yesBtn.onclick = async () => {
    confirmPopup.classList.add("hidden");
    document.getElementById("loading").classList.remove("hidden");

    try {
      const quiz = await fetchQuizFromGemini(topic);
      if (quiz) {
        currentQuestionIndex = 0;
        localStorage.removeItem("quizAnswers");
        renderQuiz(quiz, quizForm);
        quizSection.classList.remove("hidden");
        resultSection.classList.add("hidden");
        QuizStorage.saveCurrentQuiz(quiz, topic);
      }
    } catch (error) {
      showAlert("Có lỗi xảy ra khi tạo quiz. Vui lòng thử lại!");
    } finally {
      document.getElementById("loading").classList.add("hidden");
      generateButton.disabled = false;
      generateButton.textContent = "Start Quiz";
    }
  };
}

// Xóa event listener cũ của generateButton và thay thế bằng code mới
generateButton.removeEventListener("click", async () => {});

generateButton.addEventListener("click", () => {
  const topic = topicInput.value.trim();
  if (!topic) {
    showAlert("Vui lòng nhập chủ đề!");
    return;
  }

  if (!questionCountSelect.value) {
    showAlert("Vui lòng chọn số câu hỏi!");
    return;
  }

  showPopup("start", topic);
});

submitButton.addEventListener("click", () => {
  const score = calculateScore(quizForm);
  resultSection.textContent = `Bạn được ${score} điểm!`;
  resultSection.classList.remove("hidden");

  const topic = topicInput.value.trim();
  QuizStorage.saveQuizHistory(topic, score);
  QuizStorage.clearCurrentQuiz();

  // Display full application state after submission
  QuizStorage.displayAll();
});

async function fetchQuizFromGemini(topic) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  // Lấy số câu hỏi từ dropdown
  const numberOfQuestions = parseInt(questionCountSelect.value);
  let language = "Vietnamese"; // Mặc định tiếng Việt

  // Phân tích ngôn ngữ từ input (nếu có)
  if (
    topic.toLowerCase().includes("english") ||
    topic.toLowerCase().includes("eng")
  ) {
    language = "English";
    topic = topic.replace(/english|eng/gi, "").trim();
  }

  const prompt = `Generate a quiz with ${numberOfQuestions} multiple choice questions about "${topic}" in ${language}. 
Return ONLY a JSON object in this EXACT format, with NO additional text or markdown:
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
- Create exactly ${numberOfQuestions} questions
- Questions and answers must be in ${language}
- correctAnswerIndex must be 0-3
- DO NOT include \`\`\` or any markdown
- DO NOT add any explanation text
- Response must be valid JSON
- Each question must be unique and relevant to the topic`;

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
      console.log("Raw API response:", textResult);
      return parseQuizJSON(textResult);
    } else {
      console.error("Invalid API response structure:", data);
      showAlert("Không thể tạo quiz. Vui lòng thử lại sau!");
      return null;
    }
  } catch (error) {
    console.error("API call error:", error);
    showAlert("Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại!");
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

// Đầu tiên, đưa hàm updateProgress vào global scope
window.updateProgress = function () {
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
};

// Sửa lại phần renderQuiz để sử dụng addEventListener thay vì inline handler
function renderQuiz(quiz, container) {
  container.innerHTML = `
    <form id="quiz-form" onsubmit="event.preventDefault();" class="quiz-container bg-gray-800 rounded-lg p-6">
      <div class="mb-4 text-white">
        Question ${currentQuestionIndex + 1}/${quiz.questions.length}
      </div>
      
      <div class="question-text text-white mb-6">
        ${quiz.questions[currentQuestionIndex].question}
      </div>
      
      <div class="answers-container space-y-4">
        ${quiz.questions[currentQuestionIndex].answers
          .map(
            (answer, ansIndex) => `
            <div class="answer-option">
              <input type="radio" 
                id="answer${ansIndex}" 
                name="q${currentQuestionIndex}" 
                value="${ansIndex}" 
                class="hidden"
              >
              <label for="answer${ansIndex}" 
                class="answer-button w-full text-left py-3 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 transition-all duration-200 text-white cursor-pointer block">
                ${String.fromCharCode(65 + ansIndex)}. ${answer}
              </label>
            </div>
          `
          )
          .join("")}
      </div>
      
      <div class="flex justify-between mt-6">
        <button type="button" id="nextQuestion" 
          class="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-all duration-200"
          ${
            currentQuestionIndex === quiz.questions.length - 1 ? "disabled" : ""
          }>
          Next
        </button>
        <button type="button" id="submit-quiz"
          class="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-all duration-200">
          Nộp bài
        </button>
      </div>
    </form>
  `;

  // Thêm style vào head
  if (!document.getElementById("quiz-styles")) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "quiz-styles";
    styleSheet.textContent = `
      .answer-button {
        position: relative;
        overflow: hidden;
      }
      
      input[type="radio"]:checked + .answer-button {
        background-color: #22c55e !important;
      }
      
      .answer-button:hover {
        transform: translateY(-2px);
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // Xử lý sự kiện change cho radio buttons
  const radioButtons = container.querySelectorAll('input[type="radio"]');
  radioButtons.forEach((radio) => {
    radio.addEventListener("change", () => {
      const answerIndex = parseInt(radio.value);
      saveAnswer(currentQuestionIndex, answerIndex);
      updateSubmitButton(quiz);
    });
  });

  // Xử lý nút Next
  const nextButton = document.getElementById("nextQuestion");
  nextButton.addEventListener("click", () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      currentQuestionIndex++;
      renderQuiz(quiz, container);
      restoreAnswer(currentQuestionIndex);
    }
  });

  // Khôi phục câu trả lời đã chọn (nếu có)
  restoreAnswer(currentQuestionIndex);

  // Cập nhật trạng thái nút Submit
  updateSubmitButton(quiz);

  // Thêm event listener cho nút nộp bài
  const submitButton = document.getElementById("submit-quiz");
  submitButton.addEventListener("click", () => {
    // Hiển thị popup xác nhận nộp bài
    const confirmPopup = document.getElementById("confirmPopup");
    const popupTitle = document.getElementById("popupTitle");
    const popupMessage = document.getElementById("popupMessage");
    const yesBtn = document.getElementById("yesBtn");
    const noBtn = document.getElementById("noBtn");

    popupTitle.textContent = "Xác nhận nộp bài";
    popupMessage.textContent = "Bạn có chắc chắn muốn nộp bài không?";
    confirmPopup.classList.remove("hidden");

    // Xử lý nút No
    noBtn.onclick = () => {
      confirmPopup.classList.add("hidden");
    };

    // Xử lý nút Yes
    yesBtn.onclick = () => {
      confirmPopup.classList.add("hidden");
      submitQuiz(quiz);
    };
  });
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
    if (radio) {
      radio.checked = true;
    }
  }
}

// Thêm hàm để cập nhật trạng thái nút Submit
function updateSubmitButton(quiz) {
  const answers = JSON.parse(localStorage.getItem("quizAnswers") || "{}");
  const answeredCount = Object.keys(answers).length;
  const submitButton = document.getElementById("submit-quiz");
  if (submitButton) {
    submitButton.disabled = answeredCount < quiz.questions.length;
    if (submitButton.disabled) {
      submitButton.classList.add("opacity-50", "cursor-not-allowed");
    } else {
      submitButton.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }
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

// Thêm hàm mới để xử lý việc nộp bài
function submitQuiz(quiz) {
  const answers = JSON.parse(localStorage.getItem("quizAnswers") || "{}");
  let score = 0;
  let results = [];

  quiz.questions.forEach((q, index) => {
    const userAnswer = answers[index];
    const isCorrect = userAnswer === q.correctAnswerIndex;
    if (isCorrect) score++;

    results.push({
      question: q.question,
      userAnswer: q.answers[userAnswer],
      correctAnswer: q.answers[q.correctAnswerIndex],
      isCorrect,
    });
  });

  // Hiển thị kết quả
  const resultSection = document.getElementById("result-section");
  resultSection.classList.remove("hidden");
  document.getElementById("quiz-section").classList.add("hidden");

  resultSection.innerHTML = `
    <div class="bg-gray-800 rounded-lg p-6 text-white">
      <h2 class="text-2xl font-bold mb-4">Kết quả Quiz</h2>
      <div class="mb-6">
        <p class="text-xl">Điểm của bạn: ${score}/${quiz.questions.length}</p>
        <div class="w-full h-2 bg-gray-200 rounded-full mt-2">
          <div class="h-full bg-green-500 rounded-full" style="width: ${
            (score / quiz.questions.length) * 100
          }%"></div>
        </div>
      </div>
      <div class="space-y-4">
        ${results
          .map(
            (result, index) => `
          <div class="p-4 rounded-lg ${
            result.isCorrect ? "bg-green-500/20" : "bg-red-500/20"
          }">
            <p class="font-bold">Câu ${index + 1}: ${result.question}</p>
            <p class="mt-2">
              <span class="font-semibold">Câu trả lời của bạn:</span> 
              ${result.userAnswer}
              ${
                result.isCorrect
                  ? '<span class="text-green-400 ml-2">✓</span>'
                  : `<span class="text-red-400 ml-2">✗</span><br>
                   <span class="font-semibold">Đáp án đúng:</span> ${result.correctAnswer}`
              }
            </p>
          </div>
        `
          )
          .join("")}
      </div>
      <button 
        onclick="location.reload()" 
        class="mt-6 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200">
        Làm lại bài test
      </button>
    </div>
  `;

  // Lưu lịch sử
  const topic = document.getElementById("topic-input").value.trim();
  QuizStorage.saveQuizHistory(topic, score);
  QuizStorage.clearCurrentQuiz();
}

// Thêm hàm helper để xác định ngôn ngữ
function detectLanguage(topic) {
  const englishKeywords = ["english", "eng"];
  const vietnameseKeywords = ["vietnamese", "viet"];

  const lowercaseTopic = topic.toLowerCase();

  if (englishKeywords.some((keyword) => lowercaseTopic.includes(keyword))) {
    return "English";
  } else if (
    vietnameseKeywords.some((keyword) => lowercaseTopic.includes(keyword))
  ) {
    return "Vietnamese";
  }

  return "Vietnamese"; // Mặc định là tiếng Việt
}

// Cập nhật placeholder cho input
document.addEventListener("DOMContentLoaded", () => {
  const topicInput = document.getElementById("topic-input");
  topicInput.placeholder = "Nhập chủ đề (thêm 'English' cho câu hỏi tiếng Anh)";
});

// Đảm bảo chỉ có một DOMContentLoaded event listener
const initApp = () => {
  console.log("Quiz Application Started");
  QuizStorage.displayAll();

  // Khôi phục số câu hỏi đã chọn trước đó (nếu có)
  const savedQuestionCount = localStorage.getItem("preferredQuestionCount");
  if (savedQuestionCount) {
    questionCountSelect.value = savedQuestionCount;
  }

  // Lưu số câu hỏi được chọn
  questionCountSelect.addEventListener("change", () => {
    localStorage.setItem("preferredQuestionCount", questionCountSelect.value);
  });

  const history = QuizStorage.getQuizHistory();
  if (history.length > 0) {
    console.group("Quiz History");
    history.forEach((entry, index) => {
      console.log(`${index + 1}. Topic: ${entry.topic}`);
      console.log(`   Score: ${entry.score}`);
      console.log(`   Date: ${new Date(entry.date).toLocaleString()}`);
    });
    console.groupEnd();
  } else {
    console.log("This quiz don't have localStorage before");
  }
};

// Xóa các event listener DOMContentLoaded cũ
document.removeEventListener("DOMContentLoaded", () => {});
document.addEventListener("DOMContentLoaded", initApp, { once: true });

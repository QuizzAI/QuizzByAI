import QuizStorage from "./storage.js";

const GEMINI_API_KEY = "AIzaSyAuWn7Gnjc0vfREeO2TnL368rUSaPt56cU"; // Thay bằng khóa thật

const topicInput = document.getElementById("topic-input");
const generateButton = document.getElementById("generate-quiz");
const quizSection = document.getElementById("quiz-section");
const quizForm = document.getElementById("quiz-form");
const submitButton = document.getElementById("submit-quiz");
const resultSection = document.getElementById("result-section");
const historyButton = document.getElementById("historyBtn");

let currentQuestionIndex = 0; // Declare currentQuestionIndex

generateButton.addEventListener("click", async () => {
  const topic = topicInput.value.trim();
  if (!topic) return alert("Vui lòng nhập chủ đề!");

  generateButton.disabled = true;
  generateButton.textContent = "Đang tạo quiz...";

  try {
    const quiz = await fetchQuizFromGemini(topic);
    if (quiz) {
      currentQuestionIndex = 0;
      localStorage.removeItem("quizAnswers");
      localStorage.removeItem("currentQuiz"); // Clear current quiz data
      renderQuiz(quiz, quizForm);
      quizSection.classList.remove("hidden");
      resultSection.classList.add("hidden");
      QuizStorage.saveCurrentQuiz(quiz, topic, currentQuestionIndex); // Pass currentQuestionIndex
    }
  } catch (error) {
    console.error("Error fetching quiz:", error); // Log the error
    console.error("Error details:", error.message, error.stack);
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

  const topic = topicInput.value.trim();
  QuizStorage.saveQuizHistory(topic, score);
  QuizStorage.clearCurrentQuiz();
  
  // Display full application state after submission
  QuizStorage.displayAll();
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
    console.log("Full API response:", data); // Log full response

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
    console.log("Raw text received:", text);

    let jsonText = text;

    if (text.includes("```")) {
      const matches = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (matches && matches[1]) {
        jsonText = matches[1];
      }
    }

    jsonText = jsonText.trim();
    console.log("Cleaned JSON text:", jsonText);

    let quizData;
    try {
      quizData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      return null;
    }

    if (!quizData.title) {
      console.error("Missing quiz title");
      return null;
    }
    if (!Array.isArray(quizData.questions)) {
      console.error("Missing or invalid questions array");
      return null;
    }

    quizData.questions.forEach((q, index) => {
      if (
        !q.question ||
        !Array.isArray(q.answers) ||
        q.answers.length !== 4 ||
        typeof q.correctAnswerIndex !== "number"
      ) {
        console.error(`Invalid question format at index ${index}`);
        return null;
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
  console.log("Rendering quiz with data:", JSON.stringify(quiz, null, 2));
  
  // Basic validation
  if (!quiz) {
    console.error("Quiz data is undefined or null");
    return;
  }
  
  // It appears quiz.questions might be an object containing the actual quiz
  if (quiz.questions && !Array.isArray(quiz.questions) && quiz.questions.questions && Array.isArray(quiz.questions.questions)) {
    console.log("Detected nested quiz structure, extracting inner quiz");
    quiz = quiz.questions; // Extract the inner quiz object
    console.log("Using extracted quiz:", JSON.stringify(quiz, null, 2));
  }
  
  // Check if quiz.questions exists
  if (!quiz.questions) {
    console.error("Quiz questions are undefined");
    return;
  }
  
  // This might be the issue - let's handle different structures
  if (!Array.isArray(quiz.questions)) {
    console.error("Quiz questions is not an array:", typeof quiz.questions);
    
    // Try to handle common issues
    if (typeof quiz.questions === 'string') {
      try {
        // Maybe it's a stringified JSON array
        const parsed = JSON.parse(quiz.questions);
        if (Array.isArray(parsed)) {
          console.log("Parsed string into array");
          quiz.questions = parsed;
        } else {
          console.error("Parsed string but result is not an array");
          return;
        }
      } catch (error) {
        console.error("Failed to parse questions string:", error);
        return;
      }
    } else if (quiz.questions && typeof quiz.questions === 'object') {
      // Check if it has numeric keys (like an array-like object)
      const keys = Object.keys(quiz.questions);
      if (keys.every(key => !isNaN(parseInt(key))) && keys.length > 0) {
        // Convert object with numeric keys to array
        const tempArray = [];
        keys.sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
          tempArray.push(quiz.questions[key]);
        });
        console.log("Converted object with numeric keys to array");
        quiz.questions = tempArray;
      } else {
        // Last resort: check if it has a property that's an array of questions
        for (const key in quiz.questions) {
          if (Array.isArray(quiz.questions[key])) {
            console.log(`Found array in property ${key}, using it as questions`);
            quiz.questions = quiz.questions[key];
            break;
          }
        }
        
        if (!Array.isArray(quiz.questions)) {
          console.error("Could not convert questions to array");
          return;
        }
      }
    } else {
      console.error("Cannot process quiz questions type:", typeof quiz.questions);
      return;
    }
  }
  
  if (quiz.questions.length === 0) {
    console.error("Quiz questions array is empty");
    return;
  }

  // Validate and correct currentQuestionIndex
  if (typeof currentQuestionIndex !== 'number') {
    console.warn("currentQuestionIndex is not a number, resetting to 0");
    currentQuestionIndex = 0;
  }
  
  if (currentQuestionIndex < 0) {
    console.warn("currentQuestionIndex is negative, resetting to 0");
    currentQuestionIndex = 0;
  }
  
  if (currentQuestionIndex >= quiz.questions.length) {
    console.warn(`currentQuestionIndex (${currentQuestionIndex}) is out of bounds, setting to last question`);
    currentQuestionIndex = quiz.questions.length - 1;
  }

  // Get current question
  const currentQuestion = quiz.questions[currentQuestionIndex];
  console.log("Current question:", currentQuestion);
  
  // Validate current question
  if (!currentQuestion) {
    console.error("Current question is undefined");
    return;
  }
  
  // Check if we're using the right property names
  const questionText = currentQuestion.question || currentQuestion.text || "";
  const questionAnswers = currentQuestion.answers || currentQuestion.options || [];
  
  if (!questionText) {
    console.warn("Question text is missing for question", currentQuestionIndex);
  }
  
  if (!Array.isArray(questionAnswers) || questionAnswers.length === 0) {
    console.warn("Question answers are missing or invalid for question", currentQuestionIndex);
  }

  // Render the quiz
  container.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold mb-2">${quiz.title || "Quiz"}</h2>
      <p class="text-gray-600">Câu hỏi ${currentQuestionIndex + 1}/${quiz.questions.length}</p>
    </div>
    
    <div class="space-y-6">
      <div class="p-4 bg-gray-50 rounded-lg question-card">
        <p class="font-semibold mb-3 text-lg">
          <span class="text-blue-600">Câu ${currentQuestionIndex + 1}:</span> 
          ${questionText}
        </p>
        
        <div class="ml-4 space-y-2">
          ${questionAnswers
            .map(
              (answer, ansIndex) => `
            <label class="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
              <input type="radio" 
                name="q${currentQuestionIndex}" 
                value="${ansIndex}"
                class="w-4 h-4 text-blue-600 answer-radio"
              >
              <span class="ml-2">${answer || `Option ${ansIndex + 1}`}</span>
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
          ${currentQuestionIndex === quiz.questions.length - 1 ? "disabled" : ""}>
          Câu tiếp
        </button>
      </div>
      <div class="progress-bar w-64 h-2 bg-gray-200 rounded-full">
        <div id="progress" class="h-full bg-blue-600 rounded-full" 
          style="width: ${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%">
        </div>
      </div>
    </div>
  `;

  // Add event listeners and finish rendering as before
  try {
    // Add event listeners to all radio buttons
    const radioButtons = container.querySelectorAll(".answer-radio");
    radioButtons.forEach((radio) => {
      radio.addEventListener("change", updateProgress);
    });

    // Add event listeners for navigation buttons
    const prevButton = document.getElementById("prevQuestion");
    const nextButton = document.getElementById("nextQuestion");

    if (prevButton) {
      prevButton.addEventListener("click", () => {
        if (currentQuestionIndex > 0) {
          currentQuestionIndex--;
          // Save current state in QuizStorage
          if (quiz) {
            QuizStorage.saveCurrentQuiz(quiz, quiz.title || topicInput.value, currentQuestionIndex);
          }
          renderQuiz(quiz, container);
          // Restore selected answer (if any)
          restoreAnswer(currentQuestionIndex);
        }
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
          currentQuestionIndex++;
          // Save current state in QuizStorage
          if (quiz) {
            QuizStorage.saveCurrentQuiz(quiz, quiz.title || topicInput.value, currentQuestionIndex);
          }
          renderQuiz(quiz, container);
          // Restore selected answer (if any)
          restoreAnswer(currentQuestionIndex);
        }
      });
    }

    // Restore current answer (if any)
    restoreAnswer(currentQuestionIndex);

    // Update submit button state
    updateSubmitButton(quiz);

    // Load draft answers
    QuizStorage.loadQuizDraft();
    
    console.log("Quiz rendered successfully:", currentQuestionIndex + 1, "of", quiz.questions.length);
  } catch (error) {
    console.error("Error adding event listeners:", error);
  }
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
    QuizStorage.saveDraftAnswer(`q${currentQuestionIndex}`, selectedAnswer);
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
          <div class="p-3 ${result.isCorrect ? "bg-green-50" : "bg-red-50"} rounded">
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

// Add DOMContentLoaded event listener to display initial state
document.addEventListener("DOMContentLoaded", () => {
  console.log('Quiz Application Started');
  const currentQuiz = QuizStorage.getCurrentQuiz();
  if (currentQuiz && currentQuiz.questions) {
    currentQuestionIndex = currentQuiz.currentQuestionIndex || 0;
    topicInput.value = currentQuiz.topic; // Restore topic
    renderQuiz(currentQuiz, quizForm);
    quizSection.classList.remove("hidden");
    resultSection.classList.add("hidden");
    QuizStorage.loadQuizDraft();
  } else {
    QuizStorage.displayAll();
  }
});

document.addEventListener("DOMContentLoaded", function () {
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
});

// Khi người dùng chọn đáp án, lưu ngay vào LocalStorage
document.addEventListener("change", function (event) {
  if (event.target.matches("input[type='radio']")) {
    QuizStorage.saveDraftAnswer(event.target.name, event.target.value);
  }
});

// Make updateProgress globally accessible
window.updateProgress = updateProgress;

historyButton.addEventListener("click", () => {
  const currentQuiz = QuizStorage.getCurrentQuiz();
  if (currentQuiz && currentQuiz.questions) {
    currentQuestionIndex = currentQuiz.currentQuestionIndex || 0;
    topicInput.value = currentQuiz.topic; // Restore topic
    renderQuiz(currentQuiz, quizForm);
    quizSection.classList.remove("hidden");
    resultSection.classList.add("hidden");
    restoreAnswer(currentQuestionIndex); // Restore answers when history is clicked
  } else {
    alert("Không có lịch sử quiz nào được lưu!");
  }
});

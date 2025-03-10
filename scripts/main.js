import QuizStorage from './storage.js';

const GEMINI_API_KEY = "AIzaSyAuWn7Gnjc0vfREeO2TnL368rUSaPt56cU"; // Thay bằng khóa thật

const topicInput = document.getElementById("topic-input");
const generateButton = document.getElementById("generate-quiz");
const quizSection = document.getElementById("quiz-section");
const quizForm = document.getElementById("quiz-form");
const submitButton = document.getElementById("submit-quiz");
const resultSection = document.getElementById("result-section");

generateButton.addEventListener("click", async () => {
  const topic = topicInput.value.trim();
  if (!topic) return alert("Vui lòng nhập chủ đề!");

  generateButton.disabled = true;
  generateButton.textContent = "Đang tạo quiz...";

  try {
<<<<<<< Updated upstream
    const quiz = await fetchQuizFromGemini(topic);
    if (quiz) {
      renderQuiz(quiz, quizForm);
      quizSection.classList.remove("hidden");
      resultSection.classList.add("hidden");
      QuizStorage.saveCurrentQuiz(quiz, topic); // Save with topic
    }
=======
      const quiz = await fetchQuizFromGemini(topic);
      if (quiz) {
          currentQuestionIndex = 0;
          localStorage.removeItem("quizAnswers");
          renderQuiz(quiz, quizForm);
          quizSection.classList.remove("hidden");
          resultSection.classList.add("hidden");
          QuizStorage.saveCurrentQuiz(quiz, topic, currentQuestionIndex); // Pass currentQuestionIndex
      }
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  const payload = {
    contents: [
      {
        parts: [
          {
            text: `Tạo 5 câu hỏi trắc nghiệm về chủ đề "${topic}". Bao gồm câu hỏi và 4 đáp án A, B, C, D, với đáp án đúng rõ ràng.`,
          },
        ],
      },
    ],
=======
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
>>>>>>> Stashed changes
  };

  try {
      const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Full API response:", data); // Log full response

<<<<<<< Updated upstream
    if (data.candidates) {
      const textResult = data.candidates[0].content.parts[0].text;
      return parseQuizFromText(textResult);
    } else {
      console.error("Lỗi khi nhận dữ liệu:", data);
    }
  } catch (error) {
    console.error("Lỗi gọi API:", error);
  }
}

function parseQuizFromText(text) {
  const questions = [];
  const blocks = text.split("\n\n");

  for (const block of blocks) {
    const lines = block.split("\n");
    const questionLine = lines[0].replace(/^\d+\.\s*/, "").trim();
    const options = [];
    let correctAnswer = null;

    for (const line of lines.slice(1)) {
      const match = line.match(/^([A-D])\.\s*(.+)$/);
      if (match) {
        const [_, letter, text] = match;
        options.push(text.trim());
        // Tìm đáp án đúng (thường được đánh dấu với * hoặc (đúng))
        if (text.includes("*") || text.toLowerCase().includes("(đúng)")) {
          correctAnswer = letter;
        }
      }
    }

    if (questionLine && options.length === 4) {
      questions.push({
        question: questionLine,
        options: options.map((opt) => opt.replace(/[\*\(đúng\)]/gi, "").trim()),
        answer: correctAnswer || "A", // Fallback to A if no correct answer found
      });
    }
  }

  return questions;
}

function renderQuiz(quiz, container) {
  container.innerHTML = "";
  quiz.forEach((q, index) => {
    const qElement = document.createElement("div");
    qElement.innerHTML = `
      <p class="font-semibold mb-2">${index + 1}. ${q.question}</p>
      ${q.options
        .map(
          (opt, optIndex) => `
        <label class="block mb-2">
          <input type="radio" name="q${index}" value="${String.fromCharCode(65 + optIndex)}">
          ${opt}
        </label>
      `
        )
        .join("")}
    `;
    container.appendChild(qElement);
  });
}

function calculateScore(form) {
  const data = new FormData(form);
  let score = 0;
  const quizData = QuizStorage.getCurrentQuiz();
  
  if (!quizData || !quizData.questions) {
    console.error("No quiz data found");
    return 0;
  }

  quizData.questions.forEach((q, index) => {
    const userAnswer = data.get(`q${index}`);
    if (userAnswer === q.answer) score++;
  });

  return score;
=======
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
    if (!quiz || !quiz.questions || !Array.isArray(quiz.questions)) {
        console.error("Invalid quiz data:", quiz);
        return;
    }

    if (currentQuestionIndex < 0 || currentQuestionIndex >= quiz.questions.length) {
        console.error("Invalid currentQuestionIndex:", currentQuestionIndex);
        return;
    }

    container.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold mb-2">${quiz.title}</h2>
      <p class="text-gray-600">Câu hỏi ${currentQuestionIndex + 1}/${quiz.questions.length}</p>
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

    // Load draft answers
    QuizStorage.loadQuizDraft();
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
>>>>>>> Stashed changes
}

// Add DOMContentLoaded event listener to display initial state
document.addEventListener("DOMContentLoaded", () => {
    console.log('Quiz Application Started');
    const currentQuiz = QuizStorage.getCurrentQuiz();
    if (currentQuiz) {
        currentQuestionIndex = currentQuiz.currentQuestionIndex || 0;
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


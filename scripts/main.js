import QuizStorage from "./storage.js";

const GEMINI_API_KEY = "AIzaSyAuWn7Gnjc0vfREeO2TnL368rUSaPt56cU"; // Thay bằng khóa thật

// Initialize all DOM elements
let topicInput;
let generateButton;
let quizSection;
let quizForm;
let submitButton;
let resultSection;
let questionCountSelect;
let historyBtn;
let historyModal;
let closeHistory;
let currentQuestionIndex = 0;

// Initialize all event listeners and DOM elements
document.addEventListener("DOMContentLoaded", () => {
    // Initialize DOM elements
    topicInput = document.getElementById("topic-input");
    generateButton = document.getElementById("generate-quiz");
    quizSection = document.getElementById("quiz-section");
    quizForm = document.getElementById("quiz-form");
    submitButton = document.getElementById("submit-quiz");
    resultSection = document.getElementById("result-section");
    questionCountSelect = document.getElementById("question-count");
    historyBtn = document.getElementById("historyBtn");
    historyModal = document.getElementById("historyModal");
    closeHistory = document.getElementById("closeHistory");

    // Restore quiz state if exists
    const savedQuiz = QuizStorage.getCurrentQuiz();
    if (savedQuiz) {
        // Restore topic input
        if (topicInput) {
            topicInput.value = savedQuiz.topic;
        }

        // Restore question count
        if (questionCountSelect && savedQuiz.questions && savedQuiz.questions.length) {
            questionCountSelect.value = savedQuiz.questions.length;
        }

        // Restore quiz state
        if (savedQuiz.questions) {
            currentQuestionIndex = savedQuiz.currentQuestionIndex || 0;
            renderQuiz(savedQuiz.questions, quizForm);
            if (quizSection) quizSection.classList.remove("hidden");
            // Restore saved answers
            QuizStorage.loadQuizDraft();
        }
    }

    // Set placeholder for topic input
    if (topicInput) {
        topicInput.placeholder = "Vui lòng nhập chủ đề";
    }

    // Initialize event listeners if elements exist
    if (generateButton) {
        generateButton.addEventListener("click", () => {
            const topic = topicInput?.value?.trim();
            if (!topic) {
                showAlert("Vui lòng nhập chủ đề!");
                return;
            }

            if (!questionCountSelect?.value) {
                showAlert("Vui lòng chọn số câu hỏi!");
                return;
            }

            const lastPrompt = QuizStorage.getLastPrompt();
            const isReload = topic === lastPrompt;
            showPopup(isReload ? "reload" : "start", topic);
        });
    }

    if (submitButton) {
        submitButton.addEventListener("click", () => {
            const score = calculateScore(quizForm);
            if (resultSection) {
                resultSection.textContent = `Bạn được ${score} điểm!`;
                resultSection.classList.remove("hidden");
            }

            const topic = topicInput?.value?.trim();
            if (topic) {
                QuizStorage.saveQuizHistory(topic, score);
                QuizStorage.clearCurrentQuiz();
                QuizStorage.displayAll();
            }
        });
    }

    // History button event listeners
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            if (historyModal) {
                historyModal.classList.remove('hidden');
                QuizStorage.displayHistory();
            }
        });
    }

    if (closeHistory) {
        closeHistory.addEventListener('click', () => {
            if (historyModal) {
                historyModal.classList.add('hidden');
            }
        });
    }

    if (historyModal) {
        historyModal.addEventListener('click', (e) => {
            if (e.target === historyModal) {
                historyModal.classList.add('hidden');
            }
        });
    }

    // Display initial state
    QuizStorage.displayAll();

    // Restore any saved question count
    const savedQuestionCount = localStorage.getItem("preferredQuestionCount");
    if (savedQuestionCount && questionCountSelect) {
        questionCountSelect.value = savedQuestionCount;
    }

    // Save question count on change
    if (questionCountSelect) {
        questionCountSelect.addEventListener("change", () => {
            localStorage.setItem("preferredQuestionCount", questionCountSelect.value);
        });
    }

    console.log("Quiz Application Started");
}, { once: true });

// Thêm hàm hiển thị popup thông báo
function showAlert(message) {
    const alertPopup = document.getElementById("alertPopup");
    const alertMessage = document.getElementById("alertMessage");
    const alertOkBtn = document.getElementById("alertOkBtn");

    if (alertPopup && alertMessage && alertOkBtn) {
        alertMessage.textContent = message;
        alertPopup.classList.remove("hidden");

        // Xử lý nút OK
        alertOkBtn.onclick = () => {
            alertPopup.classList.add("hidden");
        };
    }
}

// Thêm hàm showPopup
function showPopup(type, topic) {
    const confirmPopup = document.getElementById("confirmPopup");
    const popupTitle = document.getElementById("popupTitle");
    const popupMessage = document.getElementById("popupMessage");
    const yesBtn = document.getElementById("yesBtn");
    const noBtn = document.getElementById("noBtn");

    if (!confirmPopup || !popupTitle || !popupMessage || !yesBtn || !noBtn) return;

    const numberOfQuestions = questionCountSelect?.value;

    if (type === "start") {
        popupTitle.textContent = "Xác nhận bắt đầu quiz mới";
        popupMessage.textContent = `Bạn có muốn bắt đầu quiz mới với chủ đề "${topic}" và ${numberOfQuestions} câu hỏi không?`;
    } else if (type === "reload") {
        popupTitle.textContent = "Tải lại quiz";
        popupMessage.textContent = `Bạn có muốn tải lại quiz "${topic}" với ${numberOfQuestions} câu hỏi không? Một số câu hỏi có thể sẽ được lặp lại.`;
    } else if (type === "redo") {
        popupTitle.textContent = "Làm lại bài test";
        popupMessage.textContent = `Bạn có muốn làm lại bài quiz "${topic}" không? Thứ tự câu hỏi sẽ được thay đổi.`;
    }

    confirmPopup.classList.remove("hidden");

    // Handle No button
    noBtn.onclick = () => {
        confirmPopup.classList.add("hidden");
        if (type === "redo") {
            // Stay on the results page
            return;
        }
    };

    // Handle Yes button
    yesBtn.onclick = async () => {
        confirmPopup.classList.add("hidden");
        const loading = document.getElementById("loading");
        if (loading) loading.classList.remove("hidden");

        try {
            let quiz;
            if (type === "redo") {
                // Get the last completed quiz and shuffle its questions
                const lastQuiz = QuizStorage.getLastCompletedQuiz();
                quiz = QuizStorage.shuffleQuizQuestions(lastQuiz);
            } else {
                quiz = await fetchQuizFromGemini(topic);
            }

            if (quiz) {
                currentQuestionIndex = 0;
                localStorage.removeItem("quizAnswers");
                renderQuiz(quiz, quizForm);
                if (quizSection) quizSection.classList.remove("hidden");
                if (resultSection) resultSection.classList.add("hidden");
                QuizStorage.saveCurrentQuiz(quiz, topic);
                if (type !== "redo") {
                    QuizStorage.saveLastPrompt(topic);
                }
            }
        } catch (error) {
            showAlert("Có lỗi xảy ra khi tạo quiz. Vui lòng thử lại!");
        } finally {
            if (loading) loading.classList.add("hidden");
            if (generateButton) {
                generateButton.disabled = false;
                generateButton.textContent = type === "reload" ? "Reload Quiz" : "Start Quiz";
            }
        }
    };
}

async function fetchQuizFromGemini(topic) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  // Get number of questions from dropdown
  const numberOfQuestions = parseInt(questionCountSelect.value);
  let language = "Vietnamese";

  if (topic.toLowerCase().includes("english") || topic.toLowerCase().includes("eng")) {
    language = "English";
    topic = topic.replace(/english|eng/gi, "").trim();
  }

  // Check if we're reloading with the same topic
  const lastPrompt = QuizStorage.getLastPrompt();
  const isReload = topic === lastPrompt;

  // If reloading, try to get existing questions first
  if (isReload) {
    const existingQuestions = QuizStorage.getRandomQuestionsForTopic(topic, numberOfQuestions);
    if (existingQuestions.length === numberOfQuestions) {
      return {
        id: Date.now(),
        title: topic,
        questions: existingQuestions,
        status: "incomplete"
      };
    }
  }

  // If not reloading or not enough existing questions, generate new ones
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
- Questions must be directly related to "${topic}"
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
    console.log("Full API response:", data); // Log full response

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const textResult = data.candidates[0].content.parts[0].text;
      const parsedQuiz = parseQuizJSON(textResult);
      
      if (parsedQuiz) {
        // Save the new questions for this topic
        QuizStorage.saveTopicQuestions(topic, parsedQuiz.questions);
        return parsedQuiz;
      }
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
  
  if (!quiz) {
    console.error("Quiz data is undefined or null");
    return;
  }
  
  if (quiz.questions && !Array.isArray(quiz.questions) && quiz.questions.questions && Array.isArray(quiz.questions.questions)) {
    console.log("Detected nested quiz structure, extracting inner quiz");
    quiz = quiz.questions;
    console.log("Using extracted quiz:", JSON.stringify(quiz, null, 2));
  }
  
  if (!quiz.questions) {
    console.error("Quiz questions are undefined");
    return;
  }
  
  if (!Array.isArray(quiz.questions)) {
    console.error("Quiz questions is not an array:", typeof quiz.questions);
    
    if (typeof quiz.questions === 'string') {
      try {
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
      const keys = Object.keys(quiz.questions);
      if (keys.every(key => !isNaN(parseInt(key))) && keys.length > 0) {
        const tempArray = [];
        keys.sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
          tempArray.push(quiz.questions[key]);
        });
        console.log("Converted object with numeric keys to array");
        quiz.questions = tempArray;
      } else {
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

  const currentQuestion = quiz.questions[currentQuestionIndex];
  console.log("Current question:", currentQuestion);
  
  if (!currentQuestion) {
    console.error("Current question is undefined");
    return;
  }
  
  const questionText = currentQuestion.question || currentQuestion.text || "";
  const questionAnswers = currentQuestion.answers || currentQuestion.options || [];
  
  if (!questionText) {
    console.warn("Question text is missing for question", currentQuestionIndex);
  }
  
  if (!Array.isArray(questionAnswers) || questionAnswers.length === 0) {
    console.warn("Question answers are missing or invalid for question", currentQuestionIndex);
  }

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
        <div class="flex gap-2">
          <button type="button" id="previousQuestion" 
            class="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-all duration-200 ${
              currentQuestionIndex === 0 ? "opacity-50 cursor-not-allowed" : ""
            }"
            ${currentQuestionIndex === 0 ? "disabled" : ""}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <button type="button" id="nextQuestion" 
            class="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-all duration-200 ${
              currentQuestionIndex === quiz.questions.length - 1 ? "opacity-50 cursor-not-allowed" : ""
            }"
            ${currentQuestionIndex === quiz.questions.length - 1 ? "disabled" : ""}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        <button type="button" id="submit-quiz"
          class="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-all duration-200">
          Nộp bài
        </button>
      </div>
    </form>
  `;

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

  const radioButtons = container.querySelectorAll('input[type="radio"]');
  radioButtons.forEach((radio) => {
    radio.addEventListener("change", () => {
      const answerIndex = parseInt(radio.value);
      saveAnswer(currentQuestionIndex, answerIndex);
      updateSubmitButton(quiz);
    });
  });

  // Previous button handler
  const previousButton = document.getElementById("previousQuestion");
  previousButton.addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderQuiz(quiz, container);
      restoreAnswer(currentQuestionIndex);
    }
  });

  // Next button handler
  const nextButton = document.getElementById("nextQuestion");
  nextButton.addEventListener("click", () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      currentQuestionIndex++;
      renderQuiz(quiz, container);
      restoreAnswer(currentQuestionIndex);
    }
  });

  // Restore answer if exists
  restoreAnswer(currentQuestionIndex);

  // Update submit button state
  updateSubmitButton(quiz);

  // Add submit button handler
  const submitButton = document.getElementById("submit-quiz");
  submitButton.addEventListener("click", () => {
    const confirmPopup = document.getElementById("confirmPopup");
    const popupTitle = document.getElementById("popupTitle");
    const popupMessage = document.getElementById("popupMessage");
    const yesBtn = document.getElementById("yesBtn");
    const noBtn = document.getElementById("noBtn");

    popupTitle.textContent = "Xác nhận nộp bài";
    popupMessage.textContent = "Bạn có chắc chắn muốn nộp bài không?";
    confirmPopup.classList.remove("hidden");

    noBtn.onclick = () => {
      confirmPopup.classList.add("hidden");
    };

    yesBtn.onclick = () => {
      confirmPopup.classList.add("hidden");
      submitQuiz(quiz);
    };
  });

  // Save current quiz state
  const topic = document.getElementById("topic-input")?.value?.trim();
  QuizStorage.saveCurrentQuiz(quiz, topic, currentQuestionIndex);

  // Add event listeners for saving draft answers
  const answerInputs = container.querySelectorAll('input[type="radio"]');
  answerInputs.forEach((radio) => {
    radio.addEventListener("change", () => {
      const questionName = radio.name;
      const answerValue = radio.value;
      QuizStorage.saveDraftAnswer(questionName, answerValue);
    });
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

  // Save the completed quiz before showing results
  QuizStorage.saveLastCompletedQuiz(quiz);

  // Save quiz history with detailed results
  const topic = document.getElementById("topic-input").value.trim();
  QuizStorage.saveQuizHistory(topic, score, results);

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
      <div class="flex gap-4 mt-6">
        <button 
          id="redoQuizBtn"
          class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200">
          RedoQuiz
        </button>
        <button 
          id="homeBtn"
          class="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200">
          Return homepage
        </button>
      </div>
    </div>
  `;

  // Add event listeners for the buttons
  const redoQuizBtn = document.getElementById("redoQuizBtn");
  const homeBtn = document.getElementById("homeBtn");

  if (redoQuizBtn) {
    redoQuizBtn.addEventListener("click", () => {
      showPopup("redo", quiz.title);
    });
  }

  if (homeBtn) {
    homeBtn.addEventListener("click", () => {
      location.reload();
    });
  }

  // Clear saved quiz state after submission
  QuizStorage.clearCurrentQuiz();
  localStorage.removeItem("quizAnswers");
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

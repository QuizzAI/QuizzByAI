class QuizStorage {
    static CURRENT_QUIZ_KEY = 'currentQuiz';
    static QUIZ_HISTORY_KEY = 'quizHistory';
    static LAST_PROMPT_KEY = 'lastPrompt';
    static TOPIC_QUESTIONS_KEY = 'topicQuestions';
    static LAST_COMPLETED_QUIZ_KEY = 'lastCompletedQuiz';
    static INCOMPLETE_QUIZ_KEY = 'incompleteQuiz';

    static saveCurrentQuiz(quiz, topic, currentQuestionIndex) {
        const quizData = {
            questions: quiz,
            topic: topic,
            currentQuestionIndex: currentQuestionIndex,
            draftAnswers: this.getCurrentDraftAnswers(),
            timestamp: new Date().toISOString(),
            status: 'incomplete',
            progress: this.calculateQuizProgress(quiz, this.getCurrentDraftAnswers())
        };
        localStorage.setItem(this.CURRENT_QUIZ_KEY, JSON.stringify(quizData));
        // Also save to incomplete quiz history
        this.saveIncompleteQuiz(quizData);
        this.displayCurrentQuiz();
    }

    static calculateQuizProgress(quiz, draftAnswers) {
        if (!quiz || !quiz.questions) return 0;
        const totalQuestions = quiz.questions.length;
        const answeredQuestions = Object.keys(draftAnswers).length;
        return Math.round((answeredQuestions / totalQuestions) * 100);
    }

    static saveIncompleteQuiz(quizData) {
        const incompleteQuizzes = this.getIncompleteQuizzes();
        const existingIndex = incompleteQuizzes.findIndex(q => q.topic === quizData.topic);
        
        if (existingIndex !== -1) {
            // Update existing incomplete quiz while preserving progress
            incompleteQuizzes[existingIndex] = {
                ...incompleteQuizzes[existingIndex],
                ...quizData,
                lastUpdated: new Date().toISOString()
            };
        } else {
            // Add new incomplete quiz
            incompleteQuizzes.push({
                ...quizData,
                lastUpdated: new Date().toISOString()
            });
        }
        
        localStorage.setItem(this.INCOMPLETE_QUIZ_KEY, JSON.stringify(incompleteQuizzes));
    }

    static getIncompleteQuizzes() {
        const quizzes = localStorage.getItem(this.INCOMPLETE_QUIZ_KEY);
        return quizzes ? JSON.parse(quizzes) : [];
    }

    static removeIncompleteQuiz(topic) {
        const incompleteQuizzes = this.getIncompleteQuizzes();
        const filteredQuizzes = incompleteQuizzes.filter(q => q.topic !== topic);
        localStorage.setItem(this.INCOMPLETE_QUIZ_KEY, JSON.stringify(filteredQuizzes));
    }

    static getCurrentQuiz() {
        const quiz = localStorage.getItem(this.CURRENT_QUIZ_KEY);
        return quiz ? JSON.parse(quiz) : null;
    }

    static clearCurrentQuiz() {
        const currentQuiz = this.getCurrentQuiz();
        if (currentQuiz) {
            this.removeIncompleteQuiz(currentQuiz.topic);
        }
        localStorage.removeItem(this.CURRENT_QUIZ_KEY);
        localStorage.removeItem(this.LAST_PROMPT_KEY);
    }

    static saveQuizHistory(topic, score, questions) {
        const history = this.getQuizHistory();
        const newEntry = {
            topic,
            score,
            totalQuestions: questions.length,
            questions: questions,
            date: new Date().toISOString()
        };
        history.push(newEntry);
        localStorage.setItem(this.QUIZ_HISTORY_KEY, JSON.stringify(history));
        this.displayHistory();
    }

    static getQuizHistory() {
        const history = localStorage.getItem(this.QUIZ_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    }

    static clearAll() {
        localStorage.removeItem(this.CURRENT_QUIZ_KEY);
        localStorage.removeItem(this.QUIZ_HISTORY_KEY);
        console.log('All quiz data cleared');
    }

    static displayCurrentQuiz() {
        const currentQuiz = this.getCurrentQuiz();
        if (!currentQuiz) {
            console.log("Chưa có quiz nào trong localStorage.");
            return;
        }
        
        console.group('Current Quiz Information');
        console.log(`Topic: ${currentQuiz.topic}`);
        console.log(`Number of questions: ${currentQuiz.questions.length}`);
        console.log(`Date: ${new Date(currentQuiz.timestamp).toLocaleString()}`);
        console.groupEnd();
    }
    
    static displayHistory() {
        const history = this.getQuizHistory();
        const incompleteQuizzes = this.getIncompleteQuizzes();
        const historyContent = document.getElementById('historyContent');
        
        if (!historyContent) return;
        
        if (history.length === 0 && incompleteQuizzes.length === 0) {
            historyContent.innerHTML = `
                <div class="text-center py-3">
                    <svg class="mx-auto h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <h3 class="mt-1 text-xs font-medium text-gray-900">Chưa có lịch sử</h3>
                    <p class="text-[10px] text-gray-500">Hãy bắt đầu làm quiz!</p>
                </div>`;
            return;
        }

        // Combine and sort all quizzes by date
        const allQuizzes = [
            ...incompleteQuizzes.map(q => ({
                ...q,
                isIncomplete: true,
                date: q.timestamp || q.lastUpdated
            })),
            ...history.map(h => ({
                ...h,
                isIncomplete: false,
                isCompleted: true
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        historyContent.innerHTML = `
            <div class="grid grid-cols-1 gap-1.5">
                ${allQuizzes.map((entry) => {
                    const date = new Date(entry.date);
                    const formattedDate = date.toLocaleDateString('vi-VN', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    let score, scoreColor, scoreText;
                    if (entry.isIncomplete) {
                        score = entry.progress || 0;
                        scoreColor = 'bg-blue-500';
                        scoreText = `${score}%`;
                    } else {
                        score = (entry.score / entry.totalQuestions) * 100;
                        scoreColor = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
                        scoreText = `${entry.score}/${entry.totalQuestions}`;
                    }
                    
                    return `
                        <div class="bg-white rounded shadow-sm p-2 ${entry.isIncomplete ? 'border-l-2 border-blue-500' : entry.isCompleted ? 'border-l-2 border-green-500' : ''}">
                            <div class="flex items-center justify-between mb-1">
                                <h3 class="text-xs font-medium text-gray-800 truncate flex-1">
                                    ${entry.topic}
                                </h3>
                                <span class="text-[10px] text-gray-500 ml-2">
                                    ${formattedDate}
                                </span>
                            </div>
                            
                            <div class="flex items-center gap-1.5 mb-1">
                                <div class="flex-1">
                                    <div class="h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <div class="${scoreColor} h-full rounded-full transition-all" 
                                             style="width: ${score}%">
                                        </div>
                                    </div>
                                </div>
                                <div class="text-[10px] font-medium ${
                                    entry.isIncomplete ? 'text-blue-600' :
                                    score >= 80 ? 'text-green-600' : 
                                    score >= 60 ? 'text-yellow-600' : 
                                    'text-red-600'
                                }">
                                    ${scoreText}
                                </div>
                            </div>

                            <div class="flex justify-end gap-1">
                                ${entry.isIncomplete ? `
                                    <button 
                                        onclick="QuizStorage.resumeQuiz(${JSON.stringify(entry).replace(/"/g, '&quot;')})"
                                        class="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 transition-colors"
                                    >
                                        <svg class="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                                        </svg>
                                        Câu ${entry.currentQuestionIndex + 1}
                                    </button>
                                    <button 
                                        onclick="QuizStorage.restartQuiz(${JSON.stringify(entry).replace(/"/g, '&quot;')})"
                                        class="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-white bg-gray-500 rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-gray-400 transition-colors"
                                    >
                                        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                        </svg>
                                    </button>
                                ` : `
                                    <button 
                                        onclick="QuizStorage.showQuizDetails(${JSON.stringify(entry).replace(/"/g, '&quot;')})"
                                        class="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-green-500 transition-colors"
                                    >
                                        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                    </button>
                                `}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    static showQuizDetails(entry) {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div class="bg-white rounded-lg shadow-xl w-full max-w-sm relative z-10 max-h-[80vh] flex flex-col mx-4">
          <!-- Header -->
          <div class="flex items-center justify-between p-3 border-b">
            <div class="min-w-0 flex-1">
              <h3 class="text-sm font-semibold text-gray-800 truncate">${entry.topic}</h3>
              <p class="text-xs text-gray-500 mt-0.5">${new Date(entry.date).toLocaleDateString('vi-VN', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
            <div class="flex items-center gap-2 ml-2">
              <div class="text-right">
                <div class="text-xs font-medium">${entry.score}/${entry.totalQuestions}</div>
                <div class="text-[10px] text-gray-500">Điểm số</div>
              </div>
              <button class="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Content -->
          <div class="overflow-y-auto flex-1 p-3 space-y-2" style="max-height: calc(80vh - 120px);">
            ${entry.questions.map((question, index) => `
              <div class="bg-gray-50 rounded p-2 text-xs">
                <div class="flex items-start gap-2">
                  <div class="flex-shrink-0 w-5 h-5 rounded-full ${question.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} flex items-center justify-center font-medium text-[10px]">
                    ${index + 1}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-800 mb-1">${question.question}</p>
                    <div class="space-y-1">
                      <div class="flex items-center gap-1.5">
                        <span class="font-medium text-gray-500">Trả lời:</span>
                        <span class="flex-1 ${question.isCorrect ? 'text-green-600' : 'text-red-600'}">${question.userAnswer}</span>
                        ${question.isCorrect 
                          ? '<svg class="w-3.5 h-3.5 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
                          : '<svg class="w-3.5 h-3.5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                        }
                      </div>
                      ${!question.isCorrect ? `
                        <div class="flex items-center gap-1.5">
                          <span class="font-medium text-gray-500">Đáp án:</span>
                          <span class="flex-1 text-green-600">${question.correctAnswer}</span>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          
          <!-- Footer -->
          <div class="border-t p-2 flex justify-end">
            <button class="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
              Đóng
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Add fade-in animation class
      requestAnimationFrame(() => {
        modal.querySelector('.bg-white').classList.add('animate-fade-in');
      });

      // Close handlers
      const closeModal = () => {
        const modalContent = modal.querySelector('.bg-white');
        modalContent.classList.add('animate-fade-out');
        setTimeout(() => modal.remove(), 200);
      };

      // Add event listeners to both close buttons
      modal.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', closeModal);
      });
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    static displayAll() {
        const currentQuiz = this.getCurrentQuiz();  // ✅ Lấy dữ liệu từ localStorage trước
    
        if (!currentQuiz) {
            console.log("Chưa có quiz nào trong localStorage.");
            return;
        }
    
        console.group('Current Quiz Information');
        console.log(`Topic: ${currentQuiz.topic}`);
        console.log(`Current question index: ${currentQuiz.currentQuestionIndex}`);
        console.log(`Total questions: ${currentQuiz.questions.length}`);
        console.log(`Date: ${new Date(currentQuiz.timestamp).toLocaleString()}`);
        console.groupEnd();
    }

    static getCurrentDraftAnswers() {
        const quiz = this.getCurrentQuiz();
        return quiz && quiz.draftAnswers ? quiz.draftAnswers : {};
    }

    static saveDraftAnswer(questionName, answerValue) {
        const quiz = this.getCurrentQuiz() || { draftAnswers: {} };
        if (!quiz.draftAnswers) quiz.draftAnswers = {};
        quiz.draftAnswers[questionName] = answerValue;
        localStorage.setItem(this.CURRENT_QUIZ_KEY, JSON.stringify(quiz));
    }

    static loadQuizDraft() {
        const draftAnswers = this.getCurrentDraftAnswers();
        Object.keys(draftAnswers).forEach((key) => {
            const input = document.querySelector(`input[name="${key}"][value="${draftAnswers[key]}"]`);
            if (input) input.checked = true;
        });
    }

    static saveLastPrompt(prompt) {
        localStorage.setItem(this.LAST_PROMPT_KEY, prompt);
    }

    static getLastPrompt() {
        return localStorage.getItem(this.LAST_PROMPT_KEY);
    }

    static saveTopicQuestions(topic, questions) {
        const topicQuestions = this.getTopicQuestions();
        if (!topicQuestions[topic]) {
            topicQuestions[topic] = [];
        }
        // Add new questions while avoiding duplicates
        questions.forEach(newQuestion => {
            const isDuplicate = topicQuestions[topic].some(existingQuestion => 
                existingQuestion.question === newQuestion.question
            );
            if (!isDuplicate) {
                topicQuestions[topic].push(newQuestion);
            }
        });
        localStorage.setItem(this.TOPIC_QUESTIONS_KEY, JSON.stringify(topicQuestions));
    }

    static getTopicQuestions() {
        const questions = localStorage.getItem(this.TOPIC_QUESTIONS_KEY);
        return questions ? JSON.parse(questions) : {};
    }

    static getRandomQuestionsForTopic(topic, count) {
        const topicQuestions = this.getTopicQuestions();
        const questions = topicQuestions[topic] || [];
        
        // Shuffle questions
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        
        // Return requested number of questions or all available if less than requested
        return shuffled.slice(0, count);
    }

    static saveLastCompletedQuiz(quiz) {
        localStorage.setItem(this.LAST_COMPLETED_QUIZ_KEY, JSON.stringify(quiz));
    }

    static getLastCompletedQuiz() {
        const quiz = localStorage.getItem(this.LAST_COMPLETED_QUIZ_KEY);
        return quiz ? JSON.parse(quiz) : null;
    }

    static shuffleQuizQuestions(quiz) {
        if (!quiz || !quiz.questions) return quiz;
        const shuffledQuestions = [...quiz.questions].sort(() => Math.random() - 0.5);
        return {
            ...quiz,
            questions: shuffledQuestions,
            id: Date.now(), // New ID for the shuffled quiz
            status: "incomplete"
        };
    }

    static resumeQuiz(quizData) {
        // Restore quiz state with all progress
        localStorage.setItem(this.CURRENT_QUIZ_KEY, JSON.stringify({
            ...quizData,
            timestamp: new Date().toISOString()
        }));
        
        // Reload the page to start from where they left off
        window.location.reload();
    }

    static restartQuiz(quizData) {
        // Create a fresh quiz state without any answers
        const newQuizData = {
            ...quizData,
            currentQuestionIndex: 0,
            draftAnswers: {},
            progress: 0,
            timestamp: new Date().toISOString()
        };
        
        // Save as current quiz
        localStorage.setItem(this.CURRENT_QUIZ_KEY, JSON.stringify(newQuizData));
        
        // Remove from incomplete quizzes
        this.removeIncompleteQuiz(quizData.topic);
        
        // Reload the page to start fresh
        window.location.reload();
    }
}

// Make QuizStorage globally accessible for console
window.QuizStorage = QuizStorage;

export default QuizStorage;

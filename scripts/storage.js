class QuizStorage {
    static CURRENT_QUIZ_KEY = 'currentQuiz';
    static QUIZ_HISTORY_KEY = 'quizHistory';
    static LAST_PROMPT_KEY = 'lastPrompt';
    static TOPIC_QUESTIONS_KEY = 'topicQuestions';
    static LAST_COMPLETED_QUIZ_KEY = 'lastCompletedQuiz';

    static saveCurrentQuiz(quiz, topic, currentQuestionIndex) {
        const quizData = {
            questions: quiz,
            topic: topic,
            currentQuestionIndex: currentQuestionIndex,  // Use currentQuestionIndex
            draftAnswers: this.getCurrentDraftAnswers(), // Save draft answers
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(this.CURRENT_QUIZ_KEY, JSON.stringify(quizData));
        this.displayCurrentQuiz(); // Display after saving
    }

    static getCurrentQuiz() {
        const quiz = localStorage.getItem(this.CURRENT_QUIZ_KEY);
        return quiz ? JSON.parse(quiz) : null;
    }

    static clearCurrentQuiz() {
        localStorage.removeItem(this.CURRENT_QUIZ_KEY);
        localStorage.removeItem(this.LAST_PROMPT_KEY);
    }

    static saveQuizHistory(topic, score) {
        const history = this.getQuizHistory();
        const newEntry = {
            topic,
            score,
            date: new Date().toISOString()
        };
        history.push(newEntry);
        localStorage.setItem(this.QUIZ_HISTORY_KEY, JSON.stringify(history));
        this.displayHistory(); // Display after saving
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
        if (history.length === 0) {
            console.log('The history of quiz is empty.');
            return;
        }

        console.group('Quiz History');
        history.forEach((entry, index) => {
            console.log(`\n${index + 1}. Topic: ${entry.topic}`);
            console.log(`   Score: ${entry.score}`);
            console.log(`   Date: ${new Date(entry.date).toLocaleString()}`);
        });
        console.groupEnd();
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
}

// Make QuizStorage globally accessible for console
window.QuizStorage = QuizStorage;

export default QuizStorage;

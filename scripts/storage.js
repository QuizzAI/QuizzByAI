// Create 
class QuizStorage {
    static CURRENT_QUIZ_KEY = 'currentQuiz';
    static QUIZ_HISTORY_KEY = 'quizHistory';

    static saveCurrentQuiz(quiz, topic) {
        const quizData = {
            questions: quiz,
            topic: topic,
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
        console.group('Quiz Application State');
        this.displayCurrentQuiz();
        this.displayHistory();
        console.groupEnd();
    }
}

// Make QuizStorage globally accessible for console
window.QuizStorage = QuizStorage;

export default QuizStorage;

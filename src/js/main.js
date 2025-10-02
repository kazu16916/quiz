document.addEventListener('DOMContentLoaded', () => {
    // DOM要素
    const loadingContainerEl = document.getElementById('loading-container');
    const quizContainerEl = document.getElementById('quiz-container');
    const questionCountEl = document.getElementById('question-count');
    const sessionAttemptCountEl = document.getElementById('session-attempt-count');
    const correctRateEl = document.getElementById('correct-rate');
    const questionTextEl = document.getElementById('question-text');
    const multipleChoiceAreaEl = document.getElementById('multiple-choice-area');
    const optionsContainerEl = document.getElementById('options-container');
    const writtenAnswerAreaEl = document.getElementById('written-answer-area');
    const writtenAnswerInput = document.getElementById('written-answer-input');
    const writtenSubmitBtn = document.getElementById('written-submit-btn');
    const showHintBtn = document.getElementById('show-hint-btn');
    const resultContainerEl = document.getElementById('result-container');
    const resultMessageEl = document.getElementById('result-message');
    const correctAnswerTextEl = document.getElementById('correct-answer-text');
    const explanationTextEl = document.getElementById('explanation-text');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const completionContainerEl = document.getElementById('completion-container');
    const completionTitleEl = document.getElementById('completion-title');
    const completionMessageEl = document.getElementById('completion-message');
    const nextSessionBtn = document.getElementById('next-session-btn');
    const resetBtn = document.getElementById('reset-btn');
    const reviewAreaEl = document.getElementById('review-area');
    const repeatSessionBtn = document.getElementById('repeat-session-btn');

    // クイズの状態
    let state = {
        questionPool: [],
        sessionQuestions: [],
        sessionHistory: [],
        currentIndex: -1,
        sessionCorrectCount: 0,
        totalCorrectCount: 0,
        totalAnsweredCount: 0,
        correctlyAnsweredIds: new Set(),
        isAnswered: false,
        attemptNumber: 1,
    };

    // キーワード抽出関数（助詞、接続詞などを除外）
    function extractKeywords(text) {
        // 括弧を削除せずに正規化
        const normalized = text.normalize('NFKC').toLowerCase();
        // 助詞や接続詞など、意味を持たない語をフィルタリング
        const stopWords = ['は', 'が', 'を', 'に', 'へ', 'と', 'の', 'で', 'や', 'か', 'から', 'まで', 'より', 'など', 'として', 'という', 'もの', 'ある', 'いる', 'なる', 'れる', 'られる', 'ます', 'です', 'よう', 'こと', 'その', 'この', 'それ', 'これ', 'おいて'];
        
        // 1文字以上の単語を抽出（ひらがな・カタカナ・漢字・英数字）
        const words = normalized.match(/[ぁ-んァ-ヶー一-龠a-z0-9]+/g) || [];
        
        // 1文字のキーワードも重要な場合があるため含める
        return words.filter(word => {
            return word.length >= 1 && !stopWords.includes(word);
        });
    }

    // キーワードベースの判定関数
    function checkAnswerByKeywords(userAnswer, correctAnswer) {
        const userKeywords = extractKeywords(userAnswer);
        const correctKeywords = extractKeywords(correctAnswer);
        
        if (correctKeywords.length === 0 || userKeywords.length === 0) {
            return false;
        }
        
        // より柔軟なマッチング判定
        let matchCount = 0;
        let userMatchCount = 0;
        
        correctKeywords.forEach(keyword => {
            if (userKeywords.some(userKeyword => {
                // 完全一致
                if (userKeyword === keyword) return true;
                // 部分一致（長い方が短い方を含む）
                if (userKeyword.includes(keyword) || keyword.includes(userKeyword)) return true;
                // 2文字以上で先頭が一致
                if (userKeyword.length >= 2 && keyword.length >= 2) {
                    if (userKeyword.substring(0, 2) === keyword.substring(0, 2)) return true;
                    if (userKeyword.length >= 3 && keyword.length >= 3 && 
                        userKeyword.substring(0, 3) === keyword.substring(0, 3)) return true;
                }
                return false;
            })) {
                matchCount++;
            }
        });
        
        // 逆方向：ユーザーのキーワードが正解にどれだけ含まれているか
        userKeywords.forEach(userKeyword => {
            if (correctKeywords.some(keyword => {
                if (userKeyword === keyword) return true;
                if (userKeyword.includes(keyword) || keyword.includes(userKeyword)) return true;
                if (userKeyword.length >= 2 && keyword.length >= 2) {
                    if (userKeyword.substring(0, 2) === keyword.substring(0, 2)) return true;
                    if (userKeyword.length >= 3 && keyword.length >= 3 && 
                        userKeyword.substring(0, 3) === keyword.substring(0, 3)) return true;
                }
                return false;
            })) {
                userMatchCount++;
            }
        });
        
        // 正解側の一致率またはユーザー側の一致率が一定以上なら正解
        const correctMatchRate = matchCount / correctKeywords.length;
        const userMatchRate = userKeywords.length > 0 ? userMatchCount / userKeywords.length : 0;
        
        // かなり緩い判定基準（趣旨が合っていれば正解とする）：
        // - ユーザー側が35%以上一致
        // - または正解側が30%以上一致
        // - または両方の平均が35%以上
        // - またはユーザーの回答が短く、かつ50%以上一致している場合
        const isShortAnswer = userKeywords.length <= 5;
        
        return userMatchRate >= 0.35 || 
               correctMatchRate >= 0.3 || 
               (correctMatchRate + userMatchRate) / 2 >= 0.35 ||
               (isShortAnswer && userMatchRate >= 0.5);
    }

    function loadCorrectlyAnsweredIds() {
        state.correctlyAnsweredIds.clear();
        quizSettings.categories.forEach(category => {
            const key = `quiz_progress_${category}`;
            const solvedIds = JSON.parse(localStorage.getItem(key) || '[]' );
            solvedIds.forEach(id => state.correctlyAnsweredIds.add(id));
        });
    }

    async function initializeQuiz() {
        loadCorrectlyAnsweredIds();
        const params = new URLSearchParams();
        quizSettings.categories.forEach(cat => params.append('categories[]', cat));
        if (state.correctlyAnsweredIds.size > 0) {
            params.append('exclude_ids', Array.from(state.correctlyAnsweredIds).join(','));
        }
        try {
            const response = await fetch(`api/pool.php?${params.toString()}`);
            if (!response.ok) throw new Error(`サーバーエラー (ステータス: ${response.status})`);
            const data = await response.json();
            if (data.error || !data.questions) throw new Error(data.error || '問題を取得できませんでした。');
            state.questionPool = data.questions;
            if (state.questionPool.length === 0) {
                showCompletionScreen(true);
                return;
            }
            startNewSession();
        } catch (error) {
            loadingContainerEl.innerHTML = `<p>問題の準備に失敗しました。<br><small>${error.message}</small></p>`;
            console.error(error);
        }
    }
    
    function startNewSession() {
        state.sessionHistory = [];
        const limit = quizSettings.limit === 'all' ? state.questionPool.length : parseInt(quizSettings.limit, 10);
        state.sessionQuestions = state.questionPool.slice(0, limit);
        state.currentIndex = -1;
        state.sessionCorrectCount = 0;
        state.attemptNumber = 1;
        loadingContainerEl.style.display = 'none';
        quizContainerEl.style.display = 'block';
        completionContainerEl.style.display = 'none';
        showNextQuestion();
    }

    function repeatSession() {
        state.attemptNumber++;
        state.sessionQuestions.sort(() => 0.5 - Math.random());
        state.sessionHistory = [];
        state.currentIndex = -1;
        state.sessionCorrectCount = 0;
        completionContainerEl.style.display = 'none';
        quizContainerEl.style.display = 'block';
        showNextQuestion();
    }

    function showNextQuestion() {
        state.isAnswered = false;
        resultContainerEl.style.display = 'none';
        state.currentIndex++;
        if (state.currentIndex >= state.sessionQuestions.length) {
            showCompletionScreen(false);
            return;
        }
        const currentQuestionData = state.sessionQuestions[state.currentIndex];
        questionTextEl.textContent = (quizSettings.quizType === 'term_to_desc') ? currentQuestionData.term : currentQuestionData.description;
        if (state.attemptNumber < 3) {
            multipleChoiceAreaEl.style.display = 'block';
            writtenAnswerAreaEl.style.display = 'none';
            displayMultipleChoiceOptions(currentQuestionData);
        } else {
            multipleChoiceAreaEl.style.display = 'none';
            writtenAnswerAreaEl.style.display = 'block';
            writtenAnswerInput.value = '';
            writtenAnswerInput.disabled = false;
            writtenSubmitBtn.style.display = 'block';
            showHintBtn.style.display = 'block';
            optionsContainerEl.innerHTML = '';
        }
        updateStatus();
    }
    
    function displayMultipleChoiceOptions(currentQuestionData, isHint = false) {
        const distractors = state.questionPool.filter(item => item.unique_id !== currentQuestionData.unique_id).sort(() => 0.5 - Math.random()).slice(0, 3);
        let options = [];
        const correctAnswer = (quizSettings.quizType === 'term_to_desc') ? currentQuestionData.description : currentQuestionData.term;
        options = (quizSettings.quizType === 'term_to_desc') ? distractors.map(d => d.description) : distractors.map(d => d.term);
        options.push(correctAnswer);
        options.sort(() => 0.5 - Math.random());
        optionsContainerEl.innerHTML = '';
        options.forEach(optionText => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = optionText;
            button.addEventListener('click', () => handleAnswer(button.textContent));
            optionsContainerEl.appendChild(button);
        });
        if (isHint) {
            multipleChoiceAreaEl.style.display = 'block';
            writtenAnswerAreaEl.style.display = 'none';
        }
    }

    function handleAnswer(userAnswer) {
        if (state.isAnswered) return;
        state.isAnswered = true;
        const currentQuestionData = state.sessionQuestions[state.currentIndex];
        const correctAnswer = (quizSettings.quizType === 'term_to_desc') ? currentQuestionData.description : currentQuestionData.term;
        let isCorrect = false;

        // 4択問題の場合は完全一致、記述式の場合はキーワード判定
        if (state.attemptNumber < 3 && multipleChoiceAreaEl.style.display !== 'none') {
            // 4択モード
            isCorrect = userAnswer === correctAnswer;
        } else {
            // 記述式モード：キーワードベースで判定
            isCorrect = checkAnswerByKeywords(userAnswer, correctAnswer);
        }
        
        if (state.attemptNumber === 1 || state.isAnswered) {
             if (!state.sessionHistory.find(h => h.question === questionTextEl.textContent)) {
                state.totalAnsweredCount++;
             }
        }

        if (isCorrect) {
            if (state.attemptNumber === 1 && !state.correctlyAnsweredIds.has(currentQuestionData.unique_id)) {
                 state.totalCorrectCount++;
            }
            state.sessionCorrectCount++;
            resultMessageEl.textContent = '正解！';
            resultMessageEl.className = 'correct';
            if (state.attemptNumber === 1) {
                const uniqueId = currentQuestionData.unique_id;
                const category = uniqueId.split('_')[0];
                const key = `quiz_progress_${category}`;
                const solvedIds = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
                solvedIds.add(uniqueId);
                localStorage.setItem(key, JSON.stringify(Array.from(solvedIds)));
                state.correctlyAnsweredIds.add(uniqueId);
            }
        } else {
            resultMessageEl.textContent = '不正解...';
            resultMessageEl.className = 'incorrect';
        }

        state.sessionHistory.push({
            question: questionTextEl.textContent, userAnswer: userAnswer, correctAnswer: correctAnswer, isCorrect: isCorrect,
        });

        Array.from(optionsContainerEl.children).forEach(button => {
            if (button.textContent === correctAnswer) button.classList.add('correct');
            else if (button.textContent === userAnswer) button.classList.add('incorrect');
            button.disabled = true;
        });
        writtenAnswerInput.disabled = true;

        const explanation = (quizSettings.quizType === 'term_to_desc') ? `「${currentQuestionData.term}」は、「${currentQuestionData.description}」という意味です。` : `「${currentQuestionData.description}」は、「${currentQuestionData.term}」のことです。`;
        correctAnswerTextEl.textContent = correctAnswer;
        explanationTextEl.textContent = explanation;
        resultContainerEl.style.display = 'block';
        updateStatus(true);
    }
    
    function updateStatus(isAnswered = false) {
        const sessionProgress = state.currentIndex + (isAnswered ? 1 : 0);
        questionCountEl.textContent = `セッション ${sessionProgress > state.sessionQuestions.length ? state.sessionQuestions.length : sessionProgress} / ${state.sessionQuestions.length} 問`;
        sessionAttemptCountEl.textContent = `${state.attemptNumber}周目`;
        const rate = state.totalAnsweredCount > 0 ? Math.round((state.totalCorrectCount / state.totalAnsweredCount) * 100) : 0;
        correctRateEl.textContent = `累計正解率: ${rate}%`;
    }

    function showCompletionScreen(isAllAnswered) {
        quizContainerEl.style.display = 'none';
        resultContainerEl.style.display = 'none';
        completionContainerEl.style.display = 'block';
        const sessionRate = state.sessionQuestions.length > 0 ? Math.round((state.sessionCorrectCount / state.sessionQuestions.length) * 100) : 0;
        completionMessageEl.textContent = `${state.attemptNumber}周目の結果: ${state.sessionQuestions.length} 問中 ${state.sessionCorrectCount} 問正解しました。(正解率 ${sessionRate}%)`;
        if (isAllAnswered) {
            completionTitleEl.textContent = '🎉 すべての問題をマスターしました！';
            nextSessionBtn.style.display = 'none';
            repeatSessionBtn.style.display = 'none';
        } else {
            completionTitleEl.textContent = '🎉 セッション完了！';
            if (state.attemptNumber === 1) {
                repeatSessionBtn.textContent = 'もう一度4択で解く';
                repeatSessionBtn.style.display = 'block';
            } else if (state.attemptNumber === 2) {
                repeatSessionBtn.textContent = '記述式で解く';
                repeatSessionBtn.style.display = 'block';
            } else {
                repeatSessionBtn.style.display = 'none';
            }
            nextSessionBtn.style.display = state.questionPool.length > state.sessionQuestions.length ? 'block' : 'none';
        }
        displayReview();
        updateStatus(true);
    }
    
    function displayReview() {
        reviewAreaEl.innerHTML = '<h3>今回のセッションの復習</h3>';
        state.sessionHistory.forEach((item, index) => {
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            let answerHTML;
            const userAnswerSanitized = (item.userAnswer || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            if (item.isCorrect) {
                answerHTML = `<p class="review-answer">あなたの回答: <span class="review-correct">${userAnswerSanitized}</span> <span class="review-icon">◎</span></p>`;
            } else {
                answerHTML = `<p class="review-answer">あなたの回答: <span class="review-incorrect">${userAnswerSanitized}</span> <span class="review-icon">×</span></p><p class="review-answer">正解: <span class="review-correct">${item.correctAnswer}</span></p>`;
            }
            reviewItem.innerHTML = `<h4>問題 ${index + 1}</h4><p class="review-question">${item.question}</p>${answerHTML}`;
            reviewAreaEl.appendChild(reviewItem);
        });
    }

    function resetProgress() {
        if (confirm('選択中のカテゴリの進捗をすべてリセットします。よろしいですか？')) {
            quizSettings.categories.forEach(category => localStorage.removeItem(`quiz_progress_${category}`));
            alert('進捗をリセットしました。');
            window.location.reload();
        }
    }

    // イベントリスナー
    nextQuestionBtn.addEventListener('click', showNextQuestion);
    nextSessionBtn.addEventListener('click', () => { window.location.reload(); });
    resetBtn.addEventListener('click', resetProgress);
    repeatSessionBtn.addEventListener('click', repeatSession);
    writtenSubmitBtn.addEventListener('click', () => { handleAnswer(writtenAnswerInput.value); });
    showHintBtn.addEventListener('click', () => {
        const currentQuestionData = state.sessionQuestions[state.currentIndex];
        displayMultipleChoiceOptions(currentQuestionData, true);
    });

    initializeQuiz();
});
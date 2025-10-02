<?php
// URLパラメータから設定を取得
$categories = isset($_GET['categories']) ? $_GET['categories'] : [];
$quiz_type = isset($_GET['quiz_type']) ? $_GET['quiz_type'] : 'term_to_desc';
$limit = isset($_GET['limit']) ? $_GET['limit'] : '50';

if (empty($categories)) {
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>クイズ実施中</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <div id="quiz-status" class="quiz-status">
            <span id="question-count"></span>
            <span id="session-attempt-count"></span>
            <span id="correct-rate"></span>
        </div>

        <div id="loading-container">
            <p>問題の準備をしています...</p>
        </div>

        <div id="quiz-container" style="display: none;">
            <p id="question-text" class="question-text"></p>
            
            <div id="multiple-choice-area">
                <div id="options-container" class="options-container"></div>
            </div>

            <div id="written-answer-area" style="display: none;">
                <textarea id="written-answer-input" rows="4" placeholder="ここに回答を入力してください"></textarea>
                <div class="written-actions">
                    <button id="written-submit-btn" class="next-btn">回答を送信</button>
                    <button id="show-hint-btn" class="secondary-btn">わからない（4択ヒント）</button>
                </div>
            </div>
        </div>

        <div id="result-container" class="result-container" style="display: none;">
            <p id="result-message"></p>
            <div id="explanation">
                <h3>解説</h3>
                <p><strong>正解：</strong> <span id="correct-answer-text"></span></p>
                <p id="explanation-text"></p>
            </div>
            <button id="next-question-btn" class="next-btn">次の問題へ</button>
        </div>
        
        <div id="completion-container" class="completion-container" style="display: none;">
            <h2 id="completion-title">🎉 セッション完了！</h2>
            <p id="completion-message"></p>
            <div id="review-area"></div>
            <div class="completion-actions">
                <button id="repeat-session-btn" class="start-btn secondary-btn"></button>
                <button id="next-session-btn" class="start-btn">他の問題を解く</button>
                <button id="reset-btn" class="reset-btn">すべての進捗をリセット</button>
            </div>
        </div>

        <a href="index.php" class="back-link">トップに戻る</a>
    </div>

    <script>
        const quizSettings = {
            categories: <?php echo json_encode($categories); ?>,
            quizType: '<?php echo $quiz_type; ?>',
            limit: '<?php echo $limit; ?>'
        };
    </script>
    <script src="js/main.js"></script>
</body>
</html>
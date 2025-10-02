<?php
// 各カテゴリの総問題数を読み込む
function get_total_questions($category) {
    $file_path = __DIR__ . '/data/' . $category . '.json';
    if (!file_exists($file_path)) {
        return 0;
    }
    $json = file_get_contents($file_path);
    $data = json_decode($json, true);
    return isset($data[$category]) ? count($data[$category]) : 0;
}

$categories_meta = [
    'security' => ['label' => 'セキュリティ', 'total' => get_total_questions('security')],
    'network' => ['label' => 'ネットワーク', 'total' => get_total_questions('network')],
    'project_management' => ['label' => 'プロジェクトマネジメント', 'total' => get_total_questions('project_management')],
    'business_strategy' => ['label' => '経営戦略', 'total' => get_total_questions('business_strategy')],
];

// ▼▼▼ 修正点 ▼▼▼
// JavaScriptに渡すための総問題数配列を作成
$totalCountsForJS = [];
foreach ($categories_meta as $key => $meta) {
    $totalCountsForJS[$key] = $meta['total'];
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>4択問題集</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <h1>4択問題集</h1>
        <form action="quiz.php" method="get" class="settings-form">
            <h2>出題設定</h2>
            
            <div class="form-group">
                <label for="limit">問題数を選択してください:</label>
                <select name="limit" id="limit" class="select-box">
                    <option value="10">10問</option>
                    <option value="25">25問</option>
                    <option value="50" selected>50問</option>
                    <option value="all">すべて</option>
                </select>
            </div>

            <div class="form-group">
                <label>カテゴリを選択してください（複数選択可）:</label>
                <div class="checkbox-group" id="category-list">
                    <?php foreach ($categories_meta as $key => $meta): ?>
                        <label>
                            <input type="checkbox" name="categories[]" value="<?php echo $key; ?>"> 
                            <?php echo htmlspecialchars($meta['label']); ?>
                            <span class="progress-text" id="progress-<?php echo $key; ?>"></span>
                        </label>
                    <?php endforeach; ?>
                </div>
                 <label><input type="checkbox" id="select-all"> すべて選択</label>
            </div>
            
            <div class="form-group">
                <label>出題形式を選択してください:</label>
                <div class="radio-group">
                    <label><input type="radio" name="quiz_type" value="term_to_desc" checked> 用語 → 説明</label>
                    <label><input type="radio" name="quiz_type" value="desc_to_term"> 説明 → 用語</label>
                </div>
            </div>

            <button type="submit" class="start-btn">クイズ開始</button>
        </form>

        <div class="reset-section">
            <button type="button" id="reset-progress-btn" class="reset-btn">選択したカテゴリの進捗をリセット</button>
        </div>
    </div>

    <script>
        // ▼▼▼ 修正点 ▼▼▼
        // PHPから総問題数をJavaScriptに渡す
        const totalCounts = <?php echo json_encode($totalCountsForJS); ?>;
        const categories = <?php echo json_encode(array_keys($categories_meta)); ?>;

        // 進捗表示を更新する関数
        function updateProgressDisplay() {
            categories.forEach(category => {
                const key = `quiz_progress_${category}`;
                const solvedIds = JSON.parse(localStorage.getItem(key) || '[]');
                const solvedCount = solvedIds.length;
                const total = totalCounts[category]; // ここで正しい合計数を取得
                
                const progressEl = document.getElementById(`progress-${category}`);
                if (progressEl) {
                    progressEl.textContent = `(${solvedCount} / ${total} 問 正解済み)`;
                }
            });
        }

        // ページ読み込み時に進捗を表示
        document.addEventListener('DOMContentLoaded', () => {
            // 最初にチェックボックスを一つ選択状態にする
            const firstCheckbox = document.querySelector('input[name="categories[]"]');
            if(firstCheckbox) {
                firstCheckbox.checked = true;
            }
            
            updateProgressDisplay();

            // 「すべて選択」のチェックボックス機能
            document.getElementById('select-all').addEventListener('change', function(e) {
                const checkboxes = document.querySelectorAll('input[name="categories[]"]');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            });

            // リセットボタンの機能
            document.getElementById('reset-progress-btn').addEventListener('click', () => {
                const selectedCheckboxes = document.querySelectorAll('input[name="categories[]"]:checked');
                
                if (selectedCheckboxes.length === 0) {
                    alert('リセットするカテゴリを選択してください。');
                    return;
                }

                if (confirm('選択したカテゴリの進捗を本当にリセットしますか？この操作は元に戻せません。')) {
                    selectedCheckboxes.forEach(checkbox => {
                        const category = checkbox.value;
                        const key = `quiz_progress_${category}`;
                        localStorage.removeItem(key);
                    });
                    
                    updateProgressDisplay(); // 表示を更新
                    alert('進捗をリセットしました。');
                }
            });
        });
    </script>
</body>
</html>
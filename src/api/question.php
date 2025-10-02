<?php
header('Content-Type: application/json');

// --- 設定値 ---
$DATA_DIR = '../data/';
$CHOICE_COUNT = 4;

// --- リクエストからパラメータ取得 ---
$categories = isset($_GET['categories']) ? $_GET['categories'] : [];
$quizType = isset($_GET['quiz_type']) ? $_GET['quiz_type'] : 'term_to_desc';
$exclude_ids_str = isset($_GET['exclude_ids']) ? $_GET['exclude_ids'] : '';
$exclude_ids = !empty($exclude_ids_str) ? explode(',', $exclude_ids_str) : [];

if (empty($categories)) {
    echo json_encode(['error' => 'カテゴリが選択されていません。']);
    http_response_code(400);
    exit;
}

// --- データの読み込みとマージ ---
$all_terms = [];
foreach ($categories as $category) {
    $filename = realpath($DATA_DIR . $category . '.json');
    if ($filename && strpos($filename, realpath($DATA_DIR)) === 0 && file_exists($filename)) {
        $json_data = file_get_contents($filename);
        $data = json_decode($json_data, true);
        if (isset($data[$category])) {
            foreach ($data[$category] as $item) {
                // 各用語データにカテゴリ名を付与して、ユニークなIDを生成
                $item['unique_id'] = $category . '_' . $item['id'];
                $all_terms[] = $item;
            }
        }
    }
}

// --- 解答済みの問題を除外 ---
$available_terms = array_filter($all_terms, function($item) use ($exclude_ids) {
    return !in_array($item['unique_id'], $exclude_ids);
});

if (count($available_terms) < $CHOICE_COUNT) {
    if (empty($available_terms)) {
        // 全問正解した場合
        echo json_encode(['completed' => true]);
        exit;
    }
    echo json_encode(['error' => '問題を作成するのに十分なデータがありません。（残りの問題が4問未満です）']);
    http_response_code(500);
    exit;
}

$available_terms = array_values($available_terms); // array_randのためにキーをリセット

// --- 問題の生成 ---

// 1. 正解となる用語をランダムに選ぶ
$correct_index = array_rand($available_terms);
$correct_item = $available_terms[$correct_index];

// 2. 不正解の選択肢を生成 (残りの問題から選ぶ)
$wrong_items = [];
$pool_for_wrong_choices = $available_terms;
unset($pool_for_wrong_choices[$correct_index]); // 正解の選択肢を候補から削除

// 不正解の選択肢が3つ未満の場合も考慮
$wrong_choice_keys = (array) array_rand($pool_for_wrong_choices, min(count($pool_for_wrong_choices), $CHOICE_COUNT - 1));

foreach ($wrong_choice_keys as $key) {
    $wrong_items[] = $pool_for_wrong_choices[$key];
}


// 3. 出題形式に合わせて問題と選択肢を整形
// ... (変更なし) ...
$question = '';
$correct_answer = '';
$explanation = '';
$options = [];

if ($quizType === 'term_to_desc') {
    $question = $correct_item['term'];
    $correct_answer = $correct_item['description'];
    $explanation = "「{$correct_item['term']}」は、「{$correct_item['description']}」という意味です。";
    $options[] = $correct_answer;
    foreach ($wrong_items as $item) {
        $options[] = $item['description'];
    }
} else { // desc_to_term
    $question = $correct_item['description'];
    $correct_answer = $correct_item['term'];
    $explanation = "「{$correct_item['description']}」は、「{$correct_item['term']}」のことです。";
    $options[] = $correct_answer;
    foreach ($wrong_items as $item) {
        $options[] = $item['term'];
    }
}

// 4. 選択肢をシャッフル
shuffle($options);

// 5. JSONレスポンスを作成
$response = [
    'id' => $correct_item['unique_id'], // ユニークIDをレスポンスに含める
    'question' => $question,
    'options' => $options,
    'correctAnswer' => $correct_answer,
    'explanation' => $explanation,
];

echo json_encode($response);
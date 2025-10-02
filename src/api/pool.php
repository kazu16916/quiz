<?php
header('Content-Type: application/json');

$DATA_DIR = '../data/';

$categories = isset($_GET['categories']) ? $_GET['categories'] : [];
$exclude_ids_str = isset($_GET['exclude_ids']) ? $_GET['exclude_ids'] : '';
$exclude_ids = !empty($exclude_ids_str) ? explode(',', $exclude_ids_str) : [];

if (empty($categories)) {
    echo json_encode(['error' => 'カテゴリが選択されていません。']);
    http_response_code(400);
    exit;
}

// 全てのカテゴリからデータを読み込む
$all_terms = [];
foreach ($categories as $category) {
    $filename = realpath($DATA_DIR . $category . '.json');
    if ($filename && strpos($filename, realpath($DATA_DIR)) === 0 && file_exists($filename)) {
        $json_data = file_get_contents($filename);
        $data = json_decode($json_data, true);
        if (isset($data[$category])) {
            foreach ($data[$category] as $item) {
                $item['unique_id'] = $category . '_' . $item['id'];
                $all_terms[] = $item;
            }
        }
    }
}

// 解答済みの問題を除外
$available_terms = array_filter($all_terms, function($item) use ($exclude_ids) {
    return !in_array($item['unique_id'], $exclude_ids);
});

// 問題をシャッフル
shuffle($available_terms);

// JSONとして出力
echo json_encode(['questions' => array_values($available_terms)]);
<?php
//header('Access-Control-Allow-Origin: http://localhost:8000');
//header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
//header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Answer the browser's preflight request and stop
//if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//    http_response_code(204);
//    exit;
//}

$dbFile = "images.sqlite";

$entry = $_GET['file'] ?? '';

if (!is_string($entry) || $entry === '' || strlen($entry) > 255) {
    http_response_code(400);
    exit('Invalid file parameter');
}

$db = new SQLite3($dbFile, SQLITE3_OPEN_READONLY);
$stmt = $db->prepare('SELECT id, mime, size, mtime FROM files WHERE name = :name');
$stmt->bindValue(':name', $entry, SQLITE3_TEXT);
$row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

if ($row === false || !str_starts_with($row['mime'], 'image/')) {
    http_response_code(404);
    exit('Not found: ' . $entry);
}

header('Content-Type: ' . $row['mime']);
header('Content-Length: ' . $row['size']);
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $row['mtime']) . ' GMT');
header('Cache-Control: public, max-age=86400');
header('X-Content-Type-Options: nosniff');

$blob = $db->openBlob('files', 'data', $row['id']);
fpassthru($blob);
fclose($blob);
exit;
<?php
// call this script directly with 'php import.php' and never over the browser as it will produce a timeout due to 
// its long runtime
//
$dir = "./tmp";
$dbFile = "images.sqlite";

if (!$dir || !$dbFile || !is_dir($dir)) {
    fwrite(STDERR, "Usage: php import.php <directory> <db.sqlite>\n");
    exit(1);
}
$dir = rtrim(realpath($dir), '/');

$db = new SQLite3($dbFile);
$db->exec('CREATE TABLE IF NOT EXISTS files (
    id    INTEGER PRIMARY KEY,
    name  TEXT    NOT NULL UNIQUE,
    mime  TEXT    NOT NULL,
    size  INTEGER NOT NULL,
    mtime INTEGER NOT NULL,
    data  BLOB    NOT NULL
)');

$finfo = new finfo(FILEINFO_MIME_TYPE);
$ins = $db->prepare('INSERT OR REPLACE INTO files (name, mime, size, mtime, data)
                     VALUES (:name, :mime, :size, :mtime, zeroblob(:size))');

$db->exec('BEGIN');
$n = 0;
$it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)
);
foreach ($it as $file) {
    if (!$file->isFile())
        continue;

    $path = $file->getPathname();
    $ins->reset();
    $ins->bindValue(':name', substr($path, strlen($dir) + 1), SQLITE3_TEXT);
    $ins->bindValue(':mime', $finfo->file($path), SQLITE3_TEXT);
    $ins->bindValue(':size', $file->getSize(), SQLITE3_INTEGER);
    $ins->bindValue(':mtime', $file->getMTime(), SQLITE3_INTEGER);
    $ins->execute();

    // Stream the file into the reserved blob, so big files don't need memory
    $blob = $db->openBlob('files', 'data', $db->lastInsertRowID(), 'main', SQLITE3_OPEN_READWRITE);
    $src = fopen($path, 'rb');
    stream_copy_to_stream($src, $blob);
    fclose($src);
    fclose($blob);

    if (++$n % 500 === 0)
        echo "$n files...\n";
}
$db->exec('COMMIT');
echo "Imported $n files\n";
<?php
header('Content-Type: application/json');

$files = glob("*.{vcf,VCF,csv,CSV}", GLOB_BRACE);

if ($files) {
    $files = array_diff($files, [basename(__FILE__), 'index.php', 'index.html']);
    echo json_encode(array_values($files));
} else {
    echo json_encode([]);
}
?>